import { EventLocationType } from "@prisma/client";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { EventCard } from "@/components/public/EventCard";
import { RevealMount } from "@/components/public/RevealMount";
import { ListHeader } from "@/components/public/ListHeader";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const LOCATION_KEY: Record<EventLocationType, string> = {
  ONLINE: "loc_online",
  INPERSON: "loc_inperson",
  HYBRID: "loc_hybrid",
};

export default async function EventsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("eventsList");

  const now = new Date();
  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({
      where: { status: "PUBLISHED", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      include: { translations: true },
    }),
    prisma.event.findMany({
      where: {
        OR: [
          { status: "PUBLISHED", startsAt: { lt: now } },
          { status: "COMPLETED" },
        ],
      },
      orderBy: { startsAt: "desc" },
      include: { translations: true },
      take: 12,
    }),
  ]);

  const shape = (e: (typeof upcoming)[number]) => {
    const tr = pickTranslation(e, locale as AppLocale);
    if (!tr) return null;
    return {
      event: {
        slug: e.slug,
        title: tr.title,
        summary: tr.summary,
        startsAt: e.startsAt,
        coverImageUrl: e.coverImageUrl,
        venueName: e.venueName,
      },
      locationLabel: t(LOCATION_KEY[e.locationType]),
    };
  };

  const next = upcoming.map(shape).filter((x): x is NonNullable<typeof x> => x !== null);
  const older = past.map(shape).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <main>
      <RevealMount />
      <ListHeader title={t("title")} sub={t("sub")} />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:px-16">
        {next.length === 0 && older.length === 0 && (
          <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-2">
            {t("empty")}
          </div>
        )}

        {next.length > 0 && (
          <section className="mb-16">
            <h2 className="mb-6 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-river">
              {t("upcoming")}
            </h2>
            <ul className="vv-seq grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {next.map((x) => (
                <li key={x.event.slug}>
                  <EventCard
                    event={x.event}
                    locale={locale}
                    locationLabel={x.locationLabel}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {older.length > 0 && (
          <section>
            <h2 className="mb-6 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-text-2">
              {t("past")}
            </h2>
            <ul className="flex flex-col gap-3">
              {older.map((x) => (
                <li key={x.event.slug}>
                  <EventCard
                    event={x.event}
                    locale={locale}
                    locationLabel={x.locationLabel}
                    variant="past"
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
