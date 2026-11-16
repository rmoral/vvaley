import type { AppLocale } from "@/i18n/routing";
import { renderEmail } from "@/lib/email-layout";
import { emailCopy } from "@/lib/email-copy";

type ConfirmEmailParts = { subject: string; html: string; text: string };

/**
 * Correo de doble opt-in de la newsletter, con la plantilla común. Hasta que
 * la persona pulsa el botón no recibe nada más (regla del repo).
 */
export function buildConfirmEmail(locale: AppLocale, confirmUrl: string): ConfirmEmailParts {
  const t = emailCopy(locale, "newsletter");
  const common = emailCopy(locale, "common");
  const subject = t("subject");
  const { html, text } = renderEmail({
    lang: locale,
    subject,
    preheader: t("preheader"),
    headerTag: t("tag"),
    eyebrow: t("eyebrow"),
    title: t("title"),
    paragraphs: [t("intro")],
    cta: { label: t("cta"), url: confirmUrl },
    afterCta: [t("ignore")],
    linkFallback: { label: t("fallback"), url: confirmUrl },
    footer: { sign: common("sign"), place: common("place"), note: t("footer_note") },
  });
  return { subject, html, text };
}
