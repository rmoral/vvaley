import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RevealMount } from "@/components/public/Reveal";
import { NewsletterForm } from "@/components/public/NewsletterForm";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <>
      <RevealMount />

      {/* Hero */}
      <header className="hero relative flex min-h-screen items-center overflow-hidden px-6 pb-20 pt-32 md:px-16 md:pt-40">
        <div className="hero-bg absolute inset-0" />
        <div className="hero-topo absolute top-0 bottom-0 right-[-40px] w-[52%] opacity-[0.06]" />
        <div className="relative z-[2] max-w-[640px]">
          <div className="mb-7 inline-flex items-center gap-3 text-[0.73rem] font-semibold uppercase tracking-[0.2em] text-river animate-fade-up [animation-delay:.2s]">
            <span aria-hidden className="block h-px w-7 bg-river" />
            {t("hero.eyebrow")}
          </div>
          <h1 className="mb-6 font-display text-[clamp(2.8rem,6vw,5rem)] font-black leading-[1.05] text-text animate-fade-up [animation-delay:.35s]">
            {t("hero.title_1")}{" "}
            <span className="italic text-river">{t("hero.title_2")}</span>
            <br />
            {t("hero.title_3")}
            <br />
            {t("hero.title_4")}
          </h1>
          <p className="mb-6 max-w-[500px] text-[1.05rem] font-light leading-[1.75] text-text-2 animate-fade-up [animation-delay:.5s]">
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
            <a
              href="#naming"
              className="rounded-[3px] border-[1.5px] border-bg3 px-8 py-[0.9rem] text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-river no-underline transition-all hover:border-river hover:bg-[rgba(46,139,143,0.05)]"
            >
              {t("hero.cta_naming")}
            </a>
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

      {/* Stats */}
      <div className="reveal border-y border-bg3 bg-white px-6 py-12 md:px-16">
        <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-5">
          <Stat value={t("stats.ep_per_month_value")} label={t("stats.ep_per_month_label")} />
          <Stat value={t("stats.pillars_value")} label={t("stats.pillars_label")} />
          <Stat value={t("stats.languages_value")} label={t("stats.languages_label")} />
          <Stat value={t("stats.platforms_value")} label={t("stats.platforms_label")} />
          <Stat value={t("stats.model_value")} label={t("stats.model_label")} />
        </div>
      </div>

      {/* Naming */}
      <section id="naming" className="bg-white px-6 py-20 md:px-16">
        <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
          <div>
            <SectionTag>{t("naming.tag")}</SectionTag>
            <h2 className="reveal mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.15] text-text">
              {t("naming.title_1")}
              <br />
              {t("naming.title_2")}
            </h2>
            <p className="reveal max-w-[500px] text-[0.97rem] font-light leading-[1.75] text-text-2">
              {t("naming.sub")}
            </p>
          </div>
          <div className="reveal">
            <div className="overflow-hidden rounded-lg border border-bg3">
              <EqRow sym="" word={t("naming.valira")} river def={t("naming.valira_def")} />
              <EqRow sym="+" word={t("naming.valley")} def={t("naming.valley_def")} />
              <div className="grid grid-cols-[36px_1fr] items-start gap-4 bg-[rgba(46,139,143,0.04)] p-6">
                <div className="text-center text-xl font-light leading-[1.6] text-bg3">=</div>
                <div
                  className="font-display text-[1rem] font-bold leading-[1.4] text-river"
                  dangerouslySetInnerHTML={{ __html: t.raw("naming.result") }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* Pillars */}
      <section id="pilares" className="px-6 py-20 md:px-16">
        <SectionTag>{t("pillars.tag")}</SectionTag>
        <h2 className="reveal mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.15] text-text">
          {t("pillars.title_1")}
          <br />
          {t("pillars.title_2")}
        </h2>
        <p className="reveal max-w-[500px] text-[0.97rem] font-light leading-[1.75] text-text-2">
          {t("pillars.sub")}
        </p>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <PillarCard icon="📊" name={t("pillars.economy_name")} desc={t("pillars.economy_desc")} badge={t("pillars.economy_badge")} />
          <PillarCard icon="🏢" name={t("pillars.company_name")} desc={t("pillars.company_desc")} badge={t("pillars.company_badge")} />
          <PillarCard icon="🚀" name={t("pillars.entrepreneurship_name")} desc={t("pillars.entrepreneurship_desc")} badge={t("pillars.entrepreneurship_badge")} />
          <PillarCard icon="⚡" name={t("pillars.tech_name")} desc={t("pillars.tech_desc")} badge={t("pillars.tech_badge")} tech />
        </div>
      </section>

      <Divider />

      {/* Podcast formats */}
      <section id="podcast" className="bg-bg2 px-6 py-20 md:px-16">
        <SectionTag>{t("podcast.tag")}</SectionTag>
        <h2 className="reveal mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.15] text-text">
          {t("podcast.title_1")}
          <br />
          {t("podcast.title_2")}
        </h2>
        <p className="reveal max-w-[500px] text-[0.97rem] font-light leading-[1.75] text-text-2">
          {t("podcast.sub")}
        </p>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <PodcastCard num="01" title={t("podcast.f1_title")} desc={t("podcast.f1_desc")} />
          <PodcastCard num="02" title={t("podcast.f2_title")} desc={t("podcast.f2_desc")} />
          <PodcastCard num="03" title={t("podcast.f3_title")} desc={t("podcast.f3_desc")} />
          <PodcastCard num="04" title={t("podcast.f4_title")} desc={t("podcast.f4_desc")} />
          <PodcastCard num="05" title={t("podcast.f5_title")} desc={t("podcast.f5_desc")} />
          <PodcastCard num="⚡" title={t("podcast.f6_title")} desc={t("podcast.f6_desc")} tech />
        </div>
        <div className="mt-10 text-center reveal">
          <Link
            href="/podcast"
            className="inline-block rounded-[3px] border-[1.5px] border-bg3 bg-white px-8 py-[0.9rem] text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-river no-underline transition-all hover:border-river"
          >
            {t("podcast.all_episodes")}
          </Link>
        </div>
      </section>

      <Divider />

      {/* Ecosystem */}
      <section id="ecosistema" className="px-6 py-20 md:px-16">
        <SectionTag>{t("ecosystem.tag")}</SectionTag>
        <h2 className="reveal mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.15] text-text">
          {t("ecosystem.title_1")}
          <br />
          {t("ecosystem.title_2")}
        </h2>
        <p className="reveal max-w-[500px] text-[0.97rem] font-light leading-[1.75] text-text-2">
          {t("ecosystem.sub")}
        </p>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PlatformCard icon="🎙" name={t("ecosystem.p1_name")} role={t("ecosystem.p1_role")} />
          <PlatformCard icon="▶" name={t("ecosystem.p2_name")} role={t("ecosystem.p2_role")} />
          <PlatformCard icon="in" name={t("ecosystem.p3_name")} role={t("ecosystem.p3_role")} />
          <PlatformCard icon="◈" name={t("ecosystem.p4_name")} role={t("ecosystem.p4_role")} />
          <PlatformCard icon="♟" name={t("ecosystem.p5_name")} role={t("ecosystem.p5_role")} />
          <PlatformCard icon="✉" name={t("ecosystem.p6_name")} role={t("ecosystem.p6_role")} />
        </div>
      </section>

      <Divider />

      {/* Phases */}
      <section id="fases" className="bg-white px-6 py-20 md:px-16">
        <SectionTag>{t("phases.tag")}</SectionTag>
        <h2 className="reveal mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.15] text-text">
          {t("phases.title_1")}
          <br />
          {t("phases.title_2")}
        </h2>
        <div className="mt-12 flex flex-col">
          <Phase
            num="1"
            period={t("phases.p1_period")}
            title={t("phases.p1_title")}
            desc={t("phases.p1_desc")}
            items={[t("phases.p1_i1"), t("phases.p1_i2"), t("phases.p1_i3")]}
            techItems={[t("phases.p1_i4")]}
          />
          <Phase
            num="2"
            period={t("phases.p2_period")}
            title={t("phases.p2_title")}
            desc={t("phases.p2_desc")}
            items={[t("phases.p2_i1"), t("phases.p2_i2")]}
            techItems={[t("phases.p2_i3"), t("phases.p2_i4")]}
            bordered
          />
          <Phase
            num="3"
            period={t("phases.p3_period")}
            title={t("phases.p3_title")}
            desc={t("phases.p3_desc")}
            items={[t("phases.p3_i2"), t("phases.p3_i4")]}
            techItems={[t("phases.p3_i1"), t("phases.p3_i3")]}
            bordered
            last
          />
        </div>
      </section>

      <Divider />

      {/* Monetization */}
      <section id="monetizacion" className="bg-bg2 px-6 py-20 md:px-16">
        <SectionTag>{t("monetization.tag")}</SectionTag>
        <h2 className="reveal mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.15] text-text">
          {t("monetization.title_1")}
          <br />
          {t("monetization.title_2")}
        </h2>
        <p className="reveal max-w-[500px] text-[0.97rem] font-light leading-[1.75] text-text-2">
          {t("monetization.sub")}
        </p>
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          <MonoCard featured badge={t("monetization.main_badge")} title={t("monetization.main_title")} desc={t("monetization.main_desc")} horizon={t("monetization.main_horizon")} />
          <MonoCard tc badge={t("monetization.tech_badge")} title={t("monetization.c1_title")} desc={t("monetization.c1_desc")} horizon={t("monetization.c1_horizon")} />
          <MonoCard tc badge={t("monetization.tech_badge")} title={t("monetization.c2_title")} desc={t("monetization.c2_desc")} horizon={t("monetization.c2_horizon")} />
          <MonoCard badge={t("monetization.services_badge")} title={t("monetization.c3_title")} desc={t("monetization.c3_desc")} horizon={t("monetization.c3_horizon")} />
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="border-t border-bg3 bg-white px-6 py-24 text-center md:px-16">
        <SectionTag block>{t("newsletter.tag")}</SectionTag>
        <h2 className="reveal mx-auto mb-4 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.15] text-text">
          {t("newsletter.title_1")}
          <br />
          {t("newsletter.title_2")}
        </h2>
        <p className="reveal mx-auto mb-10 max-w-[500px] text-[0.97rem] font-light leading-[1.75] text-text-2">
          {t("newsletter.sub")}
        </p>
        <div className="reveal mx-auto max-w-[440px]">
          <NewsletterForm />
        </div>
      </section>
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

function SectionTag({
  children,
  block,
}: {
  children: React.ReactNode;
  block?: boolean;
}) {
  return (
    <div
      className={`reveal ${block ? "block text-center" : "inline-block"} mb-5 rounded-[2px] border border-[rgba(46,139,143,0.25)] bg-[rgba(46,139,143,0.04)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-river`}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="mx-6 h-px bg-bg3 md:mx-16" />;
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
      <div className="text-center text-xl font-light leading-[1.6] text-bg3">{sym}</div>
      <div>
        <div
          className={`mb-1 font-display text-[1.5rem] font-black leading-[1.1] ${river ? "text-river" : "text-text"}`}
        >
          {word}
        </div>
        <div className="text-[0.82rem] leading-[1.55] text-text-3">{def}</div>
      </div>
    </div>
  );
}

function PillarCard({
  icon,
  name,
  desc,
  badge,
  tech,
}: {
  icon: string;
  name: string;
  desc: string;
  badge: string;
  tech?: boolean;
}) {
  return (
    <div
      className={`reveal relative overflow-hidden rounded-lg border bg-white p-7 transition-all hover:border-river-2 hover:shadow-[0_4px_20px_rgba(46,139,143,0.08)] ${
        tech ? "border-[rgba(46,139,143,0.25)] bg-[rgba(46,139,143,0.02)]" : "border-bg3"
      }`}
    >
      <div className="mb-3 text-2xl">{icon}</div>
      <div className="mb-2 text-[0.92rem] font-semibold text-text">{name}</div>
      <div className="text-[0.8rem] leading-[1.6] text-text-3">{desc}</div>
      <div className="mt-3 inline-block rounded-[2px] border border-[rgba(46,139,143,0.25)] bg-[rgba(46,139,143,0.05)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-river">
        {badge}
      </div>
    </div>
  );
}

function PodcastCard({
  num,
  title,
  desc,
  tech,
}: {
  num: string;
  title: string;
  desc: string;
  tech?: boolean;
}) {
  return (
    <div
      className={`reveal relative overflow-hidden rounded-lg border bg-white p-7 transition-all hover:-translate-y-1 hover:border-river-2 ${
        tech ? "border-[rgba(46,139,143,0.2)] bg-[rgba(46,139,143,0.02)]" : "border-bg3"
      }`}
    >
      <div className="mb-2 font-display text-[2.4rem] font-black leading-none text-bg3">
        {num}
      </div>
      <div
        className={`mb-2 text-[0.92rem] font-semibold ${tech ? "text-river" : "text-text"}`}
      >
        {title}
      </div>
      <div className="text-[0.8rem] leading-[1.6] text-text-3">{desc}</div>
    </div>
  );
}

function PlatformCard({
  icon,
  name,
  role,
}: {
  icon: string;
  name: string;
  role: string;
}) {
  return (
    <div className="reveal flex items-start gap-4 rounded-lg border border-bg3 bg-white p-5 transition-colors hover:border-river-2">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-bg3 bg-bg2 text-[1rem]">
        {icon}
      </div>
      <div>
        <div className="text-[0.88rem] font-semibold text-text">{name}</div>
        <div className="text-[0.76rem] leading-[1.5] text-text-3">{role}</div>
      </div>
    </div>
  );
}

function Phase({
  num,
  period,
  title,
  desc,
  items,
  techItems,
  bordered,
  last,
}: {
  num: string;
  period: string;
  title: string;
  desc: string;
  items: string[];
  techItems?: string[];
  bordered?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`reveal grid grid-cols-1 gap-10 py-10 md:grid-cols-[140px_1fr] ${
        bordered ? "border-t border-bg3" : ""
      } ${last ? "border-b border-bg3" : ""}`}
    >
      <div className="flex flex-col items-end text-right">
        <div className="font-display text-[2.8rem] font-black leading-none text-bg3">
          {num}
        </div>
        <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-river">
          {period}
        </div>
      </div>
      <div>
        <div className="mb-2 text-[1.05rem] font-semibold text-text">{title}</div>
        <div className="mb-4 text-[0.84rem] leading-[1.65] text-text-2">{desc}</div>
        <div className="flex flex-wrap gap-2">
          {items.map((it) => (
            <span
              key={it}
              className="rounded-[3px] border border-bg3 bg-bg2 px-3 py-0.5 text-[0.71rem] font-medium text-text-2"
            >
              {it}
            </span>
          ))}
          {techItems?.map((it) => (
            <span
              key={it}
              className="rounded-[3px] border border-[rgba(46,139,143,0.25)] bg-[rgba(46,139,143,0.05)] px-3 py-0.5 text-[0.71rem] font-medium text-river"
            >
              {it}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonoCard({
  badge,
  title,
  desc,
  horizon,
  featured,
  tc,
}: {
  badge: string;
  title: string;
  desc: string;
  horizon: string;
  featured?: boolean;
  tc?: boolean;
}) {
  return (
    <div
      className={`reveal rounded-lg border bg-white p-7 transition-colors hover:border-river-2 ${
        featured
          ? "md:col-span-2 border-[rgba(46,139,143,0.3)] bg-[rgba(46,139,143,0.03)]"
          : tc
            ? "border-[rgba(46,139,143,0.2)] bg-[rgba(46,139,143,0.02)]"
            : "border-bg3"
      }`}
    >
      <div
        className={`mb-3 inline-block rounded-[3px] px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] ${
          featured ? "bg-river text-white" : "bg-[rgba(46,139,143,0.1)] text-river"
        }`}
      >
        {badge}
      </div>
      <div className="mb-2 text-[0.97rem] font-semibold text-text">{title}</div>
      <div className="text-[0.82rem] leading-[1.6] text-text-3">{desc}</div>
      <div className="mt-3 text-[0.72rem] font-medium text-river-2">{horizon}</div>
    </div>
  );
}
