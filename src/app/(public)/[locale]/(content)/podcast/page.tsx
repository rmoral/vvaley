import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { EpisodeCard } from "@/components/public/EpisodeCard";
import { RevealMount } from "@/components/public/RevealMount";
import { ListHeader } from "@/components/public/ListHeader";

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
    include: {
      guests: {
        orderBy: { position: "asc" },
        include: { guest: { select: { fullName: true } } },
      },
    },
  });

  return (
    <main>
      <RevealMount />
      <ListHeader title={t("title")} sub={t("sub")} />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:px-16">
        {episodes.length === 0 ? (
          <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-2">
            {t("empty")}
          </div>
        ) : (
          <ul className="vv-seq grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {episodes.map((ep, i) => (
              <li key={ep.id}>
                <EpisodeCard
                  ep={{
                    slug: ep.slug,
                    number: ep.number,
                    title: ep.title,
                    summary: ep.summary,
                    coverImageUrl: ep.coverImageUrl,
                    durationSec: ep.durationSec,
                    publishedAt: ep.publishedAt,
                    guests: ep.guests.map((g) => g.guest.fullName).join(", "),
                  }}
                  locale={locale}
                  priority={i === 0}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
