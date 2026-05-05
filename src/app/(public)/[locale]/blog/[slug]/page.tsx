import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blogPost");

  const post = await prisma.post.findUnique({
    where: { slug },
    include: { translations: true, author: { select: { name: true } } },
  });
  if (!post || post.status !== "PUBLISHED") notFound();

  const tr = pickTranslation(post, locale as AppLocale);
  if (!tr) notFound();

  const html = renderMarkdown(tr.body);
  const isFallback = tr.locale !== locale;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-16">
      <Link
        href="/blog"
        className="mb-6 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← {t("back")}
      </Link>

      {post.publishedAt && (
        <div className="mb-3 text-[0.74rem] uppercase tracking-[0.1em] text-river">
          {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(post.publishedAt)}
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
      {post.coverImageUrl && (
        <div
          className="mb-10 aspect-[16/9] w-full rounded-lg bg-bg2 bg-cover bg-center"
          style={{ backgroundImage: `url(${post.coverImageUrl})` }}
          aria-hidden
        />
      )}

      {isFallback && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[0.85rem] text-amber-800">
          {t("fallback_notice")}
        </div>
      )}

      <article
        className="prose prose-neutral max-w-none text-[1rem] leading-[1.75] text-text-2 [&_a]:text-river [&_a:hover]:text-text [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-[1.5rem] [&_h2]:font-bold [&_h2]:text-text [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-[1.2rem] [&_h3]:font-semibold [&_h3]:text-text [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-river [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-bg2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.92em]"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {post.author?.name && (
        <p className="mt-12 border-t border-bg3 pt-6 text-[0.85rem] text-text-3">
          {t("by")} <span className="font-medium text-text-2">{post.author.name}</span>
        </p>
      )}
    </main>
  );
}
