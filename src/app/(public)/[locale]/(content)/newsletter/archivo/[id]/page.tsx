import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: {
      subject: true,
      preheader: true,
      isPublic: true,
      status: true,
    },
  });
  if (!campaign || campaign.status !== "SENT" || !campaign.isPublic) return {};
  return {
    title: campaign.subject,
    description: campaign.preheader ?? undefined,
  };
}

export default async function NewsletterArchiveDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newsletterArchive");

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      preheader: true,
      bodyMarkdown: true,
      sentAt: true,
      isPublic: true,
      status: true,
    },
  });
  if (!campaign || campaign.status !== "SENT" || !campaign.isPublic) {
    notFound();
  }

  // Strip the per-recipient placeholders that the email pipeline injects
  // ({{name}}, {{email}}, {{unsubscribe_url}}) — they make no sense on a
  // public web page. Keeping it permissive: collapse leftover whitespace
  // so paragraphs don't get a stray "Hola , …".
  const cleaned = campaign.bodyMarkdown
    .replace(/\{\{\s*(name|email|unsubscribe_url)\s*\}\}/gi, "")
    .replace(/[ \t]{2,}/g, " ");

  const html = renderMarkdown(cleaned);

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-16">
      <Link
        href="/newsletter/archivo"
        className="mb-6 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← {t("back")}
      </Link>

      {campaign.sentAt && (
        <div className="mb-3 text-[0.74rem] uppercase tracking-[0.1em] text-river">
          {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
            campaign.sentAt,
          )}
        </div>
      )}
      <h1 className="mb-4 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-[1.1] text-text">
        {campaign.subject}
      </h1>
      {campaign.preheader && (
        <p className="mb-10 text-[1.05rem] font-light leading-[1.6] text-text-2">
          {campaign.preheader}
        </p>
      )}

      <article
        className="prose prose-neutral max-w-none text-[1rem] leading-[1.75] text-text-2 [&_a]:text-river [&_a:hover]:text-text [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-[1.5rem] [&_h2]:font-bold [&_h2]:text-text [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-[1.2rem] [&_h3]:font-semibold [&_h3]:text-text [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-river [&_blockquote]:pl-4 [&_blockquote]:italic"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
