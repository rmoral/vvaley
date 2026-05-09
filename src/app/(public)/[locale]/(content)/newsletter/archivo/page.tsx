import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

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
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-32 md:px-16">
      <h1 className="mb-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] font-black leading-[1.05] text-text">
        {t("title")}
      </h1>
      <p className="mb-12 max-w-[600px] text-[1.02rem] font-light leading-[1.7] text-text-2">
        {t("sub")}
      </p>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-3">
          {t("empty")}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link
                href={`/newsletter/archivo/${c.id}`}
                className="group flex flex-col gap-2 rounded-lg border border-bg3 bg-white p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-river-2 sm:flex-row sm:items-baseline sm:gap-6"
              >
                {c.sentAt && (
                  <time
                    className="shrink-0 text-[0.74rem] uppercase tracking-[0.1em] text-river sm:w-32"
                    dateTime={c.sentAt.toISOString()}
                  >
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                    }).format(c.sentAt)}
                  </time>
                )}
                <div className="flex-1">
                  <h2 className="font-display text-[1.1rem] font-bold leading-tight text-text group-hover:text-river">
                    {c.subject}
                  </h2>
                  {c.preheader && (
                    <p className="mt-1 text-[0.9rem] leading-[1.55] text-text-2 line-clamp-2">
                      {c.preheader}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
