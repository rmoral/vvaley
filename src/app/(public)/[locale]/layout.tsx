import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { routing, type AppLocale } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/site-url";
import { localizedUrls, ogAlternateLocales, ogLocale } from "@/lib/seo";

function isAppLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}
import "../../../styles/globals.css";
import { Analytics } from "@/components/public/Analytics";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/GoogleTagManager";
import { SiteNav } from "@/components/public/SiteNav";
import { SiteFooter } from "@/components/public/SiteFooter";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: AppLocale = isAppLocale(locale) ? locale : routing.defaultLocale;
  const urls = localizedUrls("", loc);
  const title = "Valira Valley — Del río Valira al Valle de la Innovación";
  const description =
    "Podcast sobre empresa, economía, emprendimiento y tecnología desde Andorra. Perspectiva andorrana, mirada global, IA como hilo conductor.";
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: title, template: "%s · Valira Valley" },
    description,
    alternates: urls,
    openGraph: {
      type: "website",
      url: urls.canonical,
      siteName: "Valira Valley",
      title,
      description,
      locale: ogLocale(loc),
      alternateLocale: ogAlternateLocales(loc),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Render every locale on demand. Skip generateStaticParams so the build
// doesn't prerender the [locale] tree for each language — that's where
// memory peaked enough to OOM small EC2 instances. The /[locale] segment
// is still validated at runtime by isAppLocale() below.
export const dynamic = "force-dynamic";

export default async function PublicLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${fraunces.variable} ${jakarta.variable}`}>
      <body>
        <GoogleTagManager />
        <GoogleTagManagerNoScript />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteNav locale={locale} />
          {children}
          <SiteFooter />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
