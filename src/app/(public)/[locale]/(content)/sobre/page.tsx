import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { FormatCard } from "@/components/public/FormatCard";
import { NameEquation } from "@/components/public/NameEquation";
import { RevealMount } from "@/components/public/RevealMount";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionLabel } from "@/components/ui/SectionLabel";
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
  const t = await getTranslations("about");
  const urls = localizedUrls("/sobre", locale as AppLocale);
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

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  const formats = [
    { title: t("f1_title"), desc: t("f1_desc") },
    { title: t("f2_title"), desc: t("f2_desc") },
    { title: t("f3_title"), desc: t("f3_desc") },
    { title: t("f4_title"), desc: t("f4_desc") },
    { title: t("f5_title"), desc: t("f5_desc") },
  ];

  return (
    <main>
      <RevealMount />

      {/* Intro. Mismo grano y anillos que el hero de la home, pero sobre
          fondo claro: /sobre es la página editorial, no la comercial. */}
      <header className="grain relative overflow-hidden px-6 pb-16 pt-32 md:px-16">
        <div
          aria-hidden
          className="topo-rings pointer-events-none absolute -inset-y-1/2 -right-[15%] left-[45%]"
        />
        <div className="relative mx-auto max-w-4xl">
          <Eyebrow>{t("tag")}</Eyebrow>
          <h1 className="mt-6 font-display text-page font-black text-text text-pretty">
            {t("title_1")}
            <br />
            <em className="font-bold italic text-river">{t("title_2")}</em>
          </h1>
          <p className="vv-reveal mt-6 max-w-[640px] text-[1.08rem] font-light leading-[1.75] text-text-2">
            {t("lead")}
          </p>
        </div>
      </header>

      <Divider />

      {/* Qué hacemos */}
      <section className="bg-white px-6 py-20 md:px-16">
        <div className="mx-auto max-w-4xl">
          <SectionLabel>{t("mission_tag")}</SectionLabel>
          <h2 className="vv-reveal mb-6 mt-6 font-display text-section font-bold text-text text-pretty">
            {t("mission_title")}
          </h2>
          <div className="vv-seq flex max-w-[640px] flex-col gap-4 text-[1rem] leading-[1.8] text-text-2">
            <p>{t("mission_p1")}</p>
            <p>{t("mission_p2")}</p>
            <p>{t("mission_p3")}</p>
          </div>
        </div>
      </section>

      <Divider />

      {/* Formatos */}
      <section className="px-6 py-20 md:px-16">
        <div className="mx-auto max-w-5xl">
          <SectionLabel>{t("formats_tag")}</SectionLabel>
          <h2 className="vv-reveal mb-10 mt-6 font-display text-section font-bold text-text text-pretty">
            {t("formats_title")}
          </h2>
          <div className="vv-seq grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {formats.map((f, i) => (
              <FormatCard
                key={f.title}
                num={String(i + 1).padStart(2, "0")}
                title={f.title}
                desc={f.desc}
              />
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* Por qué Andorra */}
      <section className="bg-white px-6 py-20 md:px-16">
        <div className="mx-auto max-w-4xl">
          <SectionLabel>{t("andorra_tag")}</SectionLabel>
          <h2 className="vv-reveal mb-6 mt-6 font-display text-section font-bold text-text text-pretty">
            {t("andorra_title")}
          </h2>
          <div className="vv-seq flex max-w-[640px] flex-col gap-4 text-[1rem] leading-[1.8] text-text-2">
            <p>{t("andorra_p1")}</p>
            <p>{t("andorra_p2")}</p>
          </div>
        </div>
      </section>

      <Divider />

      {/* El nombre */}
      <section className="px-6 py-20 md:px-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div>
            <SectionLabel>{t("naming_tag")}</SectionLabel>
            <h2 className="vv-reveal mb-4 mt-6 font-display text-section font-bold text-text text-pretty">
              {t("naming_title")}
            </h2>
            <p className="text-[0.98rem] font-light leading-[1.75] text-text-2">
              {t("naming_sub")}
            </p>
          </div>
          <NameEquation
            rows={[
              { word: t("valira"), def: t("valira_def") },
              { word: t("valley"), def: t("valley_def"), accent: true },
            ]}
            result={t("naming_result")}
          />
        </div>
      </section>

      <Divider />

      {/* CTA */}
      <section className="bg-white px-6 py-20 md:px-16">
        <div className="vv-reveal mx-auto max-w-3xl text-center">
          <h2 className="mb-3 font-display text-section font-bold text-text text-pretty">
            {t("cta_title")}
          </h2>
          <p className="mb-8 text-[1rem] font-light leading-[1.7] text-text-2">
            {t("cta_sub")}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button href="/contacto" fullWidthMobile>
              {t("cta_contact")}
            </Button>
            <Button href="/servicios" variant="secondary" fullWidthMobile>
              {t("cta_services")}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
