import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { renderMarkdown } from "@/lib/markdown";
import { registrationGate, requiresOnlinePayment } from "@/lib/event-registration";
import { formatearPrecio } from "@/lib/event-series";
import { DetailShell, Prose } from "@/components/public/DetailShell";
import { EventGate } from "@/components/public/EventGate";
import { JsonLd } from "@/components/public/JsonLd";
import { EventPresenters } from "@/components/public/EventPresenters";
import { ShareEvent } from "@/components/public/ShareEvent";
import { getSiteUrl } from "@/lib/site-url";
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
  // Sin portada, la imagen compuesta del evento: un enlace compartido sin
  // imagen apenas se ve en WhatsApp o LinkedIn.
  const image = event.coverImageUrl ?? `${getSiteUrl()}/${locale}/eventos/${slug}/og`;
  return {
    title: tr.title,
    description: tr.summary ?? undefined,
    alternates: urls,
    openGraph: {
      type: "article",
      url: urls.canonical,
      title: tr.title,
      description: tr.summary ?? undefined,
      images: [image],
      locale: ogLocale(locale as AppLocale),
    },
    twitter: {
      card: "summary_large_image",
      title: tr.title,
      description: tr.summary ?? undefined,
      images: [image],
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
      presenters: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: { translations: true },
      },
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

  const onlinePayment = requiresOnlinePayment(event);
  const priceLabel = onlinePayment ? formatearPrecio(event.priceCents, locale) : null;

  const timeZone = event.timezone || "Europe/Andorra";
  const presenters = event.presenters.map((p) => ({
    id: p.id,
    name: p.name,
    logoUrl: p.logoUrl,
    url: p.url,
    description: pickTranslation(p, locale as AppLocale)?.description ?? null,
  }));
  // Solo se invita a compartir lo que todavía está por llegar.
  const shareable = event.status === "PUBLISHED" && event.startsAt.getTime() > Date.now();
  const shareText = t("share_text", {
    title: tr.title,
    date: fmt.dateTime(event.startsAt, { dateStyle: "long", timeZone }),
  });

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
      // En la zona del evento, como los correos: sin ella sale la hora del
      // servidor (UTC en producción si la máquina no está en hora de Andorra).
      eyebrow={fmt.dateTime(event.startsAt, {
        dateStyle: "full",
        timeStyle: "short",
        timeZone,
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
          {/* Solo si el evento cuesta algo: gratuito o sin precio, no se dice nada. */}
          {event.priceCents != null && event.priceCents > 0 ? (
            <span>
              {t("price_meta", { price: formatearPrecio(event.priceCents, locale as AppLocale) ?? "" })}
            </span>
          ) : null}
        </>
      }
      aside={
        <EventGate
          slug={event.slug}
          open={gate.open}
          reason={gate.open ? undefined : gate.reason}
          seatsLeft={seatsLeft}
          priceLabel={priceLabel}
        />
      }
      footer={<JsonLd data={jsonLd} />}
    >
      {html ? <Prose html={html} /> : null}
      <EventPresenters presenters={presenters} />
      {shareable ? <ShareEvent url={url} text={shareText} campaign={`evento-${slug}`} /> : null}
    </DetailShell>
  );
}
