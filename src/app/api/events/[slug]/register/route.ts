import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrationGate } from "@/lib/event-registration";
import { sendEmail } from "@/lib/email";
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

const registeredCopy: Record<
  AppLocale,
  { subject: (title: string) => string; body: (title: string) => string }
> = {
  es: {
    subject: (t) => `Inscripción confirmada: ${t}`,
    body: (t) =>
      `Te has inscrito a "${t}". Te enviaremos los detalles antes del evento. Si quieres cancelar, responde a este correo.`,
  },
  ca: {
    subject: (t) => `Inscripció confirmada: ${t}`,
    body: (t) =>
      `T'has inscrit a "${t}". T'enviarem els detalls abans de l'esdeveniment. Si vols cancel·lar, respon aquest correu.`,
  },
  en: {
    subject: (t) => `Registration confirmed: ${t}`,
    body: (t) =>
      `You're registered for "${t}". We'll send the details before the event. Reply to this email to cancel.`,
  },
  fr: {
    subject: (t) => `Inscription confirmée : ${t}`,
    body: (t) =>
      `Vous êtes inscrit(e) à « ${t} ». Nous vous enverrons les détails avant l'événement. Répondez à cet e-mail pour annuler.`,
  },
};

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

  // Best-effort confirmation email — don't block the response on this.
  const titleForEmail =
    event.translations.find((t) => t.locale === locale)?.title ??
    event.translations.find((t) => t.locale === "es")?.title ??
    event.translations[0]?.title ??
    event.slug;
  const copy = registeredCopy[locale];
  await sendEmail({
    to: email,
    subject: copy.subject(titleForEmail),
    text: copy.body(titleForEmail),
    html: `<p>${copy.body(titleForEmail)}</p>`,
  });

  return NextResponse.json({
    ok: true,
    status: registration.status,
  });
}
