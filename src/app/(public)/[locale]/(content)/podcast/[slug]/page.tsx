import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { renderMarkdown } from "@/lib/markdown";
import { DetailShell, Prose } from "@/components/public/DetailShell";
import { EpisodeListen } from "@/components/public/EpisodeListen";
import { NewsletterInline } from "@/components/public/NewsletterInline";
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
  const ep = await prisma.episode.findUnique({
    where: { slug },
    select: { title: true, summary: true, status: true, publishedAt: true },
  });
  if (!ep || ep.status !== "PUBLISHED") return {};
  const urls = localizedUrls(`/podcast/${slug}`, locale as AppLocale);
  return {
    title: ep.title,
    description: ep.summary ?? undefined,
    alternates: urls,
    openGraph: {
      type: "article",
      url: urls.canonical,
      title: ep.title,
      description: ep.summary ?? undefined,
      locale: ogLocale(locale as AppLocale),
      publishedTime: ep.publishedAt?.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: ep.title,
      description: ep.summary ?? undefined,
    },
  };
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("episode");
  const fmt = await getFormatter();

  const ep = await prisma.episode.findUnique({
    where: { slug },
    include: { guests: { orderBy: { position: "asc" }, include: { guest: true } } },
  });
  if (!ep || ep.status !== "PUBLISHED") notFound();

  const url = localizedUrls(`/podcast/${slug}`, locale as AppLocale).canonical;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    "@id": url,
    url,
    name: ep.title,
    description: ep.summary ?? undefined,
    datePublished: ep.publishedAt?.toISOString(),
    image: ep.coverImageUrl ?? undefined,
    associatedMedia: ep.audioUrl
      ? { "@type": "MediaObject", contentUrl: ep.audioUrl, encodingFormat: "audio/mpeg" }
      : undefined,
    timeRequired: ep.durationSec
      ? `PT${Math.round(ep.durationSec / 60)}M`
      : undefined,
    partOfSeries: { "@type": "PodcastSeries", name: "Valira Valley" },
    actor: ep.guests
      .filter(({ guest }) => guest.isPublic)
      .map(({ guest }) => ({
        "@type": "Person",
        name: guest.fullName,
        jobTitle: guest.role ?? undefined,
        worksFor: guest.company
          ? { "@type": "Organization", name: guest.company }
          : undefined,
      })),
  };

  const guests = ep.guests.filter(({ guest }) => guest.isPublic);
  const duration =
    ep.durationSec != null ? `${Math.round(ep.durationSec / 60)} min` : undefined;

  // <EpisodeListen> ya lleva la duración en su cabecera, y devuelve null si no
  // hay ni audio ni plataformas. Solo entonces la duración vuelve al encabezado.
  const hasListen = Boolean(
    ep.audioUrl || ep.spotifyUrl || ep.appleUrl || ep.youtubeUrl,
  );

  return (
    <DetailShell
      backHref="/podcast"
      backLabel={t("back")}
      numeral={ep.number !== null ? String(ep.number).padStart(2, "0") : undefined}
      title={ep.title}
      subtitle={ep.subtitle}
      coverUrl={ep.coverImageUrl ?? undefined}
      meta={
        <>
          {ep.publishedAt ? (
            <span>
              {t("publishedOn")} {fmt.dateTime(ep.publishedAt, { dateStyle: "long" })}
            </span>
          ) : null}
          {duration && !hasListen ? (
            <span>
              {t("duration")}: {duration}
            </span>
          ) : null}
        </>
      }
      aside={
        guests.length > 0 ? (
          <>
            <h2 className="mb-6 font-display text-sub font-bold text-text">
              {t("guests")}
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {guests.map(({ guest }) => (
                <li key={guest.id}>
                  <Link
                    href={`/invitados/${guest.slug}`}
                    className="block h-full rounded-lg border border-bg3 bg-white p-4 no-underline transition-all duration-250 ease-out-soft hover:-translate-y-0.5 hover:border-river-2 hover:shadow-lift"
                  >
                    <p className="font-semibold text-text">{guest.fullName}</p>
                    {guest.role || guest.company ? (
                      <p className="mt-0.5 text-[0.82rem] text-text-2">
                        {[guest.role, guest.company].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : undefined
      }
      footer={
        <>
          <NewsletterInline source={`episode:${ep.slug}`} variant="episode" />
          <JsonLd data={jsonLd} />
        </>
      }
    >
      <EpisodeListen
        audioUrl={ep.audioUrl}
        spotifyUrl={ep.spotifyUrl}
        appleUrl={ep.appleUrl}
        youtubeUrl={ep.youtubeUrl}
        label={t("listen")}
        duration={duration}
        platformsLabel={t("listen_on")}
      />

      {ep.summary ? (
        <p className="mt-8 text-[1.02rem] leading-[1.75] text-text-2">{ep.summary}</p>
      ) : null}

      {ep.showNotes ? (
        <div className="mt-8">
          <Prose html={renderMarkdown(ep.showNotes)} />
        </div>
      ) : null}
    </DetailShell>
  );
}
