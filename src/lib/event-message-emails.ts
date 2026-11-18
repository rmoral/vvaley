import { renderEmail, escapeHtml } from "@/lib/email-layout";
import { asEmailLocale, emailCopy } from "@/lib/email-copy";
import {
  eventTitleFor,
  eventUrl,
  formatEventWhen,
  registrationReference,
  type EventForEmail,
  type RegistrationForEmail,
} from "@/lib/event-registration-emails";

// ---------------------------------------------------------------------------
// Correos personalizados a los inscritos de un evento, escritos desde el admin
// a partir de una plantilla (EventEmailTemplate) con huecos {{así}}.
//
// Cada persona recibe su propio correo, con sus datos: nunca un envío con
// todos en copia. El texto lo escribe el equipo y se escapa entero; los
// valores de los huecos (nombre, empresa…) los escribió quien se inscribió y
// también se escapan. Módulo puro: sin red ni base de datos.
// ---------------------------------------------------------------------------

/** Huecos disponibles, con la descripción que ve el equipo en el admin. */
export const MESSAGE_PLACEHOLDERS = {
  nombre: "Nombre de pila de la persona inscrita",
  nombre_completo: "Nombre y apellidos, tal como se inscribió",
  empresa: "Empresa (vacío si no la indicó)",
  evento: "Título del evento en el idioma de la plantilla",
  fecha: "Fecha del evento, en letra",
  hora: "Hora o franja horaria",
  lugar: "Sala y dirección, u «online»",
  enlace_evento: "Página pública del evento",
  enlace_online: "Enlace de conexión (eventos online o híbridos)",
  referencia: "Referencia de la inscripción (VV-XXXXXXXX)",
  enlace_pago: "Enlace para pagar la inscripción (eventos con cobro online; no se envía a quien ya ha pagado)",
  motivo: "Texto libre que se escribe en cada envío",
} as const;

export type Placeholder = keyof typeof MESSAGE_PLACEHOLDERS;

const HOLE = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g;

const isPlaceholder = (name: string): name is Placeholder => name in MESSAGE_PLACEHOLDERS;

/** Huecos usados en un texto que no existen (p. ej. una errata como {{nombe}}). */
export function unknownPlaceholders(...texts: string[]): string[] {
  const unknown = new Set<string>();
  for (const text of texts) {
    for (const m of text.matchAll(HOLE)) if (!isPlaceholder(m[1])) unknown.add(m[1]);
  }
  return [...unknown];
}

export function usesPlaceholder(name: Placeholder, ...texts: string[]): boolean {
  return texts.some((t) => [...t.matchAll(HOLE)].some((m) => m[1] === name));
}

/** Sustituye los huecos por sus valores; los desconocidos se quedan como están. */
export function fillPlaceholders(text: string, values: Record<Placeholder, string>): string {
  return text.replace(HOLE, (match, name: string) => (isPlaceholder(name) ? values[name] : match));
}

/** Valores de los huecos para una persona. */
export function placeholderValues(
  event: EventForEmail,
  registration: Pick<RegistrationForEmail, "id" | "fullName" | "company">,
  locale: string,
  reason: string,
  /** Enlace de pago firmado de esta persona (payment-links), si hace falta. */
  paymentUrl = "",
): Record<Placeholder, string> {
  const lang = asEmailLocale(locale);
  const t = emailCopy(lang, "registration");
  const { hours } = formatEventWhen(event, lang);
  // Sin mayúscula inicial: el hueco va a mitad de frase («el jueves, 3 de…»).
  const date = new Intl.DateTimeFormat(lang, {
    dateStyle: "full",
    timeZone: event.timezone || "Europe/Andorra",
  }).format(event.startsAt);
  const fullName = registration.fullName.trim();
  const place =
    event.locationType === "ONLINE"
      ? t("online")
      : [event.venueName, event.venueAddress].filter(Boolean).join(", ");
  return {
    nombre: fullName.split(/\s+/)[0] || fullName,
    nombre_completo: fullName,
    empresa: registration.company?.trim() ?? "",
    evento: eventTitleFor(event, lang),
    fecha: date,
    hora: hours,
    lugar: event.locationType === "HYBRID" && place ? `${place} · ${t("online")}` : place,
    enlace_evento: eventUrl(event, lang),
    enlace_online: event.onlineUrl ?? "",
    referencia: registrationReference(registration.id),
    enlace_pago: paymentUrl,
    motivo: reason.trim(),
  };
}

/**
 * Cuerpo escrito a mano → HTML: una línea en blanco separa párrafos, un salto
 * simple es un <br>. Todo se escapa; los enlaces sueltos se hacen clicables.
 */
export function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const html = escapeHtml(p)
        .replace(/https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]/g, (url) => `<a href="${url}">${url}</a>`)
        .replace(/\n/g, "<br>");
      return `<p>${html}</p>`;
    })
    .join("\n");
}

export type EventMessageInput = {
  event: EventForEmail;
  registration: Pick<RegistrationForEmail, "id" | "fullName" | "company">;
  /** Idioma de la plantilla: formatea fechas y el pie del correo. */
  locale: string;
  subject: string;
  body: string;
  /** Texto libre del envío, para el hueco {{motivo}}. */
  reason: string;
  /** Enlace de pago de esta persona, para el hueco {{enlace_pago}}. */
  paymentUrl?: string;
};

/** Asunto, HTML y texto de un correo personalizado para una persona. */
export function buildEventMessage(input: EventMessageInput) {
  const lang = asEmailLocale(input.locale);
  const values = placeholderValues(
    input.event,
    input.registration,
    lang,
    input.reason,
    input.paymentUrl,
  );
  const t = emailCopy(lang, "registration");
  const common = emailCopy(lang, "common");

  // El asunto va en una línea: un motivo de varias líneas no puede romperlo.
  const subject = fillPlaceholders(input.subject, values).replace(/\s+/g, " ").trim();
  const body = fillPlaceholders(input.body, values).trim();
  const title = values.evento;

  const { html } = renderEmail({
    lang,
    subject,
    preheader: body.split("\n")[0]?.slice(0, 140),
    headerTag: t("tag"),
    eyebrow: `${formatEventWhen(input.event, lang).date} · ${values.hora}`,
    title,
    bodyHtml: plainTextToHtml(body),
    cta: { label: t("cta"), url: values.enlace_evento },
    footer: { sign: common("sign"), place: common("place"), note: t("footer_note") },
  });

  const text = [
    title,
    "",
    body,
    "",
    `${t("cta")}: ${values.enlace_evento}`,
    "",
    "—",
    common("sign"),
    common("place"),
    "",
    t("footer_note"),
  ].join("\n");

  return { subject, html, text };
}
