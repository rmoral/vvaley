import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PodcastListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("podcastList");

  const episodes = await prisma.episode.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { guests: { include: { guest: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-16">
      <h1 className="mb-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] font-black leading-[1.05] text-text">
        {t("title")}
      </h1>
      <p className="mb-12 max-w-[600px] text-[1.02rem] font-light leading-[1.7] text-text-2">
        {t("sub")}
      </p>

      {episodes.length === 0 && (
        <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-2">
          {t("empty")}
        </div>
      )}

      <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {episodes.map((ep) => (
          <li key={ep.id}>
            <Link
              href={`/podcast/${ep.slug}`}
              className="group block rounded-lg border border-bg3 bg-white p-6 no-underline transition-all hover:-translate-y-1 hover:border-river-2"
            >
              <div className="mb-2 flex items-baseline gap-3">
                {ep.number !== null && (
                  <span className="font-display text-[1.6rem] font-black leading-none text-bg3">
                    {String(ep.number).padStart(2, "0")}
                  </span>
                )}
                <span className="text-[0.7rem] uppercase tracking-[0.1em] text-river">
                  {t("ep")}
                </span>
              </div>
              <h2 className="mb-2 font-display text-[1.2rem] font-bold text-text group-hover:text-river">
                {ep.title}
              </h2>
              {ep.summary && (
                <p className="mb-3 text-[0.85rem] leading-[1.6] text-text-2 line-clamp-3">
                  {ep.summary}
                </p>
              )}
              {ep.guests.some((g) => g.guest.isPublic) && (
                <div className="text-[0.74rem] text-text-2">
                  {t("guests")}:{" "}
                  {ep.guests
                    .filter((g) => g.guest.isPublic)
                    .map((g) => g.guest.fullName)
                    .join(", ")}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
