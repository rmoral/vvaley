import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { GuestCard } from "@/components/public/GuestCard";
import { GuestSocialLinks } from "@/components/public/GuestSocialLinks";
import { RevealMount } from "@/components/public/RevealMount";
import { ListHeader } from "@/components/public/ListHeader";

export const dynamic = "force-dynamic";

export default async function GuestsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guestsList");

  const guests = await prisma.guest.findMany({
    where: { isPublic: true },
    orderBy: { fullName: "asc" },
    include: {
      _count: {
        select: { episodes: { where: { episode: { status: "PUBLISHED" } } } },
      },
    },
  });

  return (
    <main>
      <RevealMount />
      <ListHeader title={t("title")} sub={t("sub")} />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:px-16">
        {guests.length === 0 ? (
          <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-2">
            {t("empty")}
          </div>
        ) : (
          <ul className="vv-seq grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guests.map((g) => (
              <li key={g.id}>
                <GuestCard
                  guest={g}
                  episodesLabel={
                    g._count.episodes > 0
                      ? t("episodeCount", { count: g._count.episodes })
                      : t("noEpisodesYet")
                  }
                >
                  <GuestSocialLinks guest={g} variant="compact" />
                </GuestCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
