import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { RevealMount } from "@/components/public/Reveal";

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
  setRequestLocale(locale);
  const t = await getTranslations("home");

  // Live figures instead of aspirational ones. If there's nothing
  // published yet the whole strip is hidden rather than showing zeros.
  const [episodeCount, guestCount, postCount, latestEpisode] =
    await Promise.all([
      prisma.episode.count({ where: { status: "PUBLISHED" } }),
      prisma.guest.count({ where: { isPublic: true } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.episode.findFirst({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
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

  const hasContent = episodeCount > 0 || guestCount > 0 || postCount > 0;
  const guestNames =
    latestEpisode?.guests.map((g) => g.guest.fullName).join(", ") ?? "";

  return (
    <>
      <RevealMount />

      {/* Hero */}
      <header className="hero relative flex min-h-screen items-center overflow-hidden px-6 pb-20 pt-32 md:px-16 md:pt-40">
        <div className="hero-bg absolute inset-0" />
        <div className="hero-topo absolute top-0 bottom-0 right-[-40px] w-[52%] opacity-[0.06]" />
        <div className="relative z-[2] max-w-[660px]">
          <div className="mb-7 inline-flex items-center gap-3 text-[0.73rem] font-semibold uppercase tracking-[0.2em] text-river animate-fade-up [animation-delay:.2s]">
            <span aria-hidden className="block h-px w-7 bg-river" />
            {t("hero.eyebrow")}
          </div>
          <h1 className="mb-6 font-display text-[clamp(2.6rem,5.5vw,4.6rem)] font-black leading-[1.05] text-text animate-fade-up [animation-delay:.35s]">
            {t("hero.title_1")}
            <br />
            <span className="italic text-river">{t("hero.title_2")}</span>
          </h1>
          <p className="mb-6 max-w-[540px] text-[1.05rem] font-light leading-[1.75] text-text-2 animate-fade-up [animation-delay:.5s]">
            {t("hero.sub")}
          </p>
          <div className="mb-10 flex flex-wrap gap-2 animate-fade-up [animation-delay:.6s]">
            <Tag>{t("hero.tag_economy")}</Tag>
            <Tag>{t("hero.tag_company")}</Tag>
            <Tag>{t("hero.tag_entrepreneurship")}</Tag>
            <Tag tech>{t("hero.tag_tech")}</Tag>
          </div>
          <div className="flex flex-wrap gap-4 animate-fade-up [animation-delay:.7s]">
            <Link
              href="/podcast"
              className="rounded-[3px] bg-river px-8 py-[0.9rem] text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
            >
              {t("hero.cta_listen")}
            </Link>
            <Link
              href="/servicios"
              className="rounded-[3px] border-[1.5px] border-bg3 px-8 py-[0.9rem] text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-river no-underline transition-all hover:border-river hover:bg-[rgba(46,139,143,0.05)]"
            >
              {t("hero.cta_services")}
            </Link>
          </div>
        </div>

        {/* Spinning badge */}
        <div className="absolute right-[5rem] top-1/2 z-[2] hidden -translate-y-1/2 lg:block animate-fade-up [animation-delay:.9s]">
          <div className="relative flex h-[200px] w-[200px] items-center justify-center rounded-full border border-bg3 animate-slow-spin">
            <div className="absolute -inset-4 rounded-full border border-dashed border-[rgba(46,139,143,0.2)]" />
            <div className="absolute -inset-9 rounded-full border border-dashed border-[rgba(46,139,143,0.1)]" />
            <div className="text-center animate-slow-spin-rev">
              <div className="font-display text-[0.95rem] font-black tracking-[0.04em] text-text">
                VALIRA<em className="text-river not-italic"> · </em>VALLEY
              </div>
              <div
                className="mt-1 text-[0.62rem] uppercase tracking-[0.12em] text-text-3"
                dangerouslySetInnerHTML={{ __html: t.raw("hero.badge_sub") }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Live figures — hidden entirely while the site has no content */}
      {hasContent && (
        <div className="reveal border-y border-bg3 bg-white px-6 py-12 md:px-16">
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
      )}

      {/* Latest episode — the product, front and centre */}
      {latestEpisode && (
        <>
          <section className="bg-white px-6 py-20 md:px-16">
            <SectionTag>{t("latest.tag")}</SectionTag>
            <div className="mt-2 grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
              <div>
                {latestEpisode.number !== null && (
                  <div className="reveal mb-3 text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-text-3">
                    #{latestEpisode.number}
                  </div>
                )}
                <h2 className="reveal mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.15] text-text">
                  {latestEpisode.title}
                </h2>
                {latestEpisode.subtitle && (
                  <p className="reveal mb-4 text-[1.02rem] font-light leading-[1.7] text-text-2">
                    {latestEpisode.subtitle}
                  </p>
                )}
                {latestEpisode.summary && (
                  <p className="reveal mb-5 max-w-[560px] text-[0.95rem] leading-[1.7] text-text-2">
                    {latestEpisode.summary}
                  </p>
                )}
                <div className="reveal mb-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8rem] text-text-3">
                  {guestNames && (
                    <span>{t("latest.with_guests", { names: guestNames })}</span>
                  )}
                  {latestEpisode.durationSec !== null && (
                    <span>{Math.round(latestEpisode.durationSec / 60)} min</span>
                  )}
                  {latestEpisode.publishedAt && (
                    <time dateTime={latestEpisode.publishedAt.toISOString()}>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "long",
                      }).format(latestEpisode.publishedAt)}
                    </time>
                  )}
                </div>
                <div className="reveal flex flex-wrap gap-4">
                  <Link
                    href={`/podcast/${latestEpisode.slug}`}
                    className="rounded-[3px] bg-river px-7 py-[0.8rem] text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
                  >
                    {t("latest.listen")}
                  </Link>
                  <Link
                    href="/podcast"
                    className="rounded-[3px] border-[1.5px] border-bg3 px-7 py-[0.8rem] text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-river no-underline transition-all hover:border-river"
                  >
                    {t("latest.all")}
                  </Link>
                </div>
              </div>
              {latestEpisode.coverImageUrl && (
                <div
                  className="reveal aspect-square w-full rounded-lg border border-bg3 bg-bg2 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${latestEpisode.coverImageUrl})`,
                  }}
                  aria-hidden
                />
              )}
            </div>
          </section>
          <Divider />
        </>
      )}

      {/* Editorial pillars */}
      <section id="pilares" className="px-6 py-20 md:px-16">
        <SectionTag>{t("pillars.tag")}</SectionTag>
        <h2 className="reveal mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.15] text-text">
          {t("pillars.title_1")}
          <br />
          {t("pillars.title_2")}
        </h2>
        <p className="reveal max-w-[560px] text-[0.97rem] font-light leading-[1.75] text-text-2">
          {t("pillars.sub")}
        </p>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <PillarCard num="01" name={t("pillars.economy_name")} desc={t("pillars.economy_desc")} />
          <PillarCard num="02" name={t("pillars.company_name")} desc={t("pillars.company_desc")} />
          <PillarCard num="03" name={t("pillars.entrepreneurship_name")} desc={t("pillars.entrepreneurship_desc")} />
          <PillarCard num="04" name={t("pillars.tech_name")} desc={t("pillars.tech_desc")} tech />
        </div>
      </section>

      <Divider />

      {/* Explore: navigation cards to the four content sections */}
      <section id="explora" className="bg-white px-6 py-20 md:px-16">
        <SectionTag>{t("explore.tag")}</SectionTag>
        <h2 className="reveal mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.15] text-text">
          {t("explore.title_1")}
          <br />
          {t("explore.title_2")}
        </h2>
        <p className="reveal max-w-[560px] text-[0.97rem] font-light leading-[1.75] text-text-2">
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
      <section id="empresas" className="px-6 py-20 md:px-16">
        <SectionTag>{t("b2b.tag")}</SectionTag>
        <h2 className="reveal mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.15] text-text">
          {t("b2b.title_1")}
          <br />
          {t("b2b.title_2")}
        </h2>
        <p className="reveal max-w-[600px] text-[0.97rem] font-light leading-[1.75] text-text-2">
          {t("b2b.sub")}
        </p>
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          <ServiceTeaser title={t("b2b.c1_title")} desc={t("b2b.c1_desc")} />
          <ServiceTeaser title={t("b2b.c2_title")} desc={t("b2b.c2_desc")} />
          <ServiceTeaser title={t("b2b.c3_title")} desc={t("b2b.c3_desc")} />
        </div>
        <div className="reveal mt-10">
          <Link
            href="/servicios"
            className="inline-block rounded-[3px] bg-river px-8 py-[0.9rem] text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
          >
            {t("b2b.cta")}
          </Link>
        </div>
      </section>

      {/* Newsletter strip is rendered globally by the public layout. */}
    </>
  );
}

/* ---------- inline subcomponents ---------- */

function Tag({ children, tech }: { children: React.ReactNode; tech?: boolean }) {
  return (
    <span
      className={`rounded-[3px] border px-3 py-1 text-[0.71rem] font-semibold uppercase tracking-[0.1em] ${
        tech
          ? "border-[rgba(46,139,143,0.3)] bg-[rgba(46,139,143,0.07)] text-river"
          : "border-bg3 bg-bg2 text-text-2"
      }`}
    >
      {children}
    </span>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-[2.2rem] font-black leading-none text-river">
        {value}
      </div>
      <div className="mt-2 text-[0.71rem] uppercase tracking-[0.1em] text-text-3">
        {label}
      </div>
    </div>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="reveal mb-5 inline-block rounded-[2px] border border-[rgba(46,139,143,0.25)] bg-[rgba(46,139,143,0.04)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-river">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="mx-6 h-px bg-bg3 md:mx-16" />;
}

function PillarCard({
  num,
  name,
  desc,
  tech,
}: {
  num: string;
  name: string;
  desc: string;
  tech?: boolean;
}) {
  return (
    <div
      className={`reveal relative overflow-hidden rounded-lg border bg-white p-7 transition-all hover:border-river-2 hover:shadow-[0_4px_20px_rgba(46,139,143,0.08)] ${
        tech ? "border-[rgba(46,139,143,0.25)] bg-[rgba(46,139,143,0.02)]" : "border-bg3"
      }`}
    >
      <div className="mb-4 font-display text-[1.1rem] font-black leading-none text-bg3">
        {num}
      </div>
      <div className="mb-2 text-[0.95rem] font-semibold text-text">{name}</div>
      <div className="text-[0.83rem] leading-[1.65] text-text-2">{desc}</div>
    </div>
  );
}

function ExploreCard({
  href,
  title,
  desc,
  cta,
}: {
  href: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="reveal group flex h-full flex-col gap-3 rounded-lg border border-bg3 bg-white p-6 no-underline transition-all hover:-translate-y-1 hover:border-river-2 hover:shadow-[0_4px_20px_rgba(46,139,143,0.08)]"
    >
      <div className="font-display text-[1.15rem] font-bold leading-tight text-text group-hover:text-river">
        {title}
      </div>
      <p className="text-[0.85rem] leading-[1.55] text-text-2">{desc}</p>
      <span className="mt-auto pt-2 text-[0.74rem] font-semibold uppercase tracking-[0.1em] text-river">
        {cta} →
      </span>
    </Link>
  );
}

function ServiceTeaser({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="reveal rounded-lg border border-bg3 bg-white p-7 transition-all hover:border-river-2">
      <div className="mb-2 font-display text-[1.1rem] font-bold leading-tight text-text">
        {title}
      </div>
      <p className="text-[0.85rem] leading-[1.65] text-text-2">{desc}</p>
    </div>
  );
}
