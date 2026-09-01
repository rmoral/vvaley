import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
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

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-16">
      <Link
        href="/podcast"
        className="mb-6 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← {t("back")}
      </Link>

      {ep.number !== null && (
        <div className="mb-2 font-display text-[2rem] font-black leading-none text-bg3">
          {String(ep.number).padStart(2, "0")}
        </div>
      )}
      <h1 className="mb-4 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-[1.1] text-text">
        {ep.title}
      </h1>
      {ep.subtitle && (
        <p className="mb-6 text-[1.05rem] font-light leading-[1.6] text-text-2">
          {ep.subtitle}
        </p>
      )}

      <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.78rem] text-text-2">
        {ep.publishedAt && (
          <span>
            {t("publishedOn")}{" "}
            {fmt.dateTime(ep.publishedAt, { dateStyle: "long" })}
          </span>
        )}
        {ep.durationSec !== null && ep.durationSec !== undefined && (
          <span>
            {t("duration")}: {Math.round(ep.durationSec / 60)} min
          </span>
        )}
      </div>

      {ep.audioUrl && (
        <audio controls className="mb-8 w-full" src={ep.audioUrl} />
      )}

      {ep.summary && (
        <p className="mb-8 text-[1rem] leading-[1.75] text-text-2">{ep.summary}</p>
      )}

      {ep.showNotes && (
        <div className="prose prose-neutral mb-12 max-w-none whitespace-pre-wrap text-[0.95rem] leading-[1.75] text-text-2">
          {ep.showNotes}
        </div>
      )}

      {ep.guests.filter(({ guest }) => guest.isPublic).length > 0 && (
        <section className="border-t border-bg3 pt-10">
          <h2 className="mb-6 font-display text-[1.4rem] font-bold text-text">
            {t("guests")}
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ep.guests
              .filter(({ guest }) => guest.isPublic)
              .map(({ guest }) => (
                <li key={guest.id}>
                  <Link
                    href={`/invitados/${guest.slug}`}
                    className="block rounded-lg border border-bg3 bg-white p-4 no-underline transition-colors hover:border-river-2"
                  >
                    <div className="font-semibold text-text">{guest.fullName}</div>
                    {(guest.role || guest.company) && (
                      <div className="text-[0.82rem] text-text-2">
                        {[guest.role, guest.company].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}

      <NewsletterInline source={`episode:${ep.slug}`} variant="episode" />
      <JsonLd data={jsonLd} />
    </main>
  );
}
