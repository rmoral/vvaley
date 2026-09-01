import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { TagChips } from "@/components/public/TagChips";
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
  const urls = localizedUrls(`/tags/${slug}`, locale as AppLocale);
  return {
    title: tag.name,
    description: tag.description ?? undefined,
    alternates: urls,
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
            include: {
              translations: true,
              tags: { include: { tag: true } },
            },
          },
        },
      },
    },
  });

  if (!tag) notFound();

  const posts = tag.posts
    .map((pt) => pt.post)
    .sort(
      (a, b) =>
        (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    );
  const news = tag.news
    .map((nt) => nt.news)
    .sort(
      (a, b) =>
        (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    );

  const empty = posts.length === 0 && news.length === 0;

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-16">
      <div className="mb-3 text-[0.74rem] uppercase tracking-[0.16em] text-text-2">
        {t("eyebrow")}
      </div>
      <h1 className="mb-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] font-black leading-[1.05] text-text">
        {tag.name}
      </h1>
      {tag.description && (
        <p className="mb-12 max-w-[600px] text-[1.02rem] font-light leading-[1.7] text-text-2">
          {tag.description}
        </p>
      )}

      {empty && (
        <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-2">
          {t("empty")}
        </div>
      )}

      {posts.length > 0 && (
        <section className="mb-16">
          <h2 className="mb-5 font-display text-[1.4rem] font-bold text-text">
            {t("posts")}
          </h2>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {posts.map((post) => {
              const tr = pickTranslation(post, locale as AppLocale);
              if (!tr) return null;
              return (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex h-full flex-col gap-3 rounded-lg border border-bg3 bg-white p-6 no-underline transition-all hover:-translate-y-1 hover:border-river-2"
                  >
                    {post.publishedAt && (
                      <div className="text-[0.74rem] uppercase tracking-[0.1em] text-river">
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                        }).format(post.publishedAt)}
                      </div>
                    )}
                    <h3 className="font-display text-[1.2rem] font-bold leading-tight text-text group-hover:text-river">
                      {tr.title}
                    </h3>
                    {tr.summary && (
                      <p className="text-[0.9rem] leading-[1.6] text-text-2 line-clamp-3">
                        {tr.summary}
                      </p>
                    )}
                    {post.tags.length > 0 && (
                      <TagChips
                        tags={post.tags.map((pt) => pt.tag)}
                        size="sm"
                        linked={false}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {news.length > 0 && (
        <section>
          <h2 className="mb-5 font-display text-[1.4rem] font-bold text-text">
            {t("news")}
          </h2>
          <ul className="flex flex-col gap-4">
            {news.map((item) => {
              const tr = pickTranslation(item, locale as AppLocale);
              if (!tr) return null;

              const Wrapper = ({ children }: { children: React.ReactNode }) =>
                item.externalUrl ? (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-2 rounded-lg border border-bg3 bg-white p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-river-2 sm:flex-row sm:items-baseline sm:gap-6"
                  >
                    {children}
                  </a>
                ) : (
                  <Link
                    href={`/noticias/${item.slug}`}
                    className="group flex flex-col gap-2 rounded-lg border border-bg3 bg-white p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-river-2 sm:flex-row sm:items-baseline sm:gap-6"
                  >
                    {children}
                  </Link>
                );

              return (
                <li key={item.id}>
                  <Wrapper>
                    {item.publishedAt && (
                      <time
                        className="shrink-0 text-[0.74rem] uppercase tracking-[0.1em] text-river sm:w-32"
                        dateTime={item.publishedAt.toISOString()}
                      >
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                        }).format(item.publishedAt)}
                      </time>
                    )}
                    <div className="flex-1">
                      <h3 className="font-display text-[1.1rem] font-bold leading-tight text-text group-hover:text-river">
                        {tr.title}
                        {item.externalUrl && (
                          <span className="ml-2 text-[0.85rem] text-text-2">↗</span>
                        )}
                      </h3>
                      {tr.summary && (
                        <p className="mt-1 text-[0.9rem] leading-[1.6] text-text-2">
                          {tr.summary}
                        </p>
                      )}
                      {item.tags.length > 0 && (
                        <div className="mt-2">
                          <TagChips
                            tags={item.tags.map((nt) => nt.tag)}
                            size="sm"
                            linked={false}
                          />
                        </div>
                      )}
                    </div>
                  </Wrapper>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
