import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { renderMarkdown } from "@/lib/markdown";
import { DetailShell, Prose } from "@/components/public/DetailShell";

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
  const fmt = await getFormatter();

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
  // public web page. The placeholder takes with it the space before it and
  // the comma after it, so "Hola {{name}}," reads "Hola" and not "Hola ,".
  const cleaned = campaign.bodyMarkdown
    .replace(/[ \t]*\{\{\s*(name|email|unsubscribe_url)\s*\}\}[ \t]*,?/gi, "")
    .replace(/[ \t]{2,}/g, " ");

  const html = renderMarkdown(cleaned);

  return (
    <DetailShell
      backHref="/newsletter/archivo"
      backLabel={t("back")}
      eyebrow={
        campaign.sentAt
          ? fmt.dateTime(campaign.sentAt, { dateStyle: "long" })
          : undefined
      }
      title={campaign.subject}
      subtitle={campaign.preheader}
    >
      <Prose html={html} />
    </DetailShell>
  );
}
