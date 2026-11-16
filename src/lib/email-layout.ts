// ---------------------------------------------------------------------------
// Plantilla común de todos los correos de Valira Valley (dirección «A ·
// Cabecera tinta» del sistema Cota): cabecera tinta con el logo, línea de
// acento, cuerpo blanco, tabla de datos, botón y pie tinta con la firma.
//
// HTML de correo, no de web: tablas, estilos en línea y atributos bgcolor,
// que es lo que respetan Gmail, Outlook y Apple Mail. El logo va en PNG
// (public/email/) porque Gmail y Outlook no muestran SVG. Las tipografías de
// la web (Fraunces, Plus Jakarta Sans) solo cargan en los clientes que lo
// permiten; el resto cae a Georgia y Arial, y el diseño aguanta con ellas.
//
// Todo el texto se escapa aquí. La única entrada que va tal cual es
// `bodyHtml`, reservada al cuerpo de las campañas, que sale del Markdown que
// escribe el equipo en el admin.
// ---------------------------------------------------------------------------

import { getSiteUrl } from "@/lib/site-url";

export const EMAIL_COLORS = {
  ink: "#0d1f21",
  ink2: "#a8c3c4",
  inkRule: "#24393b",
  river: "#277577",
  text: "#142e30",
  text2: "#3a5557",
  line: "#c8d8da",
  page: "#ebf2f2",
  soft: "#f4f8f8",
  alert: "#8b2e2e",
  white: "#ffffff",
} as const;

const C = EMAIL_COLORS;
const SANS = "'Plus Jakarta Sans', Arial, Helvetica, sans-serif";
const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";

export type EmailDetail = {
  label: string;
  value: string;
  /** Si está, el valor es un enlace. */
  href?: string;
};

export type EmailContent = {
  /** Idioma del correo (atributo lang). */
  lang: string;
  /** Asunto: también el <title> del HTML. */
  subject: string;
  /** Texto de vista previa que muestran las bandejas junto al asunto. */
  preheader?: string;
  /** Etiqueta pequeña de la cabecera: «Eventos», «Newsletter»… */
  headerTag: string;
  eyebrow?: string;
  title: string;
  /** Párrafos de texto (se escapan). */
  paragraphs?: string[];
  /** HTML de confianza (solo campañas). Va después de los párrafos. */
  bodyHtml?: string;
  details?: EmailDetail[];
  /** Fila final destacada de la tabla (importe). */
  total?: { label: string; value: string };
  /** Línea pequeña bajo la tabla (referencia). */
  reference?: string;
  /** Recuadro de aviso (correos internos). */
  notice?: string;
  cta?: { label: string; url: string };
  /** Texto bajo el botón. */
  afterCta?: string[];
  /** «Si el botón no funciona, copia este enlace…» */
  linkFallback?: { label: string; url: string };
  footer: {
    sign: string;
    place?: string;
    note: string;
    unsubscribe?: { label: string; url: string };
  };
};

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Solo http(s), mailto y tel: un href con otro esquema se descarta. */
function safeUrl(url: string): string | null {
  return /^(https?:|mailto:|tel:)/i.test(url.trim()) ? url.trim() : null;
}

const e = escapeHtml;

function siteHost(site: string): string {
  return site.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function detailsRows(details: EmailDetail[]): string {
  return details
    .map((d) => {
      const href = d.href ? safeUrl(d.href) : null;
      const value = href
        ? `<a href="${e(href)}" style="color:${C.river};text-decoration:underline;">${e(d.value)}</a>`
        : e(d.value);
      return `<tr>
<td class="vv-label" style="padding:14px 16px 14px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:14px;line-height:1.5;color:${C.text2};vertical-align:top;white-space:nowrap;">${e(d.label)}</td>
<td class="vv-value" style="padding:14px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:14px;line-height:1.5;font-weight:600;color:${C.text};text-align:right;vertical-align:top;">${value}</td>
</tr>`;
    })
    .join("\n");
}

function button(label: string, url: string): string {
  const href = safeUrl(url);
  if (!href) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td bgcolor="${C.river}" style="background:${C.river};border-radius:3px;">
<a href="${e(href)}" style="display:inline-block;padding:15px 28px;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${C.white};text-decoration:none;border-radius:3px;">${e(label)}</a>
</td></tr>
</table>`;
}

/** HTML y texto plano de un correo con la plantilla común. */
export function renderEmail(content: EmailContent): { html: string; text: string } {
  const site = getSiteUrl();
  const logo = `${site}/email/logo-invert@2x.png`;
  const host = siteHost(site);
  const f = content.footer;

  const paragraphs = (content.paragraphs ?? [])
    .map(
      (p) =>
        `<p style="margin:0 0 14px 0;font-family:${SANS};font-size:16px;line-height:1.65;color:${C.text2};">${e(p)}</p>`,
    )
    .join("\n");

  const details =
    (content.details && content.details.length > 0) || content.total
      ? `<tr><td class="vv-pad" style="padding:12px 40px 0 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line};">
${detailsRows(content.details ?? [])}
${
  content.total
    ? `<tr>
<td style="padding:16px 16px 16px 0;border-bottom:2px solid ${C.text};font-family:${SANS};font-size:15px;font-weight:600;color:${C.text};">${e(content.total.label)}</td>
<td style="padding:16px 0;border-bottom:2px solid ${C.text};font-family:${SERIF};font-size:20px;font-weight:700;color:${C.text};text-align:right;white-space:nowrap;">${e(content.total.value)}</td>
</tr>`
    : ""
}
</table>
${
  content.reference
    ? `<p style="margin:10px 0 0 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.text2};">${e(content.reference)}</p>`
    : ""
}
</td></tr>`
      : "";

  const notice = content.notice
    ? `<tr><td class="vv-pad" style="padding:20px 40px 0 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding:14px 16px;background:${C.soft};border:1px solid ${C.alert};border-radius:3px;font-family:${SANS};font-size:13px;line-height:1.55;color:${C.alert};">${e(content.notice)}</td>
</tr></table>
</td></tr>`
    : "";

  const afterCta = (content.afterCta ?? [])
    .map(
      (p) =>
        `<p style="margin:18px 0 0 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.text2};">${e(p)}</p>`,
    )
    .join("\n");

  const fallbackUrl = content.linkFallback ? safeUrl(content.linkFallback.url) : null;
  const fallback =
    content.linkFallback && fallbackUrl
      ? `<p style="margin:18px 0 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.text2};">${e(content.linkFallback.label)}<br><a href="${e(fallbackUrl)}" style="color:${C.river};word-break:break-all;">${e(fallbackUrl)}</a></p>`
      : "";

  const ctaBlock =
    content.cta || afterCta || fallback
      ? `<tr><td class="vv-pad" style="padding:28px 40px 8px 40px;">
${content.cta ? button(content.cta.label, content.cta.url) : ""}
${afterCta}
${fallback}
</td></tr>`
      : "";

  const unsubscribeUrl = f.unsubscribe ? safeUrl(f.unsubscribe.url) : null;

  const html = `<!doctype html>
<html lang="${e(content.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${e(content.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&amp;family=Plus+Jakarta+Sans:wght@400;600;700&amp;display=swap" rel="stylesheet">
<style>
body{margin:0;padding:0;background:${C.page};}
.vv-body p{margin:0 0 14px 0;font-family:${SANS};font-size:16px;line-height:1.65;color:${C.text2};}
.vv-body h1,.vv-body h2,.vv-body h3{margin:28px 0 10px 0;font-family:${SERIF};font-weight:700;line-height:1.2;color:${C.text};}
.vv-body h2{font-size:22px;}.vv-body h3{font-size:18px;}
.vv-body a{color:${C.river};}
.vv-body ul,.vv-body ol{margin:0 0 14px 0;padding-left:22px;font-family:${SANS};font-size:16px;line-height:1.65;color:${C.text2};}
.vv-body img{max-width:100%;height:auto;}
.vv-body hr{border:0;border-top:1px solid ${C.line};margin:24px 0;}
.vv-body blockquote{margin:0 0 14px 0;padding-left:16px;border-left:3px solid ${C.line};color:${C.text2};}
@media only screen and (max-width:620px){
  .vv-card{width:100% !important;}
  .vv-pad{padding-left:24px !important;padding-right:24px !important;}
  .vv-title{font-size:28px !important;}
  .vv-tag{display:none !important;}
  .vv-label{white-space:normal !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
${
  content.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};">${e(content.preheader)}</div>`
    : ""
}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" class="vv-card" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.white}" style="width:600px;max-width:600px;background:${C.white};border:1px solid ${C.line};">

<tr><td class="vv-pad" bgcolor="${C.ink}" style="background:${C.ink};padding:32px 40px 28px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><a href="${e(site)}" style="text-decoration:none;"><img src="${e(logo)}" width="182" height="24" alt="Valira Valley" style="display:block;border:0;outline:none;width:182px;height:24px;color:${C.white};font-family:${SANS};font-size:16px;font-weight:700;"></a></td>
<td class="vv-tag" align="right" style="vertical-align:middle;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${C.ink2};">${e(content.headerTag)}</td>
</tr></table>
</td></tr>
<tr><td height="4" bgcolor="${C.river}" style="height:4px;line-height:4px;font-size:4px;background:${C.river};">&nbsp;</td></tr>

<tr><td class="vv-pad" style="padding:44px 40px 4px 40px;">
${
  content.eyebrow
    ? `<p style="margin:0 0 14px 0;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${C.river};">${e(content.eyebrow)}</p>`
    : ""
}
<h1 class="vv-title" style="margin:0 0 20px 0;font-family:${SERIF};font-size:34px;font-weight:700;line-height:1.15;color:${C.text};">${e(content.title)}</h1>
${paragraphs}
${content.bodyHtml ? `<div class="vv-body">${content.bodyHtml}</div>` : ""}
</td></tr>
${details}
${notice}
${ctaBlock}
<tr><td style="padding:0 0 32px 0;font-size:0;line-height:0;">&nbsp;</td></tr>

<tr><td class="vv-pad" bgcolor="${C.ink}" style="background:${C.ink};padding:32px 40px;">
<img src="${e(logo)}" width="136" height="18" alt="Valira Valley" style="display:block;border:0;width:136px;height:18px;color:${C.white};font-family:${SANS};font-size:14px;font-weight:700;">
<p style="margin:14px 0 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.ink2};">${e(f.sign)}${f.place ? `<br>${e(f.place)}` : ""}</p>
<p style="margin:12px 0 0 0;font-family:${SANS};font-size:13px;line-height:1.6;"><a href="${e(site)}" style="color:${C.white};font-weight:600;text-decoration:none;">${e(host)}</a></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;"><tr><td height="1" bgcolor="${C.inkRule}" style="height:1px;line-height:1px;font-size:1px;background:${C.inkRule};padding:0;">&nbsp;</td></tr></table>
<p style="margin:14px 0 0 0;font-family:${SANS};font-size:11px;line-height:1.6;color:${C.ink2};">${e(f.note)}${
    f.unsubscribe && unsubscribeUrl
      ? `<br><a href="${e(unsubscribeUrl)}" style="color:${C.white};text-decoration:underline;">${e(f.unsubscribe.label)}</a>`
      : ""
  }</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return { html, text: renderText(content, host) };
}

/** Versión en texto plano, con la misma información y orden. */
function renderText(content: EmailContent, host: string): string {
  const out: string[] = [];
  if (content.eyebrow) out.push(content.eyebrow.toUpperCase());
  out.push(content.title, "");
  for (const p of content.paragraphs ?? []) out.push(p, "");
  for (const d of content.details ?? []) out.push(`${d.label}: ${d.value}`);
  if (content.total) out.push(`${content.total.label}: ${content.total.value}`);
  if (content.reference) out.push(content.reference);
  if ((content.details?.length ?? 0) > 0 || content.total || content.reference) out.push("");
  if (content.notice) out.push(content.notice, "");
  if (content.cta) out.push(`${content.cta.label}: ${content.cta.url}`, "");
  for (const p of content.afterCta ?? []) out.push(p, "");
  out.push("—", content.footer.sign);
  if (content.footer.place) out.push(content.footer.place);
  out.push(host, "", content.footer.note);
  if (content.footer.unsubscribe) {
    out.push(`${content.footer.unsubscribe.label}: ${content.footer.unsubscribe.url}`);
  }
  return out.join("\n");
}
