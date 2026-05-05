import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GuestPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guest");

  const guest = await prisma.guest.findUnique({
    where: { slug },
    include: {
      episodes: {
        include: { episode: true },
        orderBy: { episode: { publishedAt: "desc" } },
      },
    },
  });
  if (!guest) notFound();

  const publishedEpisodes = guest.episodes.filter(
    (eg) => eg.episode.status === "PUBLISHED",
  );

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-16">
      <Link
        href="/podcast"
        className="mb-6 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← {t("back")}
      </Link>

      <h1 className="mb-2 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-[1.1] text-text">
        {guest.fullName}
      </h1>
      {(guest.role || guest.company) && (
        <p className="mb-4 text-[1.05rem] font-light text-text-2">
          {[guest.role, guest.company].filter(Boolean).join(" · ")}
        </p>
      )}
      {guest.headline && (
        <p className="mb-6 text-[0.95rem] italic text-river">{guest.headline}</p>
      )}
      {guest.bio && (
        <p className="mb-10 whitespace-pre-wrap text-[1rem] leading-[1.75] text-text-2">
          {guest.bio}
        </p>
      )}

      <section className="border-t border-bg3 pt-10">
        <h2 className="mb-6 font-display text-[1.4rem] font-bold text-text">
          {t("episodes")}
        </h2>
        {publishedEpisodes.length === 0 ? (
          <p className="text-[0.9rem] text-text-3">{t("noEpisodes")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {publishedEpisodes.map(({ episode }) => (
              <li key={episode.id}>
                <Link
                  href={`/podcast/${episode.slug}`}
                  className="block rounded-lg border border-bg3 bg-white p-4 no-underline transition-colors hover:border-river-2"
                >
                  <div className="text-[0.78rem] uppercase tracking-[0.1em] text-river">
                    {episode.number !== null
                      ? String(episode.number).padStart(2, "0")
                      : ""}
                  </div>
                  <div className="font-semibold text-text">{episode.title}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
