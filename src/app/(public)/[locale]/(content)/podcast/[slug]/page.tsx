import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { renderMarkdown } from "@/lib/markdown";
import { DetailShell, Prose } from "@/components/public/DetailShell";
import { EpisodePlayer } from "@/components/public/EpisodePlayer";
import { NewsletterInline } from "@/components/public/NewsletterInline";
import { JsonLd } from "@/components/public/JsonLd";
import { Button } from "@/components/ui/Button";
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
    select: { title: true, summary: true, coverImageUrl: true, status: true, publishedAt: true },
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
      images: ep.coverImageUrl ? [ep.coverImageUrl] : undefined,
      locale: ogLocale(locale as AppLocale),
      publishedTime: ep.publishedAt?.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: ep.title,
      description: ep.summary ?? undefined,
      images: ep.coverImageUrl ? [ep.coverImageUrl] : undefined,
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
  const tl = await getTranslations("podcastList");
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

  // Plataformas externas. Son marcas, no se traducen. Se usan como respaldo
  // cuando el episodio no tiene audio propio subido, y como complemento
  // cuando sí lo tiene.
  const platforms = [
    { href: ep.spotifyUrl, label: "Spotify" },
    { href: ep.appleUrl, label: "Apple Podcasts" },
    { href: ep.youtubeUrl, label: "YouTube" },
  ].filter((p): p is { href: string; label: string } => Boolean(p.href));

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
          {/* Con audio propio la duración la lleva el reproductor: aquí se
              omite para no decirla dos veces en la misma pantalla. */}
          {duration && !ep.audioUrl ? (
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
      <ListenBlock
        audioUrl={ep.audioUrl}
        label={tl("listen")}
        duration={duration}
        platforms={platforms}
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

// Reproductor + plataformas. Con audio propio manda <EpisodePlayer> y las
// plataformas quedan como fila secundaria debajo. Sin audio, las plataformas
// heredan la caja para que el bloque de escucha no desaparezca.
function ListenBlock({
  audioUrl,
  label,
  duration,
  platforms,
}: {
  audioUrl: string | null;
  label: string;
  duration?: string;
  platforms: { href: string; label: string }[];
}) {
  if (!audioUrl && platforms.length === 0) return null;

  const links = (
    <div className="flex flex-wrap gap-3">
      {platforms.map((p) => (
        <Button key={p.href} href={p.href} variant="secondary" size="sm">
          {p.label}
        </Button>
      ))}
    </div>
  );

  if (!audioUrl) {
    return (
      <div className="rounded-lg border border-bg3 bg-white p-5">
        <p className="mb-3 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-river">
          {label}
        </p>
        {links}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <EpisodePlayer src={audioUrl} label={label} duration={duration} />
      {platforms.length > 0 ? links : null}
    </div>
  );
}
