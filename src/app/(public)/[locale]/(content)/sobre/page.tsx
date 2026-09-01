import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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

  return (
    <main className="pt-32">
      {/* Intro */}
      <section className="mx-auto max-w-4xl px-6 pb-16 md:px-16">
        <SectionTag>{t("tag")}</SectionTag>
        <h1 className="mb-6 font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-black leading-[1.08] text-text">
          {t("title_1")}
          <br />
          <span className="italic text-river">{t("title_2")}</span>
        </h1>
        <p className="max-w-[640px] text-[1.08rem] font-light leading-[1.75] text-text-2">
          {t("lead")}
        </p>
      </section>

      <Divider />

      {/* Mission */}
      <section className="bg-white px-6 py-20 md:px-16">
        <div className="mx-auto max-w-4xl">
          <SectionTag>{t("mission_tag")}</SectionTag>
          <h2 className="mb-6 font-display text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.15] text-text">
            {t("mission_title")}
          </h2>
          <div className="flex max-w-[640px] flex-col gap-4 text-[1rem] leading-[1.8] text-text-2">
            <p>{t("mission_p1")}</p>
            <p>{t("mission_p2")}</p>
            <p>{t("mission_p3")}</p>
          </div>
        </div>
      </section>

      <Divider />

      {/* Formats */}
      <section className="px-6 py-20 md:px-16">
        <div className="mx-auto max-w-5xl">
          <SectionTag>{t("formats_tag")}</SectionTag>
          <h2 className="mb-10 font-display text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.15] text-text">
            {t("formats_title")}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FormatCard num="01" title={t("f1_title")} desc={t("f1_desc")} />
            <FormatCard num="02" title={t("f2_title")} desc={t("f2_desc")} />
            <FormatCard num="03" title={t("f3_title")} desc={t("f3_desc")} />
            <FormatCard num="04" title={t("f4_title")} desc={t("f4_desc")} />
            <FormatCard num="05" title={t("f5_title")} desc={t("f5_desc")} />
          </div>
        </div>
      </section>

      <Divider />

      {/* Why Andorra */}
      <section className="bg-white px-6 py-20 md:px-16">
        <div className="mx-auto max-w-4xl">
          <SectionTag>{t("andorra_tag")}</SectionTag>
          <h2 className="mb-6 font-display text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.15] text-text">
            {t("andorra_title")}
          </h2>
          <div className="flex max-w-[640px] flex-col gap-4 text-[1rem] leading-[1.8] text-text-2">
            <p>{t("andorra_p1")}</p>
            <p>{t("andorra_p2")}</p>
          </div>
        </div>
      </section>

      <Divider />

      {/* The name */}
      <section className="px-6 py-20 md:px-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div>
            <SectionTag>{t("naming_tag")}</SectionTag>
            <h2 className="mb-4 font-display text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.15] text-text">
              {t("naming_title")}
            </h2>
            <p className="text-[0.98rem] font-light leading-[1.75] text-text-2">
              {t("naming_sub")}
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-bg3 bg-white">
            <EqRow sym="+" word={t("valira")} def={t("valira_def")} />
            <EqRow sym="+" word={t("valley")} def={t("valley_def")} river />
            <div className="bg-[rgba(46,139,143,0.04)] p-6 text-[0.9rem] leading-[1.65] text-text-2">
              {t("naming_result")}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-6 py-20 md:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-3 font-display text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.15] text-text">
            {t("cta_title")}
          </h2>
          <p className="mb-8 text-[1rem] font-light leading-[1.7] text-text-2">
            {t("cta_sub")}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/contacto"
              className="rounded-[3px] bg-river px-8 py-[0.9rem] text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
            >
              {t("cta_contact")}
            </Link>
            <Link
              href="/servicios"
              className="rounded-[3px] border-[1.5px] border-bg3 px-8 py-[0.9rem] text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-river no-underline transition-all hover:border-river"
            >
              {t("cta_services")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- inline subcomponents ---------- */

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 inline-block rounded-[2px] border border-[rgba(46,139,143,0.25)] bg-[rgba(46,139,143,0.04)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-river">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="mx-6 h-px bg-bg3 md:mx-16" />;
}

function FormatCard({
  num,
  title,
  desc,
}: {
  num: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border border-bg3 bg-white p-7 transition-all hover:border-river-2">
      <div className="mb-4 font-display text-[1.1rem] font-black leading-none text-bg3">
        {num}
      </div>
      <div className="mb-2 text-[0.95rem] font-semibold text-text">{title}</div>
      <p className="text-[0.83rem] leading-[1.65] text-text-2">{desc}</p>
    </div>
  );
}

function EqRow({
  sym,
  word,
  def,
  river,
}: {
  sym: string;
  word: string;
  def: string;
  river?: boolean;
}) {
  return (
    <div className="grid grid-cols-[36px_1fr] items-start gap-4 border-b border-bg3 p-6">
      <div className="text-center text-xl font-light leading-[1.6] text-bg3">
        {sym}
      </div>
      <div>
        <div
          className={`font-display text-[1.15rem] font-bold ${river ? "text-river" : "text-text"}`}
        >
          {word}
        </div>
        <div className="mt-1 text-[0.85rem] leading-[1.6] text-text-2">
          {def}
        </div>
      </div>
    </div>
  );
}
