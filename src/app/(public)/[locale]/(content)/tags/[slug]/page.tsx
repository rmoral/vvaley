import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { ArticleCard } from "@/components/public/ArticleCard";
import { NewsItem } from "@/components/public/NewsItem";
import { RevealMount } from "@/components/public/RevealMount";
import { ListHeader } from "@/components/public/ListHeader";
import { localizedUrls } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) return {};
  return {
    title: tag.name,
    description: tag.description ?? undefined,
    alternates: localizedUrls(`/tags/${slug}`, locale as AppLocale),
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tagPage");
  const tb = await getTranslations("blogList");
  const tc = await getTranslations("common");

  const tag = await prisma.tag.findUnique({
    where: { slug },
    include: {
      posts: {
        where: { post: { status: "PUBLISHED" } },
        include: {
          post: {
            include: {
              translations: true,
              author: { select: { name: true } },
              tags: { include: { tag: true } },
            },
          },
        },
      },
      news: {
        where: { news: { status: "PUBLISHED" } },
        include: {
          news: {
            include: { translations: true, tags: { include: { tag: true } } },
          },
        },
      },
    },
  });
  if (!tag) notFound();

  const byDate = <T extends { publishedAt: Date | null }>(a: T, b: T) =>
    (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);

  const posts = tag.posts
    .map((pt) => pt.post)
    .sort(byDate)
    .map((post) => {
      const tr = pickTranslation(post, locale as AppLocale);
      return tr
        ? {
            slug: post.slug,
            title: tr.title,
            summary: tr.summary,
            coverImageUrl: post.coverImageUrl,
            publishedAt: post.publishedAt,
            authorName: post.author?.name ?? null,
            tags: post.tags.map((x) => x.tag),
          }
        : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const news = tag.news
    .map((nt) => nt.news)
    .sort(byDate)
    .map((n) => {
      const tr = pickTranslation(n, locale as AppLocale);
      return tr
        ? {
            slug: n.slug,
            title: tr.title,
            summary: tr.summary,
            publishedAt: n.publishedAt,
            externalUrl: n.externalUrl,
            tags: n.tags.map((x) => x.tag),
          }
        : null;
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  return (
    <main>
      <RevealMount />
      <ListHeader
        title={tag.name}
        sub={tag.description ?? undefined}
      >
        <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-river">
          {t("eyebrow")}
        </p>
      </ListHeader>

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:px-16">
        {posts.length === 0 && news.length === 0 && (
          <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-2">
            {t("empty")}
          </div>
        )}

        {posts.length > 0 && (
          <section className="mb-16">
            <h2 className="mb-5 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-text-2">
              {t("posts")}
            </h2>
            <ul className="vv-seq grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.slug}>
                  <ArticleCard post={post} locale={locale} byLabel={tb("by")} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {news.length > 0 && (
          <section>
            <h2 className="mb-5 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-text-2">
              {t("news")}
            </h2>
            <ul className="vv-seq flex flex-col gap-4">
              {news.map((n) => (
                <li key={n.slug}>
                  <NewsItem
                    news={n}
                    locale={locale}
                    externalLabel={tc("externalLink")}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
