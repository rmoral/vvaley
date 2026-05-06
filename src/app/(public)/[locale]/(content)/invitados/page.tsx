import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { GuestSocialLinks } from "@/components/public/GuestSocialLinks";

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
      _count: { select: { episodes: { where: { episode: { status: "PUBLISHED" } } } } },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-16">
      <h1 className="mb-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] font-black leading-[1.05] text-text">
        {t("title")}
      </h1>
      <p className="mb-12 max-w-[640px] text-[1.02rem] font-light leading-[1.7] text-text-2">
        {t("sub")}
      </p>

      {guests.length === 0 && (
        <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-3">
          {t("empty")}
        </div>
      )}

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {guests.map((g) => {
          const hasSocials = Boolean(
            g.website || g.linkedin || g.twitter || g.instagram || g.email,
          );
          return (
          <li
            key={g.id}
            className="group flex h-full flex-col rounded-lg border border-bg3 bg-white transition-all hover:-translate-y-1 hover:border-river-2"
          >
            <Link
              href={`/invitados/${g.slug}`}
              className="flex flex-1 flex-col gap-3 p-5 no-underline"
            >
              {g.photoUrl ? (
                <div
                  className="aspect-square w-20 rounded-full bg-bg2 bg-cover bg-center"
                  style={{ backgroundImage: `url(${g.photoUrl})` }}
                  aria-hidden
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg2 font-display text-[1.6rem] font-bold text-river">
                  {g.fullName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? "")
                    .join("")}
                </div>
              )}
              <h2 className="font-display text-[1.15rem] font-bold leading-tight text-text group-hover:text-river">
                {g.fullName}
              </h2>
              {(g.role || g.company) && (
                <p className="text-[0.85rem] leading-[1.5] text-text-2">
                  {[g.role, g.company].filter(Boolean).join(" · ")}
                </p>
              )}
              {g.headline && (
                <p className="text-[0.82rem] italic leading-[1.5] text-text-3 line-clamp-2">
                  {g.headline}
                </p>
              )}
              <div className="mt-auto pt-2 text-[0.74rem] uppercase tracking-[0.1em] text-text-3">
                {g._count.episodes > 0
                  ? t("episodeCount", { count: g._count.episodes })
                  : t("noEpisodesYet")}
              </div>
            </Link>
            {hasSocials && (
              <div className="border-t border-bg3 px-5 py-3">
                <GuestSocialLinks guest={g} variant="compact" />
              </div>
            )}
          </li>
          );
        })}
      </ul>
    </main>
  );
}
