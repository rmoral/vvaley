import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { NewsletterInline } from "@/components/public/NewsletterInline";
import { GuestSocialLinks } from "@/components/public/GuestSocialLinks";
import { JsonLd } from "@/components/public/JsonLd";
import { localizedUrls, ogLocale } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const guest = await prisma.guest.findUnique({ where: { slug } });
  if (!guest || !guest.isPublic) return {};
  const urls = localizedUrls(`/invitados/${slug}`, locale as AppLocale);
  const description =
    guest.headline ??
    [guest.role, guest.company].filter(Boolean).join(" · ") ??
    undefined;
  return {
    title: guest.fullName,
    description,
    alternates: urls,
    openGraph: {
      type: "profile",
      url: urls.canonical,
      title: guest.fullName,
      description,
      images: guest.photoUrl ? [guest.photoUrl] : undefined,
      locale: ogLocale(locale as AppLocale),
    },
    twitter: {
      card: "summary",
      title: guest.fullName,
      description,
      images: guest.photoUrl ? [guest.photoUrl] : undefined,
    },
  };
}

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
  if (!guest || !guest.isPublic) notFound();

  const publishedEpisodes = guest.episodes.filter(
    (eg) => eg.episode.status === "PUBLISHED",
  );

  const url = localizedUrls(`/invitados/${slug}`, locale as AppLocale).canonical;
  const sameAs = [guest.website, guest.linkedin, guest.twitter, guest.instagram]
    .filter((v): v is string => Boolean(v));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": url,
    url,
    name: guest.fullName,
    jobTitle: guest.role ?? undefined,
    description: guest.headline ?? guest.bio ?? undefined,
    image: guest.photoUrl ?? undefined,
    email: guest.email ?? undefined,
    worksFor: guest.company
      ? { "@type": "Organization", name: guest.company }
      : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-16">
      <Link
        href="/invitados"
        className="mb-6 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← {t("back")}
      </Link>

      <header className="flex flex-col gap-6 md:flex-row md:items-start">
        {guest.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={guest.photoUrl}
            alt={guest.fullName}
            className="h-32 w-32 flex-shrink-0 rounded-full border border-bg3 object-cover md:h-44 md:w-44"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-full border border-bg3 bg-bg2 font-display text-[2.4rem] font-bold text-river md:h-44 md:w-44 md:text-[3rem]"
          >
            {guest.fullName
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("")}
          </div>
        )}

        <div className="flex-1">
          <h1 className="mb-2 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-[1.1] text-text">
            {guest.fullName}
          </h1>
          {(guest.role || guest.company) && (
            <p className="mb-3 text-[1.05rem] font-light text-text-2">
              {[guest.role, guest.company].filter(Boolean).join(" · ")}
            </p>
          )}
          {guest.headline && (
            <p className="mb-2 text-[0.95rem] italic text-river">
              {guest.headline}
            </p>
          )}
        </div>
      </header>

      <GuestSocialLinks guest={guest} variant="detail" />

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
          <p className="text-[0.9rem] text-text-2">{t("noEpisodes")}</p>
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

      <NewsletterInline source={`guest:${guest.slug}`} />
      <JsonLd data={jsonLd} />
    </main>
  );
}
