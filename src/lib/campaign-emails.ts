import { renderMarkdown } from "@/lib/markdown";
import { getSiteUrl } from "@/lib/site-url";
import { renderEmail } from "@/lib/email-layout";
import { asEmailLocale, emailCopy } from "@/lib/email-copy";

type CampaignContent = {
  subject: string;
  preheader: string | null;
  bodyMarkdown: string;
};

type SubscriberContext = {
  email: string;
  name: string | null;
  /** Idioma del suscriptor: el del pie y el enlace de baja. */
  locale?: string | null;
  /** Reused as the unsubscribe token. */
  confirmToken: string | null;
};

/**
 * Renders the campaign body for a given subscriber.
 * Substitutes a few simple placeholders before turning markdown into HTML
 * so editors can personalise the email without writing JSX:
 *
 *   {{name}}            → subscriber.name (or "amigo/a" if missing)
 *   {{email}}           → subscriber.email
 *   {{unsubscribe_url}} → /api/newsletter/unsubscribe?token=…
 *
 * El cuerpo va dentro de la plantilla común (cabecera tinta, pie con firma y
 * enlace de baja). El asunto hace de titular.
 */
export function renderCampaign(
  content: CampaignContent,
  subscriber: SubscriberContext,
): { subject: string; html: string; text: string } {
  const unsubscribeUrl = subscriber.confirmToken
    ? `${getSiteUrl()}/api/newsletter/unsubscribe?token=${subscriber.confirmToken}`
    : `${getSiteUrl()}/`;

  const name = subscriber.name?.trim() || "amigo/a";

  const interpolate = (input: string) =>
    input
      .replaceAll("{{name}}", name)
      .replaceAll("{{email}}", subscriber.email)
      .replaceAll("{{unsubscribe_url}}", unsubscribeUrl);

  const subject = interpolate(content.subject);
  const preheader = content.preheader ? interpolate(content.preheader) : undefined;
  const replaced = interpolate(content.bodyMarkdown);
  // Markdown escrito por el equipo en el admin: es la única entrada que la
  // plantilla incrusta sin escapar.
  const bodyHtml = renderMarkdown(replaced);

  const locale = asEmailLocale(subscriber.locale);
  const t = emailCopy(locale, "campaign");
  const common = emailCopy(locale, "common");

  const { html } = renderEmail({
    lang: locale,
    subject,
    preheader,
    headerTag: t("tag"),
    title: subject,
    bodyHtml,
    footer: {
      sign: common("sign"),
      place: common("place"),
      note: t("footer_note"),
      unsubscribe: { label: t("unsubscribe"), url: unsubscribeUrl },
    },
  });

  const text = `${replaced}\n\n—\n${common("sign")}\n\n${t("footer_note")}\n${t("unsubscribe")}: ${unsubscribeUrl}`;
  return { subject, html, text };
}
