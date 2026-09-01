import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { CampaignRow } from "@/components/public/CampaignRow";
import { RevealMount } from "@/components/public/RevealMount";
import { ListHeader } from "@/components/public/ListHeader";

export const dynamic = "force-dynamic";

export default async function NewsletterArchivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newsletterArchive");

  const campaigns = await prisma.campaign.findMany({
    where: { status: "SENT", isPublic: true },
    orderBy: { sentAt: "desc" },
    select: {
      id: true,
      subject: true,
      preheader: true,
      sentAt: true,
      audienceLocale: true,
    },
  });

  return (
    <main>
      <RevealMount />
      <ListHeader title={t("title")} sub={t("sub")} dense width="4xl" />

      <section className="mx-auto max-w-4xl px-6 pb-24 pt-16 md:px-16">
        {campaigns.length === 0 ? (
          <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-2">
            {t("empty")}
          </div>
        ) : (
          <ul className="vv-seq flex flex-col gap-3">
            {campaigns.map((c) => (
              <li key={c.id}>
                <CampaignRow campaign={c} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
