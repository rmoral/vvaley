import { NextResponse } from "next/server";
import type { Event, EventTranslation } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendRegistrationConfirmedEmail } from "@/lib/event-registration-emails";
import { eventTitle } from "@/lib/event-payments";
import { registrationGate, requiresOnlinePayment } from "@/lib/event-registration";
import { createCheckoutSession, getKunfupayConfig, KunfupayError } from "@/lib/kunfupay";
import { getSiteUrl } from "@/lib/site-url";
import { routing, type AppLocale } from "@/i18n/routing";

const schema = z.object({
  email: z.string().email().max(180),
  fullName: z.string().min(2).max(140),
  company: z.string().max(140).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().max(2000).optional().or(z.literal("").transform(() => undefined)),
  locale: z.string().optional(),
});

function asLocale(value: string | undefined): AppLocale {
  return (routing.locales as readonly string[]).includes(value ?? "")
    ? (value as AppLocale)
    : routing.defaultLocale;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
      translations: true,
    },
  });
  if (!event) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const gate = registrationGate(event);
  if (!gate.open) {
    return NextResponse.json(
      { ok: false, error: gate.reason },
      { status: 409 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const fullName = parsed.data.fullName.trim();
  const locale = asLocale(parsed.data.locale);
  const company = parsed.data.company?.trim() || null;
  const notes = parsed.data.notes?.trim() || null;

  // Capacity-based status: confirmed if there's room (or no cap), waitlist
  // otherwise.
  const overCapacity =
    event.capacity != null && event._count.registrations >= event.capacity;

  if (requiresOnlinePayment(event)) {
    return startPaidRegistration(event, { email, fullName, company, notes, locale }, overCapacity);
  }

  const status = overCapacity ? "WAITLIST" : "CONFIRMED";

  const registration = await prisma.eventRegistration.upsert({
    where: { eventId_email: { eventId: event.id, email } },
    update: {
      fullName,
      company,
      notes,
      locale,
      // If a previously cancelled person re-registers, bring them back as
      // CONFIRMED/WAITLIST based on current capacity.
      status,
    },
    create: {
      eventId: event.id,
      email,
      fullName,
      company,
      notes,
      locale,
      status,
    },
  });

  await sendRegistrationConfirmedEmail({
    to: email,
    locale,
    eventTitle: eventTitle(event, locale),
  });

  return NextResponse.json({
    ok: true,
    status: registration.status,
  });
}

type Attendee = {
  email: string;
  fullName: string;
  company: string | null;
  notes: string | null;
  locale: AppLocale;
};

type EventWithTranslations = Event & { translations: EventTranslation[] };

/**
 * Inscripción a un evento de pago: guarda la inscripción pendiente, crea el
 * checkout en Kunfupay y devuelve su URL para redirigir. La plaza no se
 * confirma ni se envía correo hasta que Kunfupay confirma el pago.
 */
async function startPaidRegistration(
  event: EventWithTranslations,
  who: Attendee,
  overCapacity: boolean,
) {
  const config = getKunfupayConfig();
  if (!config || event.priceCents == null) {
    console.error("[kunfupay] evento de pago sin KUNFUPAY_API_KEY configurada", event.slug);
    return NextResponse.json({ ok: false, error: "payment_unavailable" }, { status: 503 });
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_email: { eventId: event.id, email: who.email } },
  });
  // Quien ya pagó no vuelve a pagar. Si además el equipo la canceló, se
  // resuelve a mano (reembolso o reactivación), no con un segundo cobro.
  if (existing?.paymentStatus === "PAID") {
    return existing.status === "CONFIRMED"
      ? NextResponse.json({ ok: true, status: "CONFIRMED" })
      : NextResponse.json({ ok: false, error: "already_paid" }, { status: 409 });
  }

  // Aforo completo: lista de espera sin cobrar. Si se libera una plaza, el
  // equipo la confirma a mano y gestiona el cobro.
  if (overCapacity) {
    const fields = {
      fullName: who.fullName,
      company: who.company,
      notes: who.notes,
      locale: who.locale,
      status: "WAITLIST" as const,
    };
    await prisma.eventRegistration.upsert({
      where: { eventId_email: { eventId: event.id, email: who.email } },
      update: fields,
      create: { eventId: event.id, email: who.email, ...fields },
    });
    return NextResponse.json({ ok: true, status: "WAITLIST" });
  }

  const registration = await prisma.eventRegistration.upsert({
    where: { eventId_email: { eventId: event.id, email: who.email } },
    update: {
      fullName: who.fullName,
      company: who.company,
      notes: who.notes,
      locale: who.locale,
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      amountCents: event.priceCents,
      currency: "EUR",
      paymentAttempts: { increment: 1 },
    },
    create: {
      eventId: event.id,
      email: who.email,
      fullName: who.fullName,
      company: who.company,
      notes: who.notes,
      locale: who.locale,
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      amountCents: event.priceCents,
      currency: "EUR",
      paymentAttempts: 1,
    },
  });

  const returnUrl = `${getSiteUrl()}/${who.locale}/eventos/${event.slug}/pago?r=${registration.id}`;
  const title = eventTitle(event, who.locale);

  try {
    const session = await createCheckoutSession(config, {
      amountCents: event.priceCents,
      currency: "EUR",
      description: title.slice(0, 200),
      externalReference: registration.id,
      metadata: {
        registrationId: registration.id,
        eventId: event.id,
        eventSlug: event.slug,
      },
      successUrl: returnUrl,
      cancelUrl: `${returnUrl}&cancelled=1`,
      // Un intento = una sesión. Reintentar la misma petición recupera la
      // misma sesión en vez de crear otra.
      idempotencyKey: `vv-reg-${registration.id}-${registration.paymentAttempts}`,
    });

    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { kunfupaySessionId: session.id },
    });

    return NextResponse.json({
      ok: true,
      status: "PENDING_PAYMENT",
      checkoutUrl: session.checkoutUrl,
    });
  } catch (err) {
    console.error(
      "[kunfupay] no se pudo crear el checkout",
      registration.id,
      err instanceof KunfupayError ? { status: err.status, body: err.body } : err,
    );
    return NextResponse.json({ ok: false, error: "payment_unavailable" }, { status: 502 });
  }
}
