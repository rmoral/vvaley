import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/public/JsonLd";
import { ProcessStep } from "@/components/public/ProcessStep";
import { ServiceCard } from "@/components/public/ServiceCard";
import { RevealMount } from "@/components/public/RevealMount";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { localizedUrls, ogLocale } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("services");
  const urls = localizedUrls("/servicios", locale as AppLocale);
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

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("services");

  const services = [
    {
      title: t("s1_title"),
      desc: t("s1_desc"),
      bullets: [t("s1_b1"), t("s1_b2"), t("s1_b3"), t("s1_b4")],
      forWho: t("s1_for"),
    },
    {
      title: t("s2_title"),
      desc: t("s2_desc"),
      bullets: [t("s2_b1"), t("s2_b2"), t("s2_b3"), t("s2_b4")],
      forWho: t("s2_for"),
    },
    {
      title: t("s3_title"),
      desc: t("s3_desc"),
      bullets: [t("s3_b1"), t("s3_b2"), t("s3_b3"), t("s3_b4")],
      forWho: t("s3_for"),
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Valira Valley",
    url: `${getSiteUrl()}/${locale}/servicios`,
    areaServed: "AD",
    description: t("meta_desc"),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: t("meta_title"),
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.title, description: s.desc },
      })),
    },
  };

  return (
    <main>
      <RevealMount />

      {/* Cabecera invertida: es la puerta de entrada comercial, y usa el
          mismo estrato oscuro que el teaser B2B de la home para que las
          dos zonas de negocio se lean como una sola. */}
      <header className="grain relative overflow-hidden bg-ink px-6 pb-16 pt-32 md:px-16">
        <div
          aria-hidden
          className="topo-rings pointer-events-none absolute -inset-y-1/3 left-[35%] -right-[10%]"
        />
        <div className="relative mx-auto max-w-5xl">
          <Eyebrow invert>{t("tag")}</Eyebrow>
          <h1 className="mt-6 font-display text-page font-black text-white text-pretty">
            {t("title_1")}{" "}
            <em className="font-bold italic text-river-2">{t("title_2")}</em>
          </h1>
          <p className="vv-reveal mt-6 max-w-[640px] text-[1.08rem] font-light leading-[1.75] text-ink-2">
            {t("lead")}
          </p>
        </div>
      </header>

      {/* Servicios */}
      <section className="px-6 py-20 md:px-16">
        <div className="vv-seq mx-auto flex max-w-5xl flex-col gap-6">
          {services.map((s, i) => (
            <ServiceCard
              key={s.title}
              num={String(i + 1).padStart(2, "0")}
              title={s.title}
              desc={s.desc}
              forWho={s.forWho}
              bullets={s.bullets}
              forLabel={t("for_label")}
              includesLabel={t("includes_label")}
            />
          ))}
        </div>
      </section>

      <Divider />

      {/* Proceso */}
      <section className="bg-bg2 px-6 py-20 md:px-16">
        <div className="mx-auto max-w-5xl">
          <SectionLabel>{t("process_tag")}</SectionLabel>
          <h2 className="vv-reveal mt-6 mb-10 font-display text-section font-bold text-text text-pretty">
            {t("process_title")}
          </h2>
          <div className="vv-seq grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <ProcessStep num="1" title={t("p1_title")} desc={t("p1_desc")} />
            <ProcessStep num="2" title={t("p2_title")} desc={t("p2_desc")} />
            <ProcessStep num="3" title={t("p3_title")} desc={t("p3_desc")} />
            <ProcessStep num="4" title={t("p4_title")} desc={t("p4_desc")} />
          </div>
        </div>
      </section>

      <Divider />

      {/* CTA */}
      <section className="px-6 py-20 md:px-16">
        <div className="vv-reveal mx-auto max-w-3xl text-center">
          <h2 className="mb-3 font-display text-section font-bold text-text text-pretty">
            {t("cta_title")}
          </h2>
          <p className="mb-8 text-[1rem] font-light leading-[1.7] text-text-2">
            {t("cta_sub")}
          </p>
          <Button href="/contacto?motivo=servicios" fullWidthMobile>
            {t("cta_button")}
          </Button>
        </div>
      </section>

      <JsonLd data={jsonLd} />
    </main>
  );
}
