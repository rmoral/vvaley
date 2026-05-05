import type { AppLocale } from "@/i18n/routing";

type ConfirmEmailParts = { subject: string; html: string; text: string };

const confirmCopy: Record<
  AppLocale,
  {
    subject: string;
    intro: string;
    cta: string;
    fallback: string;
    sign: string;
  }
> = {
  es: {
    subject: "Confirma tu suscripción a Valira Valley",
    intro:
      "Gracias por suscribirte a la newsletter de Valira Valley. Sólo falta un paso: confirma tu email haciendo clic en el botón.",
    cta: "Confirmar suscripción",
    fallback: "Si el botón no funciona, copia este enlace en tu navegador:",
    sign: "Equipo de Valira Valley",
  },
  ca: {
    subject: "Confirma la teva subscripció a Valira Valley",
    intro:
      "Gràcies per subscriure't a la newsletter de Valira Valley. Només falta un pas: confirma el teu correu fent clic al botó.",
    cta: "Confirmar subscripció",
    fallback: "Si el botó no funciona, copia aquest enllaç al teu navegador:",
    sign: "Equip de Valira Valley",
  },
  en: {
    subject: "Confirm your Valira Valley subscription",
    intro:
      "Thanks for subscribing to the Valira Valley newsletter. One last step: confirm your email by clicking the button.",
    cta: "Confirm subscription",
    fallback: "If the button doesn't work, copy this link into your browser:",
    sign: "The Valira Valley team",
  },
  fr: {
    subject: "Confirmez votre abonnement à Valira Valley",
    intro:
      "Merci de vous être abonné à la newsletter de Valira Valley. Il ne reste qu'une étape : confirmez votre adresse en cliquant sur le bouton.",
    cta: "Confirmer l'abonnement",
    fallback:
      "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
    sign: "L'équipe de Valira Valley",
  },
};

export function buildConfirmEmail(
  locale: AppLocale,
  confirmUrl: string,
): ConfirmEmailParts {
  const c = confirmCopy[locale] ?? confirmCopy.es;

  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#F4F8F8;padding:32px;color:#142E30;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #C8D8DA;border-radius:8px;padding:32px;">
    <div style="font-family:Georgia,serif;font-weight:900;font-size:18px;letter-spacing:.05em;">
      VALIRA<span style="color:#2E8B8F"> · </span>VALLEY
    </div>
    <p style="margin-top:24px;line-height:1.6;color:#3A5557;">${c.intro}</p>
    <p style="margin:32px 0;text-align:center;">
      <a href="${confirmUrl}"
         style="display:inline-block;background:#2E8B8F;color:#fff;text-decoration:none;padding:12px 24px;border-radius:3px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;font-size:14px;">
        ${c.cta}
      </a>
    </p>
    <p style="font-size:13px;color:#6A8688;line-height:1.6;">${c.fallback}<br><a href="${confirmUrl}" style="color:#2E8B8F;word-break:break-all;">${confirmUrl}</a></p>
    <p style="font-size:13px;color:#6A8688;margin-top:32px;">— ${c.sign}</p>
  </div>
</body></html>`;

  const text = `${c.intro}\n\n${c.cta}: ${confirmUrl}\n\n— ${c.sign}`;

  return { subject: c.subject, html, text };
}
