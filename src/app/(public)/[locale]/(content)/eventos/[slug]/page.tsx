import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { renderMarkdown } from "@/lib/markdown";
import { registrationGate } from "@/lib/event-registration";
import { DetailShell, Prose } from "@/components/public/DetailShell";
import { EventGate } from "@/components/public/EventGate";
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
  const fmt = await getFormatter();

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

  const locationCopy =
    event.locationType === "ONLINE"
      ? t("loc_online")
      : event.locationType === "HYBRID"
        ? t("loc_hybrid")
        : t("loc_inperson");

  return (
    <DetailShell
      backHref="/eventos"
      backLabel={t("back")}
      eyebrow={fmt.dateTime(event.startsAt, {
        dateStyle: "full",
        timeStyle: "short",
      })}
      title={tr.title}
      subtitle={tr.summary}
      coverUrl={event.coverImageUrl ?? undefined}
      notice={isFallback ? t("fallback_notice") : undefined}
      meta={
        <>
          <span>{locationCopy}</span>
          {event.venueName ? <span>{event.venueName}</span> : null}
          {event.venueAddress ? <span>{event.venueAddress}</span> : null}
        </>
      }
      aside={
        <EventGate
          slug={event.slug}
          open={gate.open}
          reason={gate.open ? undefined : gate.reason}
          seatsLeft={seatsLeft}
        />
      }
      footer={<JsonLd data={jsonLd} />}
    >
      {html ? <Prose html={html} /> : null}
    </DetailShell>
  );
}
