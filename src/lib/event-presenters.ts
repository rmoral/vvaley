// ---------------------------------------------------------------------------
// Quién presenta en un evento y cómo se comparte el evento.
//
// Módulo puro (sin base de datos ni red) para poder probarlo: normaliza el
// enlace que nos da cada empresa, decide cómo se rotula y construye los
// enlaces de compartir de cada red, con UTM para ver en Plausible de dónde
// llega la gente.
// ---------------------------------------------------------------------------

/**
 * Enlace tal como lo escribe el equipo → URL absoluta, o null si no vale.
 *   https://empresa.com          → igual
 *   empresa.com / www.empresa.ad → https://empresa.com…
 *   @empresa                     → https://www.instagram.com/empresa
 * Cualquier otro esquema (javascript:, data:, mailto:) se rechaza: acaba en
 * un href público.
 */
export function normalizePresenterUrl(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  if (/^@[\w.]{1,30}$/.test(value)) return `https://www.instagram.com/${value.slice(1)}`;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value.replace(/^\/+/, "")}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Texto corto del enlace: «@empresa» en Instagram, «LinkedIn», o el dominio. */
export function presenterLinkLabel(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  const host = u.hostname.replace(/^www\./, "");
  const first = u.pathname.split("/").filter(Boolean)[0];
  if (host === "instagram.com" && first) return `@${first}`;
  if (host === "x.com" || host === "twitter.com") return first ? `@${first}` : "X";
  if (host.endsWith("linkedin.com")) return "LinkedIn";
  if (host === "facebook.com") return "Facebook";
  if (host === "tiktok.com" && first) return first;
  return host;
}

/** Iniciales para cuando no hay logo: «Bright Tech» → «BT». */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

export const SHARE_NETWORKS = ["whatsapp", "linkedin", "x", "facebook", "telegram", "email"] as const;
export type ShareNetwork = (typeof SHARE_NETWORKS)[number];

/** La URL del evento con UTM: así Plausible separa lo que llega de cada red. */
export function withUtm(url: string, source: string, campaign: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

/**
 * Enlaces de compartir de cada red. `text` es la frase que acompaña al
 * enlace (título y fecha del evento); `campaign` agrupa el evento en la
 * analítica. Instagram no tiene enlace de compartir web: para él está el
 * botón de copiar enlace (y el de compartir nativo en móvil).
 */
export function shareLinks(url: string, text: string, campaign: string): Record<ShareNetwork, string> {
  const enc = encodeURIComponent;
  const to = (source: string) => withUtm(url, source, campaign);
  return {
    whatsapp: `https://wa.me/?text=${enc(`${text} ${to("whatsapp")}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(to("linkedin"))}`,
    x: `https://x.com/intent/post?text=${enc(text)}&url=${enc(to("x"))}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(to("facebook"))}`,
    telegram: `https://t.me/share/url?url=${enc(to("telegram"))}&text=${enc(text)}`,
    email: `mailto:?subject=${enc(text)}&body=${enc(`${text}\n\n${to("email")}`)}`,
  };
}
