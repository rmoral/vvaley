import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { SERIES } from "@/lib/event-series";
import { SeriesLanding, seriesLandingMetadata } from "@/components/public/SeriesLanding";

// Landing del café quincenal de IA. Misma plantilla que /meetup con otro
// bloque de textos y el estrato "river" en la cabecera. Ver LANDINGS en
// @/lib/event-series.

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  return seriesLandingMetadata(locale, SERIES.CAFE_IA);
}

export default async function CafeIaLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SeriesLanding locale={locale} series={SERIES.CAFE_IA} />;
}
