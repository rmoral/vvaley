import type { Event, EventTranslation } from "@prisma/client";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type EventWithTr = Event & { translations: EventTranslation[] };

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

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-16">
      <h1 className="mb-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] font-black leading-[1.05] text-text">
        {t("title")}
      </h1>
      <p className="mb-12 max-w-[600px] text-[1.02rem] font-light leading-[1.7] text-text-2">
        {t("sub")}
      </p>

      {upcoming.length === 0 && past.length === 0 && (
        <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-3">
          {t("empty")}
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mb-14">
          <h2 className="mb-6 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-river">
            {t("upcoming")}
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {upcoming.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                locale={locale as AppLocale}
                t={t}
              />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-6 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-text-3">
            {t("past")}
          </h2>
          <ul className="flex flex-col gap-3">
            {past.map((event) => {
              const tr = pickTranslation(event, locale as AppLocale);
              if (!tr) return null;
              return (
                <li key={event.id}>
                  <Link
                    href={`/eventos/${event.slug}`}
                    className="flex flex-col gap-1 rounded-lg border border-bg3 bg-bg2 p-4 no-underline transition-colors hover:border-river-2 sm:flex-row sm:items-baseline sm:gap-6"
                  >
                    <time
                      className="shrink-0 text-[0.74rem] uppercase tracking-[0.1em] text-text-3 sm:w-32"
                      dateTime={event.startsAt.toISOString()}
                    >
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                      }).format(event.startsAt)}
                    </time>
                    <div className="font-medium text-text-2">{tr.title}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

function EventCard({
  event,
  locale,
  t,
}: {
  event: EventWithTr;
  locale: AppLocale;
  t: (k: string) => string;
}) {
  const tr = pickTranslation(event, locale);
  if (!tr) return null;

  const locationLabelKey =
    event.locationType === "ONLINE"
      ? "loc_online"
      : event.locationType === "HYBRID"
        ? "loc_hybrid"
        : "loc_inperson";

  return (
    <li>
      <Link
        href={`/eventos/${event.slug}`}
        className="group flex h-full flex-col gap-3 rounded-lg border border-bg3 bg-white p-6 no-underline transition-all hover:-translate-y-1 hover:border-river-2"
      >
        {event.coverImageUrl && (
          <div
            className="aspect-[16/9] w-full rounded-md bg-bg2 bg-cover bg-center"
            style={{ backgroundImage: `url(${event.coverImageUrl})` }}
            aria-hidden
          />
        )}
        <div className="text-[0.74rem] uppercase tracking-[0.1em] text-river">
          {new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(event.startsAt)}
        </div>
        <h3 className="font-display text-[1.25rem] font-bold leading-tight text-text group-hover:text-river">
          {tr.title}
        </h3>
        {tr.summary && (
          <p className="text-[0.9rem] leading-[1.55] text-text-2 line-clamp-3">
            {tr.summary}
          </p>
        )}
        <div className="mt-auto text-[0.78rem] text-text-3">
          {t(locationLabelKey)}
          {event.venueName && ` · ${event.venueName}`}
        </div>
      </Link>
    </li>
  );
}
