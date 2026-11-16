import type { Event, EventRegistration, EventTranslation } from "@prisma/client";
import type { AppLocale } from "@/i18n/routing";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { renderEmail, type EmailDetail } from "@/lib/email-layout";
import { emailCopy } from "@/lib/email-copy";

// Correos de inscripción a eventos, con la plantilla común (email-layout):
//   · a la persona: confirmación (gratuita o pagada) o lista de espera, en
//     su idioma, con fecha, hora, lugar, importe y referencia;
//   · al equipo: aviso de cada inscripción pagada (solo castellano, como el
//     admin).
// Las funciones build* son puras (sin red ni base de datos) para poder
// probarlas y previsualizarlas; las send* las envían.

export type EventForEmail = Pick<
  Event,
  | "id"
  | "slug"
  | "startsAt"
  | "endsAt"
  | "timezone"
  | "locationType"
  | "venueName"
  | "venueAddress"
  | "onlineUrl"
  | "capacity"
> & { translations: Pick<EventTranslation, "locale" | "title">[] };

export type RegistrationForEmail = Pick<
  EventRegistration,
  "id" | "fullName" | "email" | "company" | "notes" | "locale" | "status"
>;

export function formatMoney(cents: number, currency: string, locale: AppLocale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

/** Título del evento en el idioma pedido, con caída a castellano. */
export function eventTitleFor(event: EventForEmail, locale: string): string {
  return (
    event.translations.find((t) => t.locale === locale)?.title ??
    event.translations.find((t) => t.locale === "es")?.title ??
    event.translations[0]?.title ??
    event.slug
  );
}

/** Código corto que la persona puede citar: VV-XXXXXXXX. */
export function registrationReference(id: string): string {
  return `VV-${id.slice(-8).toUpperCase()}`;
}

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** Fecha larga y franja horaria en la zona horaria del evento. */
export function formatEventWhen(event: EventForEmail, locale: AppLocale) {
  const timeZone = event.timezone || "Europe/Andorra";
  const date = capitalize(
    new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone }).format(event.startsAt),
  );
  const time = new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone });
  const start = time.format(event.startsAt);
  const sameDay =
    event.endsAt &&
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(event.startsAt) ===
      new Intl.DateTimeFormat("en-CA", { timeZone }).format(event.endsAt);
  const hours = event.endsAt && sameDay ? `${start} – ${time.format(event.endsAt)}` : start;
  return { date, hours };
}

export function eventUrl(event: Pick<Event, "slug">, locale: AppLocale): string {
  return `${getSiteUrl()}/${locale}/eventos/${event.slug}`;
}

export type RegistrationEmailInput = {
  locale: AppLocale;
  event: EventForEmail;
  registration: Pick<RegistrationForEmail, "id" | "fullName">;
  /** Confirmada o en lista de espera. */
  kind: "confirmed" | "waitlist";
  /** Importe cobrado, si la inscripción se ha pagado. */
  paid?: { cents: number; currency: string };
};

/** Correo a la persona inscrita (puro: devuelve asunto, HTML y texto). */
export function buildRegistrationEmail(input: RegistrationEmailInput) {
  const { locale, event, registration, kind, paid } = input;
  const t = emailCopy(locale, "registration");
  const common = emailCopy(locale, "common");
  const title = eventTitleFor(event, locale);
  const { date, hours } = formatEventWhen(event, locale);
  const firstName = registration.fullName.trim().split(/\s+/)[0] || registration.fullName;

  const place =
    event.locationType === "ONLINE"
      ? t("online")
      : [event.venueName, event.venueAddress].filter(Boolean).join(", ") || null;
  const placeValue =
    event.locationType === "HYBRID" && place ? `${place} · ${t("online")}` : place;

  const details: EmailDetail[] = [
    { label: t("date"), value: date },
    { label: t("time"), value: hours },
  ];
  if (placeValue) details.push({ label: t("place"), value: placeValue });
  if (
    kind === "confirmed" &&
    event.onlineUrl &&
    (event.locationType === "ONLINE" || event.locationType === "HYBRID")
  ) {
    details.push({ label: t("online_link"), value: event.onlineUrl, href: event.onlineUrl });
  }
  details.push({ label: t("attendee"), value: registration.fullName });

  const subject = t(kind === "waitlist" ? "subject_waitlist" : "subject_confirmed", { title });
  const body =
    kind === "waitlist" ? t("body_waitlist") : paid ? t("body_paid") : t("body_confirmed");

  const { html, text } = renderEmail({
    lang: locale,
    subject,
    preheader: t(kind === "waitlist" ? "preheader_waitlist" : "preheader_confirmed", { title }),
    headerTag: t("tag"),
    eyebrow: t(kind === "waitlist" ? "eyebrow_waitlist" : "eyebrow_confirmed"),
    title,
    paragraphs: [t("greeting", { name: firstName }), body],
    details,
    total: paid ? { label: t("paid"), value: formatMoney(paid.cents, paid.currency, locale) } : undefined,
    reference: t("reference", { ref: registrationReference(registration.id) }),
    cta: { label: t("cta"), url: eventUrl(event, locale) },
    afterCta: kind === "confirmed" ? [t("cancel")] : [],
    footer: { sign: common("sign"), place: common("place"), note: t("footer_note") },
  });
  return { subject, html, text };
}

export async function sendRegistrationEmail(input: RegistrationEmailInput & { to: string }) {
  const { subject, html, text } = buildRegistrationEmail(input);
  return sendEmail({ to: input.to, subject, html, text });
}

/** Destino de los avisos internos de eventos. */
export function eventNotifyAddress(): string | null {
  return process.env.EVENT_NOTIFY_EMAIL?.trim() || process.env.CONTACT_NOTIFY_EMAIL?.trim() || null;
}

const LOCALE_NAME: Record<string, string> = {
  es: "Castellano",
  ca: "Catalán",
  en: "Inglés",
  fr: "Francés",
};

export type TeamNoticeInput = {
  event: EventForEmail;
  registration: RegistrationForEmail;
  paid: { cents: number; currency: string };
  /** Plazas confirmadas tras este pago, si se conocen. */
  confirmedCount?: number;
};

/** Aviso al equipo de una inscripción pagada (puro, en castellano). */
export function buildPaidTeamNotice(input: TeamNoticeInput) {
  const { event, registration: reg, paid, confirmedCount } = input;
  const title = eventTitleFor(event, "es");
  const amount = formatMoney(paid.cents, paid.currency, "es");
  const subject = `[Evento] Pago recibido: ${reg.fullName} — ${title} (${amount})`;

  const details: EmailDetail[] = [
    { label: "Nombre", value: reg.fullName },
    { label: "Email", value: reg.email, href: `mailto:${reg.email}` },
  ];
  if (reg.company) details.push({ label: "Empresa", value: reg.company });
  details.push({ label: "Idioma", value: LOCALE_NAME[reg.locale] ?? reg.locale });
  if (confirmedCount != null) {
    details.push({
      label: "Plazas",
      value:
        event.capacity != null
          ? `${confirmedCount} confirmadas de ${event.capacity}`
          : `${confirmedCount} confirmadas`,
    });
  }
  if (reg.notes) details.push({ label: "Notas", value: reg.notes });

  const { html, text } = renderEmail({
    lang: "es",
    subject,
    preheader: `${reg.fullName} ha pagado ${amount}.`,
    headerTag: "Aviso interno",
    eyebrow: "Nueva inscripción pagada",
    title,
    details,
    total: { label: "Importe", value: amount },
    reference: `Referencia: ${registrationReference(reg.id)}`,
    notice:
      reg.status !== "CONFIRMED"
        ? `La inscripción estaba en estado ${reg.status} cuando llegó el pago: revisa si hay que reactivarla o reembolsar.`
        : undefined,
    cta: {
      label: "Ver inscritos",
      url: `${getSiteUrl()}/admin/eventos/${event.id}/inscripciones`,
    },
    footer: {
      sign: "Valira Valley",
      note: "Aviso automático de la web · cobro confirmado por Kunfupay.",
    },
  });
  return { subject, html, text };
}

/**
 * Envía el aviso al equipo a EVENT_NOTIFY_EMAIL (o CONTACT_NOTIFY_EMAIL).
 * Sin ninguna de las dos no se envía nada, pero el pago queda en el admin.
 */
export async function sendPaidRegistrationTeamNotice(input: TeamNoticeInput & { to?: string }) {
  const to = input.to ?? eventNotifyAddress();
  if (!to) {
    console.error("[kunfupay] aviso al equipo no enviado: falta EVENT_NOTIFY_EMAIL");
    return { ok: false as const, error: "not_configured" };
  }
  const { subject, html, text } = buildPaidTeamNotice(input);
  const result = await sendEmail({ to, subject, html, text });
  if (!result.ok) console.error(`[kunfupay] aviso al equipo no enviado (${result.error})`);
  return result;
}
