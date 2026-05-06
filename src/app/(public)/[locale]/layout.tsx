import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { routing, type AppLocale } from "@/i18n/routing";

function isAppLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}
import "../../../styles/globals.css";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";

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

export const metadata: Metadata = {
  title: "Valira Valley — Del río Valira al Valle de la Innovación",
  description:
    "Podcast sobre empresa, economía, emprendimiento y tecnología desde Andorra.",
};

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
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PublicNav locale={locale} />
          {children}
          <PublicFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
