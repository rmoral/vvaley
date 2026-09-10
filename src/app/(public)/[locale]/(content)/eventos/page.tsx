import { EventLocationType } from "@prisma/client";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { EventCard } from "@/components/public/EventCard";
import { RevealMount } from "@/components/public/RevealMount";
import { ListHeader } from "@/components/public/ListHeader";
import { Link } from "@/i18n/navigation";
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
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");
  const tm = await getTranslations("meetup");

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
      <ListHeader
        eyebrow={tn("events")}
        altitude={tc("cota_03")}
        title={t("title")}
        sub={t("sub")}
      />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:px-16">
        {/* El meetup es lo recurrente y tiene página propia. Quien llega al
            listado buscando "eventos" debe encontrarlo aquí: es la única vía
            de descubrimiento dentro del sitio, porque /meetup no está en la
            barra de navegación. */}
        <Link
          href="/meetup"
          className="vv-reveal group mb-12 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-river/25 bg-river/[0.04] px-6 py-5 no-underline transition-colors duration-150 hover:bg-river/[0.08]"
        >
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-river">
              {tm("eyebrow")}
            </p>
            <p className="mt-1 font-display text-[1.15rem] font-bold text-text">
              {tm("meta_title")}
            </p>
          </div>
          <span className="flex items-center gap-2 text-[0.88rem] font-semibold text-river transition-transform duration-250 ease-out-soft group-hover:translate-x-1">
            {tm("cta_primary")}
            <span aria-hidden>→</span>
          </span>
        </Link>

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
