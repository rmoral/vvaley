import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { RevealMount } from "@/components/public/RevealMount";
import { CoverArt } from "@/components/public/CoverArt";
import { ExploreCard } from "@/components/public/ExploreCard";
import { PillarCard } from "@/components/public/PillarCard";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Stat } from "@/components/ui/Stat";
import { HomeHero } from "./_sections/HomeHero";
import { routing, type AppLocale } from "@/i18n/routing";

function isAppLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}

// Render on demand instead of prerendering at build time. The home is
// content-driven (intl messages + a few live counts), and prerendering
// it for every locale at build time peaks memory enough to OOM small
// EC2 instances. Apache + the layout's caching headers handle the rest.
export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // `[locale]` matches any single segment, so junk requests every browser
  // makes — /favicon.ico, /apple-touch-icon.png — land here with the
  // filename as the locale. The layout rejects them, but this page still
  // evaluates and used to throw a RangeError inside Intl.DateTimeFormat
  // before that happened. Reject them here too.
  if (!isAppLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations("home");

  // Live figures instead of aspirational ones. If there's nothing
  // published yet the whole strip is hidden rather than showing zeros.
  // Four episodes: the newest is featured below, the next three fill the
  // hero's archive column so the same episode never appears twice.
  const [episodeCount, guestCount, postCount, episodes] = await Promise.all([
    prisma.episode.count({ where: { status: "PUBLISHED" } }),
    prisma.guest.count({ where: { isPublic: true } }),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.episode.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 4,
      select: {
        slug: true,
        number: true,
        title: true,
        subtitle: true,
        summary: true,
        coverImageUrl: true,
        durationSec: true,
        publishedAt: true,
        guests: {
          orderBy: { position: "asc" },
          select: { guest: { select: { fullName: true } } },
        },
      },
    }),
  ]);

  const featured = episodes[0] ?? null;
  const shortDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const longDate = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  const archive = episodes.slice(1, 4).map((ep) => ({
    slug: ep.slug,
    number: ep.number,
    title: ep.title,
    meta: [
      ep.durationSec ? `${Math.round(ep.durationSec / 60)} min` : null,
      ep.publishedAt ? shortDate.format(ep.publishedAt) : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  const hasContent = episodeCount > 0 || guestCount > 0 || postCount > 0;
  const guestNames =
    featured?.guests.map((g) => g.guest.fullName).join(", ") ?? "";

  return (
    <>
      <RevealMount />

      <HomeHero archive={archive} />

      {/* Live figures — hidden entirely while the site has no content */}
      {hasContent && (
        <>
          <Divider />
          <div className="vv-reveal px-6 py-12 md:px-16">
            <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
              <Stat value={String(episodeCount)} label={t("stats.episodes_label")} />
              <Stat value={String(guestCount)} label={t("stats.guests_label")} />
              <Stat value={String(postCount)} label={t("stats.articles_label")} />
              <Stat
                value={t("stats.languages_value")}
                label={t("stats.languages_label")}
              />
            </div>
          </div>
        </>
      )}

      <Divider />

      {/* Featured episode — the product, given room */}
      {featured && (
        <>
          <section className="bg-white px-6 py-20 md:px-16">
            <SectionLabel>{t("latest.tag")}</SectionLabel>
            <div className="mt-6 grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
              <div className="vv-reveal">
                {featured.number !== null && (
                  <p className="mb-3 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-text-2">
                    {String(featured.number).padStart(2, "0")}
                  </p>
                )}
                <h2 className="mb-4 font-display text-section font-bold text-text text-pretty">
                  {featured.title}
                </h2>
                {featured.subtitle && (
                  <p className="mb-4 text-[1.02rem] font-light leading-[1.7] text-text-2">
                    {featured.subtitle}
                  </p>
                )}
                {featured.summary && (
                  <p className="mb-5 max-w-[560px] text-[0.95rem] leading-[1.7] text-text-2">
                    {featured.summary}
                  </p>
                )}
                <div className="mb-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8rem] text-text-2">
                  {guestNames && (
                    <span>{t("latest.with_guests", { names: guestNames })}</span>
                  )}
                  {featured.durationSec !== null && (
                    <span>{Math.round(featured.durationSec / 60)} min</span>
                  )}
                  {featured.publishedAt && (
                    <time dateTime={featured.publishedAt.toISOString()}>
                      {longDate.format(featured.publishedAt)}
                    </time>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  <Button href={`/podcast/${featured.slug}`} fullWidthMobile>
                    {t("latest.listen")}
                  </Button>
                  <Button href="/podcast" variant="secondary" fullWidthMobile>
                    {t("latest.all")}
                  </Button>
                </div>
              </div>
              <CoverArt
                src={featured.coverImageUrl}
                alt=""
                number={featured.number}
                variant={featured.number ? "numeral" : "contour"}
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="vv-reveal aspect-square w-full rounded-lg border border-bg3"
              />
            </div>
          </section>
          <Divider />
        </>
      )}

      {/* Editorial pillars */}
      <section id="pilares" className="bg-bg2 px-6 py-20 md:px-16">
        <SectionLabel>{t("pillars.tag")}</SectionLabel>
        <h2 className="vv-reveal mt-6 mb-4 font-display text-section font-bold text-text text-pretty">
          {t("pillars.title")}
        </h2>
        <p className="vv-reveal max-w-[560px] text-[0.97rem] font-light leading-[1.75] text-text-2">
          {t("pillars.sub")}
        </p>
        <div className="vv-seq mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <PillarCard num="01" name={t("pillars.economy_name")} desc={t("pillars.economy_desc")} />
          <PillarCard num="02" name={t("pillars.company_name")} desc={t("pillars.company_desc")} />
          <PillarCard num="03" name={t("pillars.entrepreneurship_name")} desc={t("pillars.entrepreneurship_desc")} />
          <PillarCard num="04" name={t("pillars.tech_name")} desc={t("pillars.tech_desc")} accent />
        </div>
      </section>

      <Divider />

      {/* Explore: navigation cards to the four content sections */}
      <section id="explora" className="bg-white px-6 py-20 md:px-16">
        <SectionLabel>{t("explore.tag")}</SectionLabel>
        <h2 className="vv-reveal mt-6 mb-4 font-display text-section font-bold text-text text-pretty">
          {t("explore.title")}
        </h2>
        <p className="vv-reveal max-w-[560px] text-[0.97rem] font-light leading-[1.75] text-text-2">
          {t("explore.sub")}
        </p>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ExploreCard href="/invitados" title={t("explore.guests_title")} desc={t("explore.guests_desc")} cta={t("explore.guests_cta")} />
          <ExploreCard href="/blog" title={t("explore.blog_title")} desc={t("explore.blog_desc")} cta={t("explore.blog_cta")} />
          <ExploreCard href="/noticias" title={t("explore.news_title")} desc={t("explore.news_desc")} cta={t("explore.news_cta")} />
          <ExploreCard href="/eventos" title={t("explore.events_title")} desc={t("explore.events_desc")} cta={t("explore.events_cta")} />
        </div>
      </section>

      <Divider />

      {/* B2B teaser → /servicios */}
      <section id="empresas" className="grain relative bg-ink px-6 py-20 md:px-16">
        <div aria-hidden className="topo-rings pointer-events-none absolute inset-0" />
        <div className="relative">
        <SectionLabel invert>{t("b2b.tag")}</SectionLabel>
        <h2 className="vv-reveal mt-6 mb-4 font-display text-section font-bold text-white text-pretty">
          {t("b2b.title")}
        </h2>
        <p className="vv-reveal max-w-[600px] text-[0.97rem] font-light leading-[1.75] text-ink-2">
          {t("b2b.sub")}
        </p>
        <div className="vv-seq mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          <ServiceTeaser title={t("b2b.c1_title")} desc={t("b2b.c1_desc")} />
          <ServiceTeaser title={t("b2b.c2_title")} desc={t("b2b.c2_desc")} />
          <ServiceTeaser title={t("b2b.c3_title")} desc={t("b2b.c3_desc")} />
        </div>
        <div className="vv-reveal mt-10">
          <Button href="/servicios" variant="invert">{t("b2b.cta")}</Button>
        </div>
        </div>
      </section>

      {/* Newsletter strip is rendered globally by the public layout. */}
    </>
  );
}

// Tarjeta del teaser B2B. Vive dentro del estrato invertido, así que
// no reutiliza ServiceCard: sus colores son los del modo oscuro.
function ServiceTeaser({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-bg3/20 bg-white/[0.04] p-7 transition-colors duration-250 ease-out-soft hover:border-river-2/50">
      <h3 className="mb-2 font-display text-[1.1rem] font-bold leading-tight text-white text-pretty">
        {title}
      </h3>
      <p className="text-[0.85rem] leading-[1.65] text-ink-2">{desc}</p>
    </div>
  );
}
