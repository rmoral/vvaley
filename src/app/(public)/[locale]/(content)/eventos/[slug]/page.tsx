import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { renderMarkdown } from "@/lib/markdown";
import { registrationGate } from "@/lib/event-registration";
import { EventRegistrationForm } from "@/components/public/EventRegistrationForm";
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
  const event = await prisma.event.findUnique({
    where: { slug },
    include: { translations: true },
  });
  if (!event || (event.status !== "PUBLISHED" && event.status !== "COMPLETED")) return {};
  const tr = pickTranslation(event, locale as AppLocale);
  if (!tr) return {};
  const urls = localizedUrls(`/eventos/${slug}`, locale as AppLocale);
  return {
    title: tr.title,
    description: tr.summary ?? undefined,
    alternates: urls,
    openGraph: {
      type: "article",
      url: urls.canonical,
      title: tr.title,
      description: tr.summary ?? undefined,
      images: event.coverImageUrl ? [event.coverImageUrl] : undefined,
      locale: ogLocale(locale as AppLocale),
    },
    twitter: {
      card: "summary_large_image",
      title: tr.title,
      description: tr.summary ?? undefined,
      images: event.coverImageUrl ? [event.coverImageUrl] : undefined,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("eventDetail");

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      translations: true,
      _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
    },
  });
  if (!event || (event.status !== "PUBLISHED" && event.status !== "COMPLETED")) {
    notFound();
  }

  const tr = pickTranslation(event, locale as AppLocale);
  if (!tr) notFound();

  const html = tr.description ? renderMarkdown(tr.description) : "";
  const isFallback = tr.locale !== locale;
  const url = localizedUrls(`/eventos/${slug}`, locale as AppLocale).canonical;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": url,
    url,
    name: tr.title,
    description: tr.summary ?? undefined,
    image: event.coverImageUrl ?? undefined,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt?.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode:
      event.locationType === "ONLINE"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : event.locationType === "HYBRID"
          ? "https://schema.org/MixedEventAttendanceMode"
          : "https://schema.org/OfflineEventAttendanceMode",
    location:
      event.locationType === "ONLINE"
        ? {
            "@type": "VirtualLocation",
            url: event.onlineUrl ?? url,
          }
        : {
            "@type": "Place",
            name: event.venueName ?? "Andorra",
            address: event.venueAddress ?? undefined,
          },
    organizer: { "@type": "Organization", name: "Valira Valley" },
  };

  const gate = registrationGate(event);
  const seatsLeft =
    event.capacity != null
      ? Math.max(0, event.capacity - event._count.registrations)
      : null;

  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
  });

  const locationCopy =
    event.locationType === "ONLINE"
      ? t("loc_online")
      : event.locationType === "HYBRID"
        ? t("loc_hybrid")
        : t("loc_inperson");

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-16">
      <Link
        href="/eventos"
        className="mb-6 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← {t("back")}
      </Link>

      <div className="mb-3 text-[0.74rem] uppercase tracking-[0.18em] text-river">
        {dateFmt.format(event.startsAt)}
      </div>
      <h1 className="mb-4 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-[1.1] text-text">
        {tr.title}
      </h1>
      {tr.summary && (
        <p className="mb-6 text-[1.05rem] font-light leading-[1.6] text-text-2">
          {tr.summary}
        </p>
      )}

      <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.85rem] text-text-2">
        <span>📍 {locationCopy}</span>
        {event.venueName && <span>{event.venueName}</span>}
        {event.venueAddress && (
          <span className="text-text-2">{event.venueAddress}</span>
        )}
      </div>

      {event.coverImageUrl && (
        <div
          className="mb-10 aspect-[16/9] w-full rounded-lg bg-bg2 bg-cover bg-center"
          style={{ backgroundImage: `url(${event.coverImageUrl})` }}
          aria-hidden
        />
      )}

      {isFallback && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[0.85rem] text-amber-800">
          {t("fallback_notice")}
        </div>
      )}

      {html && (
        <article
          className="prose prose-neutral max-w-none text-[1rem] leading-[1.75] text-text-2 [&_a]:text-river [&_a:hover]:text-text [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-[1.5rem] [&_h2]:font-bold [&_h2]:text-text [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-[1.2rem] [&_h3]:font-semibold [&_h3]:text-text [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      <section className="mt-12 border-t border-bg3 pt-10">
        {gate.open ? (
          <>
            {seatsLeft != null && (
              <p className="mb-4 text-[0.82rem] text-text-2">
                {seatsLeft === 0
                  ? t("seats_full")
                  : t("seats_left", { count: seatsLeft })}
              </p>
            )}
            <EventRegistrationForm slug={event.slug} />
          </>
        ) : (
          <div className="rounded-lg border border-bg3 bg-bg2 p-6 text-center text-[0.92rem] text-text-2">
            {gate.reason === "not_open_yet" && t("gate_not_open_yet")}
            {gate.reason === "closed" && t("gate_closed")}
            {gate.reason === "event_passed" && t("gate_event_passed")}
            {gate.reason === "not_published" && t("gate_event_passed")}
          </div>
        )}
      </section>
      <JsonLd data={jsonLd} />
    </main>
  );
}
