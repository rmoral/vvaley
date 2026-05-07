import { routing, type AppLocale } from "@/i18n/routing";
import { getSiteUrl } from "./site-url";

/**
 * Build absolute URLs for a path on each locale and return:
 *   {
 *     canonical: "https://valiravalley.com/es/blog",
 *     languages: {
 *       es: "https://valiravalley.com/es/blog",
 *       ca: "https://valiravalley.com/ca/blog",
 *       en: "https://valiravalley.com/en/blog",
 *       fr: "https://valiravalley.com/fr/blog",
 *     },
 *   }
 *
 * `path` should NOT include the locale prefix — it's added per language.
 * Use empty string ("") for the home.
 */
export function localizedUrls(
  path: string,
  currentLocale: AppLocale = routing.defaultLocale,
) {
  const base = getSiteUrl();
  const cleanPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;

  const languages = Object.fromEntries(
    routing.locales.map((loc) => [loc, `${base}/${loc}${cleanPath}`]),
  ) as Record<AppLocale, string>;

  return {
    canonical: languages[currentLocale],
    languages,
  };
}

const ogLocaleMap: Record<AppLocale, string> = {
  es: "es_ES",
  ca: "ca_ES",
  en: "en_US",
  fr: "fr_FR",
};

export function ogLocale(locale: AppLocale): string {
  return ogLocaleMap[locale];
}

export function ogAlternateLocales(current: AppLocale): string[] {
  return routing.locales
    .filter((loc) => loc !== current)
    .map((loc) => ogLocaleMap[loc]);
}
