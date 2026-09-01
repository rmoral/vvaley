import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/public/JsonLd";
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

      {/* Services */}
      <section className="bg-white px-6 py-20 md:px-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {services.map((s, i) => (
            <article
              key={s.title}
              className="grid grid-cols-1 gap-8 rounded-lg border border-bg3 bg-bg p-8 md:grid-cols-[1.2fr_1fr] md:p-10"
            >
              <div>
                <div className="mb-4 font-display text-[1.1rem] font-black leading-none text-bg3">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h2 className="mb-3 font-display text-[1.5rem] font-bold leading-tight text-text">
                  {s.title}
                </h2>
                <p className="mb-5 text-[0.97rem] leading-[1.7] text-text-2">
                  {s.desc}
                </p>
                <div className="rounded-md border border-[rgba(46,139,143,0.25)] bg-[rgba(46,139,143,0.05)] p-4">
                  <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-river">
                    {t("for_label")}
                  </div>
                  <p className="text-[0.87rem] leading-[1.6] text-text-2">
                    {s.forWho}
                  </p>
                </div>
              </div>
              <div>
                <div className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-text-2">
                  {t("includes_label")}
                </div>
                <ul className="flex flex-col gap-2.5">
                  {s.bullets.map((b) => (
                    <li
                      key={b}
                      className="grid grid-cols-[14px_1fr] items-start gap-3 text-[0.89rem] leading-[1.6] text-text-2"
                    >
                      <span aria-hidden className="mt-[7px] block h-1.5 w-1.5 rounded-full bg-river" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Divider />

      {/* Process */}
      <section className="px-6 py-20 md:px-16">
        <div className="mx-auto max-w-5xl">
          <SectionTag>{t("process_tag")}</SectionTag>
          <h2 className="mb-10 font-display text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.15] text-text">
            {t("process_title")}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Step num="1" title={t("p1_title")} desc={t("p1_desc")} />
            <Step num="2" title={t("p2_title")} desc={t("p2_desc")} />
            <Step num="3" title={t("p3_title")} desc={t("p3_desc")} />
            <Step num="4" title={t("p4_title")} desc={t("p4_desc")} />
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
          <Link
            href="/contacto?motivo=servicios"
            className="inline-block rounded-[3px] bg-river px-8 py-[0.9rem] text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
          >
            {t("cta_button")}
          </Link>
        </div>
      </section>

      <JsonLd data={jsonLd} />
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

function Step({
  num,
  title,
  desc,
}: {
  num: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border border-bg3 bg-white p-7">
      <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(46,139,143,0.3)] bg-[rgba(46,139,143,0.06)] font-display text-[0.9rem] font-bold text-river">
        {num}
      </div>
      <div className="mb-2 text-[0.95rem] font-semibold text-text">{title}</div>
      <p className="text-[0.83rem] leading-[1.65] text-text-2">{desc}</p>
    </div>
  );
}
