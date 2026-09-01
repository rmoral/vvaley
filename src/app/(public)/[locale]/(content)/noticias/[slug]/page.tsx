import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { renderMarkdown } from "@/lib/markdown";
import { JsonLd } from "@/components/public/JsonLd";
import { TagChips } from "@/components/public/TagChips";
import { localizedUrls, ogLocale } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const news = await prisma.news.findUnique({
    where: { slug },
    include: { translations: true },
  });
  if (!news || news.status !== "PUBLISHED" || news.externalUrl) return {};
  const tr = pickTranslation(news, locale as AppLocale);
  if (!tr) return {};
  const urls = localizedUrls(`/noticias/${slug}`, locale as AppLocale);
  return {
    title: tr.title,
    description: tr.summary ?? undefined,
    alternates: urls,
    openGraph: {
      type: "article",
      url: urls.canonical,
      title: tr.title,
      description: tr.summary ?? undefined,
      images: news.coverImageUrl ? [news.coverImageUrl] : undefined,
      locale: ogLocale(locale as AppLocale),
      publishedTime: news.publishedAt?.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: tr.title,
      description: tr.summary ?? undefined,
      images: news.coverImageUrl ? [news.coverImageUrl] : undefined,
    },
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newsDetail");

  const news = await prisma.news.findUnique({
    where: { slug },
    include: {
      translations: true,
      tags: { include: { tag: true } },
    },
  });
  if (!news || news.status !== "PUBLISHED") notFound();

  // External news (with externalUrl set) live as link-only items in the list,
  // not as a dedicated detail page. If somebody hits the detail URL anyway,
  // bounce them to the source.
  if (news.externalUrl) {
    redirect(news.externalUrl);
  }

  const tr = pickTranslation(news, locale as AppLocale);
  if (!tr) notFound();

  const html = tr.body ? renderMarkdown(tr.body) : "";
  const isFallback = tr.locale !== locale;
  const url = localizedUrls(`/noticias/${slug}`, locale as AppLocale).canonical;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": url,
    url,
    headline: tr.title,
    description: tr.summary ?? undefined,
    image: news.coverImageUrl ?? undefined,
    datePublished: news.publishedAt?.toISOString(),
    dateModified: news.updatedAt.toISOString(),
    inLanguage: tr.locale,
    publisher: { "@type": "Organization", name: "Valira Valley" },
  };

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-16">
      <Link
        href="/noticias"
        className="mb-6 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← {t("back")}
      </Link>

      {news.publishedAt && (
        <div className="mb-3 text-[0.74rem] uppercase tracking-[0.1em] text-river">
          {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
            news.publishedAt,
          )}
        </div>
      )}
      <h1 className="mb-4 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-[1.1] text-text">
        {tr.title}
      </h1>
      {tr.summary && (
        <p className="mb-8 text-[1.05rem] font-light leading-[1.6] text-text-2">
          {tr.summary}
        </p>
      )}
      {news.coverImageUrl && (
        <div
          className="mb-10 aspect-[16/9] w-full rounded-lg bg-bg2 bg-cover bg-center"
          style={{ backgroundImage: `url(${news.coverImageUrl})` }}
          aria-hidden
        />
      )}

      {isFallback && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[0.85rem] text-amber-800">
          {t("fallback_notice")}
        </div>
      )}

      {html ? (
        <article
          className="prose prose-neutral max-w-none text-[1rem] leading-[1.75] text-text-2 [&_a]:text-river [&_a:hover]:text-text [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-[1.5rem] [&_h2]:font-bold [&_h2]:text-text [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-[1.2rem] [&_h3]:font-semibold [&_h3]:text-text [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-river [&_blockquote]:pl-4 [&_blockquote]:italic"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        tr.summary === null && (
          <p className="text-[0.95rem] text-text-2">{t("no_body")}</p>
        )
      )}

      {news.tags.length > 0 && (
        <div className="mt-10">
          <TagChips tags={news.tags.map((nt) => nt.tag)} />
        </div>
      )}
      <JsonLd data={jsonLd} />
    </main>
  );
}
