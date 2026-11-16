import type { AppLocale } from "@/i18n/routing";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";

// Correo de inscripción confirmada, en los cuatro idiomas. Lo usan el alta
// gratuita (/api/events/[slug]/register) y la confirmación tras el pago
// (webhook de Kunfupay o vuelta del checkout).

const copy: Record<
  AppLocale,
  {
    subject: (title: string) => string;
    body: (title: string) => string;
    paid: (amount: string) => string;
  }
> = {
  es: {
    subject: (t) => `Inscripción confirmada: ${t}`,
    body: (t) =>
      `Te has inscrito a "${t}". Te enviaremos los detalles antes del evento. Si quieres cancelar, responde a este correo.`,
    paid: (a) => `Hemos recibido tu pago de ${a}.`,
  },
  ca: {
    subject: (t) => `Inscripció confirmada: ${t}`,
    body: (t) =>
      `T'has inscrit a "${t}". T'enviarem els detalls abans de l'esdeveniment. Si vols cancel·lar, respon aquest correu.`,
    paid: (a) => `Hem rebut el teu pagament de ${a}.`,
  },
  en: {
    subject: (t) => `Registration confirmed: ${t}`,
    body: (t) =>
      `You're registered for "${t}". We'll send the details before the event. Reply to this email to cancel.`,
    paid: (a) => `We've received your payment of ${a}.`,
  },
  fr: {
    subject: (t) => `Inscription confirmée : ${t}`,
    body: (t) =>
      `Vous êtes inscrit(e) à « ${t} ». Nous vous enverrons les détails avant l'événement. Répondez à cet e-mail pour annuler.`,
    paid: (a) => `Nous avons bien reçu votre paiement de ${a}.`,
  },
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function formatMoney(cents: number, currency: string, locale: AppLocale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

export async function sendRegistrationConfirmedEmail(input: {
  to: string;
  locale: AppLocale;
  eventTitle: string;
  paid?: { cents: number; currency: string };
}) {
  const c = copy[input.locale];
  const lines = [c.body(input.eventTitle)];
  if (input.paid) {
    lines.push(c.paid(formatMoney(input.paid.cents, input.paid.currency, input.locale)));
  }
  return sendEmail({
    to: input.to,
    subject: c.subject(input.eventTitle),
    text: lines.join("\n\n"),
    html: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(""),
  });
}

/** Destino de los avisos internos de eventos. */
export function eventNotifyAddress(): string | null {
  return process.env.EVENT_NOTIFY_EMAIL?.trim() || process.env.CONTACT_NOTIFY_EMAIL?.trim() || null;
}

/**
 * Aviso al equipo de que alguien ha pagado su inscripción. Va a
 * EVENT_NOTIFY_EMAIL (o, si no está, a CONTACT_NOTIFY_EMAIL). Sin ninguna de
 * las dos no se envía nada, pero el pago queda en el admin igualmente.
 */
export async function sendPaidRegistrationTeamNotice(input: {
  eventId: string;
  eventTitle: string;
  fullName: string;
  email: string;
  company: string | null;
  notes: string | null;
  status: string;
  cents: number;
  currency: string;
}) {
  const to = eventNotifyAddress();
  if (!to) {
    console.error("[kunfupay] aviso al equipo no enviado: falta EVENT_NOTIFY_EMAIL");
    return { ok: false as const, error: "not_configured" };
  }
  const amount = formatMoney(input.cents, input.currency, "es");
  const lines = [
    `Nueva inscripción pagada en «${input.eventTitle}».`,
    "",
    `Nombre: ${input.fullName}`,
    `Email: ${input.email}`,
    input.company ? `Empresa: ${input.company}` : null,
    `Importe: ${amount}`,
    input.status !== "CONFIRMED"
      ? `Atención: la inscripción está en estado ${input.status}; revisa si hay que reactivarla o reembolsar.`
      : null,
    input.notes ? `Notas: ${input.notes}` : null,
    "",
    `Inscritos: ${getSiteUrl()}/admin/eventos/${input.eventId}/inscripciones`,
  ].filter((l): l is string => l !== null);

  const result = await sendEmail({
    to,
    subject: `[Evento] Pago recibido: ${input.fullName} — ${input.eventTitle} (${amount})`,
    text: lines.join("\n"),
    html: lines.map((l) => (l ? `<p>${escapeHtml(l)}</p>` : "<br/>")).join(""),
  });
  if (!result.ok) console.error(`[kunfupay] aviso al equipo no enviado (${result.error})`);
  return result;
}
