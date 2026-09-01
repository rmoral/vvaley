import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/public/ContactForm";
import { localizedUrls, ogLocale } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const urls = localizedUrls("/contacto", locale as AppLocale);
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    alternates: urls,
    openGraph: {
      type: "website",
      url: urls.canonical,
      title: t("meta_title"),
      description: t("meta_desc"),
      locale: ogLocale(locale as AppLocale),
    },
  };
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { locale } = await params;
  const { motivo } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-16">
      <div className="mb-5 inline-block rounded-[2px] border border-[rgba(46,139,143,0.25)] bg-[rgba(46,139,143,0.04)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-river">
        {t("tag")}
      </div>
      <h1 className="mb-4 font-display text-[clamp(2.2rem,4.5vw,3.2rem)] font-black leading-[1.08] text-text">
        {t("title")}
      </h1>
      <p className="mb-12 max-w-[560px] text-[1.05rem] font-light leading-[1.75] text-text-2">
        {t("sub")}
      </p>

      <div className="rounded-lg border border-bg3 bg-white p-7 md:p-9">
        <ContactForm initialTopic={motivo} />
      </div>
    </main>
  );
}
