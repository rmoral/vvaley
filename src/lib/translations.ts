import { routing, type AppLocale } from "@/i18n/routing";

type Translatable<T extends { locale: string }> = { translations: T[] };

// Pick the best translation for the requested locale, falling back to the
// default locale, then to the first available one. Used by Post, News and
// Event public pages so every entity behaves the same way for i18n.
export function pickTranslation<T extends { locale: string }>(
  item: Translatable<T>,
  locale: AppLocale,
): T | null {
  const exact = item.translations.find((tr) => tr.locale === locale);
  if (exact) return exact;
  const fallback = item.translations.find(
    (tr) => tr.locale === routing.defaultLocale,
  );
  return fallback ?? item.translations[0] ?? null;
}
