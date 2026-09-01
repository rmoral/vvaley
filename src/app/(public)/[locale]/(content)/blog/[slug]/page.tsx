import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { renderMarkdown } from "@/lib/markdown";
import { DetailShell, Prose } from "@/components/public/DetailShell";
import { NewsletterInline } from "@/components/public/NewsletterInline";
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
  const post = await prisma.post.findUnique({
    where: { slug },
    include: { translations: true },
  });
  if (!post || post.status !== "PUBLISHED") return {};
  const tr = pickTranslation(post, locale as AppLocale);
  if (!tr) return {};
  const urls = localizedUrls(`/blog/${slug}`, locale as AppLocale);
  return {
    title: tr.title,
    description: tr.summary ?? undefined,
    alternates: urls,
    openGraph: {
      type: "article",
      url: urls.canonical,
      title: tr.title,
      description: tr.summary ?? undefined,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
      locale: ogLocale(locale as AppLocale),
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: tr.title,
      description: tr.summary ?? undefined,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blogPost");
  const fmt = await getFormatter();

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      translations: true,
      author: { select: { name: true } },
      tags: { include: { tag: true } },
    },
  });
  if (!post || post.status !== "PUBLISHED") notFound();

  const tr = pickTranslation(post, locale as AppLocale);
  if (!tr) notFound();

  const html = renderMarkdown(tr.body);
  const isFallback = tr.locale !== locale;
  const url = localizedUrls(`/blog/${slug}`, locale as AppLocale).canonical;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": url,
    url,
    headline: tr.title,
    description: tr.summary ?? undefined,
    image: post.coverImageUrl ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    inLanguage: tr.locale,
    author: post.author?.name
      ? { "@type": "Person", name: post.author.name }
      : { "@type": "Organization", name: "Valira Valley" },
    publisher: { "@type": "Organization", name: "Valira Valley" },
    mainEntityOfPage: url,
  };

  return (
    <DetailShell
      backHref="/blog"
      backLabel={t("back")}
      eyebrow={
        post.publishedAt
          ? fmt.dateTime(post.publishedAt, { dateStyle: "long" })
          : undefined
      }
      title={tr.title}
      subtitle={tr.summary}
      coverUrl={post.coverImageUrl ?? undefined}
      notice={isFallback ? t("fallback_notice") : undefined}
      aside={
        post.tags.length > 0 || post.author?.name ? (
          <>
            {post.tags.length > 0 ? (
              <TagChips tags={post.tags.map((pt) => pt.tag)} />
            ) : null}
            {post.author?.name ? (
              <p className="mt-6 text-[0.85rem] text-text-2">
                {t("by")}{" "}
                <span className="font-medium text-text">{post.author.name}</span>
              </p>
            ) : null}
          </>
        ) : undefined
      }
      footer={
        <>
          <NewsletterInline source={`blog:${post.slug}`} variant="blog" />
          <JsonLd data={jsonLd} />
        </>
      }
    >
      <Prose html={html} />
    </DetailShell>
  );
}
