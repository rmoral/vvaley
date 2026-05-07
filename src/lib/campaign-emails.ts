import { renderMarkdown } from "@/lib/markdown";
import { getSiteUrl } from "@/lib/site-url";

type CampaignContent = {
  subject: string;
  preheader: string | null;
  bodyMarkdown: string;
};

type SubscriberContext = {
  email: string;
  name: string | null;
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
  const preheader = content.preheader ? interpolate(content.preheader) : null;
  const replaced = interpolate(content.bodyMarkdown);
  const bodyHtml = renderMarkdown(replaced);

  // Wrap the rendered markdown in a minimal email-friendly shell.
  const html = `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;background:#F4F8F8;color:#142E30;margin:0;padding:32px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #C8D8DA;border-radius:8px;padding:32px;">
    <div style="font-family:Georgia,serif;font-weight:900;font-size:18px;letter-spacing:.05em;margin-bottom:24px;">
      VALIRA<span style="color:#2E8B8F"> · </span>VALLEY
    </div>
    ${
      preheader
        ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;color:#fff;">${preheader}</div>`
        : ""
    }
    <div style="line-height:1.65;color:#3A5557;">${bodyHtml}</div>
    <hr style="border:none;border-top:1px solid #EBF2F2;margin:32px 0;">
    <p style="font-size:12px;color:#6A8688;line-height:1.6;">
      Recibes este correo porque te suscribiste a la newsletter de Valira Valley.
      <br><a href="${unsubscribeUrl}" style="color:#2E8B8F">Darme de baja</a>
    </p>
  </div>
</body></html>`;

  return { subject, html, text: replaced };
}
