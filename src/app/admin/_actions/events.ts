"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EventLocationType, EventStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth-helpers";
import { assetUrl } from "@/lib/asset-url";
import { prisma } from "@/lib/prisma";
import { MIN_ONLINE_PRICE_CENTS } from "@/lib/event-registration";
import { eventTitle, sendPaidConfirmation } from "@/lib/event-payments";
import {
  sendPaidRegistrationTeamNotice,
  sendRegistrationConfirmedEmail,
} from "@/lib/event-registration-emails";
import { slugify } from "@/lib/slug";
import { SERIES_VALUES, parseGuestChoice } from "@/lib/event-series";
import { routing } from "@/i18n/routing";

const trim = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length === 0 ? null : s;
};

const intOrNull = (v: FormDataEntryValue | null) => {
  const s = trim(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
};

const dateOrNull = (v: FormDataEntryValue | null) => {
  const s = trim(v);
  if (s === null) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Precio escrito a mano ("20", "20 €", "12,50") a céntimos.
 *
 * Acepta coma y punto porque quien rellena esto escribe en español y teclea
 * 12,50; guardar 1250 en vez de 12 no debería depender de acordarse de la
 * convención inglesa.
 */
const centsOrNull = (v: FormDataEntryValue | null) => {
  const s = trim(v);
  if (s === null) return null;
  const limpio = s.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
};

const translationSchema = z.object({
  locale: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
});

const eventSchema = z.object({
  slug: z.string().nullable(),
  status: z.nativeEnum(EventStatus),
  locationType: z.nativeEnum(EventLocationType),
  // Se valida contra la lista cerrada: una serie inventada dejaría la edición
  // fuera de su landing sin dar ningún aviso.
  series: z
    .enum(SERIES_VALUES as [string, ...string[]])
    .nullable(),
  guestId: z.string().nullable(),
  noGuest: z.boolean(),
  priceCents: z.number().int().nonnegative().nullable(),
  onlinePayment: z.boolean(),
  ticketUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  startsAt: z.date(),
  endsAt: z.date().nullable(),
  timezone: z.string(),
  venueName: z.string().nullable(),
  venueAddress: z.string().nullable(),
  onlineUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  capacity: z.number().int().nullable(),
  registrationOpensAt: z.date().nullable(),
  registrationClosesAt: z.date().nullable(),
  coverImageUrl: assetUrl,
  translations: z.array(translationSchema),
});


function parseForm(formData: FormData) {
  const translations = routing.locales.map((locale) => ({
    locale,
    title: trim(formData.get(`title_${locale}`)) ?? "",
    summary: trim(formData.get(`summary_${locale}`)),
    description: trim(formData.get(`description_${locale}`)),
  }));

  const startsAt = dateOrNull(formData.get("startsAt"));
  if (!startsAt) {
    throw new Error("startsAt is required");
  }

  return eventSchema.parse({
    slug: trim(formData.get("slug")),
    status:
      (trim(formData.get("status")) as EventStatus | null) ?? EventStatus.DRAFT,
    locationType:
      (trim(formData.get("locationType")) as EventLocationType | null) ??
      EventLocationType.INPERSON,
    series: trim(formData.get("series")),
    ...parseGuestChoice(trim(formData.get("guestId"))),
    priceCents: centsOrNull(formData.get("price")),
    onlinePayment: formData.get("onlinePayment") === "on",
    ticketUrl: trim(formData.get("ticketUrl")),
    startsAt,
    endsAt: dateOrNull(formData.get("endsAt")),
    timezone: trim(formData.get("timezone")) ?? "Europe/Andorra",
    venueName: trim(formData.get("venueName")),
    venueAddress: trim(formData.get("venueAddress")),
    onlineUrl: trim(formData.get("onlineUrl")),
    capacity: intOrNull(formData.get("capacity")),
    registrationOpensAt: dateOrNull(formData.get("registrationOpensAt")),
    registrationClosesAt: dateOrNull(formData.get("registrationClosesAt")),
    coverImageUrl: trim(formData.get("coverImageUrl")),
    translations,
  });
}

async function uniqueSlug(base: string, ignoreId?: string) {
  let slug = base || `evento-${Date.now()}`;
  let n = 1;
  while (
    await prisma.event.findFirst({
      where: { slug, NOT: ignoreId ? { id: ignoreId } : undefined },
      select: { id: true },
    })
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

function defaultTitle(translations: { title: string; locale: string }[]) {
  return (
    translations.find((t) => t.locale === routing.defaultLocale && t.title)
      ?.title ??
    translations.find((t) => t.title)?.title ??
    ""
  );
}

function persistedTranslations(
  translations: {
    locale: string;
    title: string;
    summary: string | null;
    description: string | null;
  }[],
) {
  return translations
    .filter((t) => t.title.trim().length > 0)
    .map((t) => ({
      locale: t.locale,
      title: t.title,
      summary: t.summary,
      description: t.description,
    }));
}

/** Kunfupay no acepta cobros por debajo de 0,99. */
function onlinePaymentWithoutPrice(data: { onlinePayment: boolean; priceCents: number | null }) {
  return data.onlinePayment && (data.priceCents == null || data.priceCents < MIN_ONLINE_PRICE_CENTS);
}

export async function createEvent(formData: FormData) {
  const session = await requireSession();
  const data = parseForm(formData);

  const persisted = persistedTranslations(data.translations);
  if (persisted.length === 0) {
    redirect("/admin/eventos/nuevo?error=missing_title");
  }
  if (onlinePaymentWithoutPrice(data)) {
    redirect("/admin/eventos/nuevo?error=online_payment_price");
  }

  const titleForSlug = data.slug ?? defaultTitle(data.translations);
  const slug = await uniqueSlug(slugify(titleForSlug));

  const event = await prisma.event.create({
    data: {
      slug,
      status: data.status,
      locationType: data.locationType,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      timezone: data.timezone,
      venueName: data.venueName,
      venueAddress: data.venueAddress,
      onlineUrl: data.onlineUrl,
      capacity: data.capacity,
      registrationOpensAt: data.registrationOpensAt,
      registrationClosesAt: data.registrationClosesAt,
      coverImageUrl: data.coverImageUrl,
      series: data.series,
      guestId: data.guestId,
      noGuest: data.noGuest,
      priceCents: data.priceCents,
      onlinePayment: data.onlinePayment,
      ticketUrl: data.ticketUrl,
      authorId: session.user.id,
      translations: { create: persisted },
    },
  });

  revalidatePath("/admin/eventos");
  revalidatePath("/eventos", "page");
  redirect(`/admin/eventos/${event.id}?saved=1`);
}

export async function updateEvent(id: string, formData: FormData) {
  await requireSession();
  const data = parseForm(formData);

  const persisted = persistedTranslations(data.translations);
  if (persisted.length === 0) {
    redirect(`/admin/eventos/${id}?error=missing_title`);
  }
  if (onlinePaymentWithoutPrice(data)) {
    redirect(`/admin/eventos/${id}?error=online_payment_price`);
  }

  const titleForSlug = data.slug ?? defaultTitle(data.translations);
  const slug = await uniqueSlug(slugify(titleForSlug), id);

  await prisma.$transaction([
    prisma.eventTranslation.deleteMany({ where: { eventId: id } }),
    prisma.event.update({
      where: { id },
      data: {
        slug,
        status: data.status,
        locationType: data.locationType,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        timezone: data.timezone,
        venueName: data.venueName,
        venueAddress: data.venueAddress,
        onlineUrl: data.onlineUrl,
        capacity: data.capacity,
        registrationOpensAt: data.registrationOpensAt,
        registrationClosesAt: data.registrationClosesAt,
        coverImageUrl: data.coverImageUrl,
        series: data.series,
        guestId: data.guestId,
        noGuest: data.noGuest,
        priceCents: data.priceCents,
        onlinePayment: data.onlinePayment,
        ticketUrl: data.ticketUrl,
        translations: { create: persisted },
      },
    }),
  ]);

  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${id}`);
  revalidatePath("/eventos", "page");
  redirect(`/admin/eventos/${id}?saved=1`);
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  await prisma.event.delete({ where: { id } });
  revalidatePath("/admin/eventos");
  redirect("/admin/eventos");
}

// Registrations mutations from the admin panel.

export async function cancelRegistration(eventId: string, regId: string) {
  await requireSession();
  await prisma.eventRegistration.update({
    where: { id: regId },
    data: { status: "CANCELLED" },
  });
  revalidatePath(`/admin/eventos/${eventId}/inscripciones`);
}

export async function confirmRegistration(eventId: string, regId: string) {
  await requireSession();
  await prisma.eventRegistration.update({
    where: { id: regId },
    data: { status: "CONFIRMED" },
  });
  revalidatePath(`/admin/eventos/${eventId}/inscripciones`);
}

export async function deleteRegistration(eventId: string, regId: string) {
  await requireAdmin();
  await prisma.eventRegistration.delete({ where: { id: regId } });
  revalidatePath(`/admin/eventos/${eventId}/inscripciones`);
}

/**
 * Reenvía el correo de confirmación de una inscripción pagada (por ejemplo,
 * si el SMTP falló al confirmar el pago). Sale del sitio: solo ADMIN.
 */
export async function resendRegistrationEmail(eventId: string, regId: string) {
  await requireAdmin();
  const reg = await prisma.eventRegistration.findUnique({
    where: { id: regId },
    include: { event: { include: { translations: true } } },
  });
  if (reg && reg.eventId === eventId && reg.status === "CONFIRMED") {
    await sendPaidConfirmation(reg);
  }
  revalidatePath(`/admin/eventos/${eventId}/inscripciones`);
}

/**
 * Envía al admin que lo pide, y solo a él, los dos correos de una inscripción
 * pagada con los datos reales del evento: la confirmación que recibe quien
 * paga (en el idioma elegido) y el aviso al equipo con una persona de
 * ejemplo. No crea inscripciones ni pasa por Kunfupay. Sale del sitio: ADMIN.
 */
export async function sendTestPaymentEmails(eventId: string, formData: FormData) {
  const session = await requireAdmin();
  const to = session.user.email;
  const requested = String(formData.get("locale") ?? "");
  const locale = (routing.locales as readonly string[]).includes(requested)
    ? (requested as (typeof routing.locales)[number])
    : routing.defaultLocale;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { translations: true },
  });
  if (!event || !to) redirect(`/admin/eventos/${eventId}?test_email=error`);

  // Sin precio todavía, se usa uno de ejemplo para ver la línea del pago.
  const cents = event.priceCents && event.priceCents > 0 ? event.priceCents : 3000;

  const buyer = await sendRegistrationConfirmedEmail({
    to,
    locale,
    eventTitle: eventTitle(event, locale),
    paid: { cents, currency: "EUR" },
  });
  const team = await sendPaidRegistrationTeamNotice({
    to,
    eventId: event.id,
    eventTitle: eventTitle(event, "es"),
    fullName: "Persona de prueba",
    email: "persona.de.prueba@example.com",
    company: "Empresa de ejemplo",
    notes: "Correo de prueba enviado desde el admin; no hay inscripción ni pago real.",
    status: "CONFIRMED",
    cents,
    currency: "EUR",
  });

  const ok = buyer.ok && !buyer.dryRun && team.ok;
  redirect(`/admin/eventos/${eventId}?test_email=${ok ? "ok" : "error"}`);
}
