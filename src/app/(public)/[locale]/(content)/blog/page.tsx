import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { resolveCover } from "@/lib/pillar-cover";
import { ArticleCard } from "@/components/public/ArticleCard";
import { RevealMount } from "@/components/public/RevealMount";
import { ListHeader } from "@/components/public/ListHeader";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function BlogListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blogList");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");

  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: {
      translations: true,
      author: { select: { name: true } },
      tags: { include: { tag: true } },
    },
  });

  const items = posts
    .map((post) => {
      const tr = pickTranslation(post, locale as AppLocale);
      if (!tr) return null;
      const tags = post.tags.map((pt) => pt.tag);
      // Escalera de portada: subida → temática del pilar → contorno.
      const cover = resolveCover({ uploaded: post.coverImageUrl, tags });
      return {
        slug: post.slug,
        title: tr.title,
        summary: tr.summary,
        coverImageUrl: cover.src,
        coverIsDefault: cover.isDefault,
        publishedAt: post.publishedAt,
        authorName: post.author?.name ?? null,
        tags,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <main>
      <RevealMount />
      <ListHeader
        eyebrow={tn("blog")}
        altitude={tc("cota_02")}
        title={t("title")}
        sub={t("sub")}
      />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:px-16">
        {items.length === 0 ? (
          <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-2">
            {t("empty")}
          </div>
        ) : (
          <ul className="vv-seq grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((post, i) => (
              <li key={post.slug}>
                <ArticleCard
                  post={post}
                  locale={locale}
                  byLabel={t("by")}
                  priority={i === 0}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
