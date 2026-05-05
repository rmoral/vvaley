import type { Post, PostTranslation } from "@prisma/client";
import { routing, type AppLocale } from "@/i18n/routing";

export type PostWithTranslations = Post & { translations: PostTranslation[] };

// Pick the best translation for the requested locale, falling back to the
// default locale, then to the first available one.
export function pickTranslation(
  post: PostWithTranslations,
  locale: AppLocale,
): PostTranslation | null {
  const exact = post.translations.find((tr) => tr.locale === locale);
  if (exact) return exact;
  const fallback = post.translations.find(
    (tr) => tr.locale === routing.defaultLocale,
  );
  return fallback ?? post.translations[0] ?? null;
}
