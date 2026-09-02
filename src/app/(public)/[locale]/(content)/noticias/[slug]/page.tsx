import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { renderMarkdown } from "@/lib/markdown";
import { resolveCover } from "@/lib/pillar-cover";
import { DetailShell, Prose } from "@/components/public/DetailShell";
import { JsonLd } from "@/components/public/JsonLd";
import { TagChips } from "@/components/public/TagChips";
import { FaqBlock, parseFaq } from "@/components/public/FaqBlock";
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
    // seoTitle es el titular corto para el SERP; title es el H1 de la página.
    title: tr.seoTitle ?? tr.title,
    description: tr.metaDescription ?? tr.summary ?? undefined,
    alternates: urls,
    openGraph: {
      type: "article",
      url: urls.canonical,
      title: tr.title,
      description: tr.metaDescription ?? tr.summary ?? undefined,
      images: news.coverImageUrl ? [news.coverImageUrl] : undefined,
      locale: ogLocale(locale as AppLocale),
      publishedTime: news.publishedAt?.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: tr.title,
      description: tr.metaDescription ?? tr.summary ?? undefined,
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
  const fmt = await getFormatter();

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
  const cover = resolveCover({
    uploaded: news.coverImageUrl,
    tags: news.tags.map((nt) => nt.tag),
  });
  const isFallback = tr.locale !== locale;
  const faq = parseFaq(tr.faq);
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

  // Segundo JSON-LD, independiente del NewsArticle.
  const faqLd = faq && {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.pregunta,
      acceptedAnswer: { "@type": "Answer", text: f.respuesta },
    })),
  };

  return (
    <DetailShell
      backHref="/noticias"
      backLabel={t("back")}
      eyebrow={
        news.publishedAt
          ? fmt.dateTime(news.publishedAt, { dateStyle: "long" })
          : undefined
      }
      title={tr.title}
      subtitle={tr.summary}
      coverUrl={cover.src ?? undefined}
      coverTreatment={cover.isDefault ? "plate" : "duotone"}
      coverAlt={cover.isDefault ? "" : (tr.coverImageAlt ?? "")}
      notice={isFallback ? t("fallback_notice") : undefined}
      aside={
        news.tags.length > 0 ? (
          <TagChips tags={news.tags.map((nt) => nt.tag)} />
        ) : undefined
      }
      footer={
        <>
          {faq ? (
            <section className="mt-12 border-t border-bg3 pt-10">
              <FaqBlock title={t("faq_title")} items={faq} />
            </section>
          ) : null}
          <JsonLd data={jsonLd} />
          {faqLd ? <JsonLd data={faqLd} /> : null}
        </>
      }
    >
      {html ? (
        <Prose html={html} />
      ) : tr.summary === null ? (
        <p className="text-[0.95rem] text-text-2">{t("no_body")}</p>
      ) : null}
    </DetailShell>
  );
}
