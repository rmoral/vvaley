import type { AppLocale } from "@/i18n/routing";
import { sendEmail } from "@/lib/email";

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
