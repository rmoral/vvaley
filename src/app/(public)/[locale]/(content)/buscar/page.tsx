import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { searchAll } from "@/lib/search";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("search");
  return {
    title: t("title"),
    description: t("sub"),
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q = "" } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("search");

  const query = q.trim();
  const results = query
    ? await searchAll(query, locale as AppLocale)
    : { posts: [], news: [], episodes: [], guests: [], total: 0 };

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-16">
      <h1 className="mb-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] font-black leading-[1.05] text-text">
        {t("title")}
      </h1>
      <p className="mb-8 max-w-[600px] text-[1.02rem] font-light leading-[1.7] text-text-2">
        {t("sub")}
      </p>

      <form
        action="/buscar"
        method="get"
        className="mb-10 flex flex-col gap-2 sm:flex-row"
      >
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t("placeholder")}
          autoFocus
          className="flex-1 rounded-md border border-bg3 bg-white px-4 py-3 text-[1rem] text-text outline-none transition-colors focus:border-river"
        />
        <button
          type="submit"
          className="rounded-md bg-river px-5 py-3 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          {t("submit")}
        </button>
      </form>

      {!query ? (
        <p className="text-[0.95rem] text-text-2">{t("empty_query")}</p>
      ) : results.total === 0 ? (
        <p className="text-[0.95rem] text-text-2">
          {t("no_results", { q: query })}
        </p>
      ) : (
        <div className="flex flex-col gap-12">
          {results.episodes.length > 0 && (
            <Section title={t("section_episodes")}>
              <ul className="flex flex-col gap-3">
                {results.episodes.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/podcast/${e.slug}`}
                      className="group block rounded-lg border border-bg3 bg-white p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-river-2"
                    >
                      <div className="font-display text-[1.1rem] font-bold leading-tight text-text group-hover:text-river">
                        {e.title}
                      </div>
                      {e.summary && (
                        <p className="mt-1 text-[0.9rem] leading-[1.55] text-text-2 line-clamp-2">
                          {e.summary}
                        </p>
                      )}
                      {e.publishedAt && (
                        <div className="mt-2 text-[0.74rem] uppercase tracking-[0.1em] text-text-2">
                          {new Intl.DateTimeFormat(locale, {
                            dateStyle: "medium",
                          }).format(e.publishedAt)}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {results.posts.length > 0 && (
            <Section title={t("section_posts")}>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {results.posts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="group block h-full rounded-lg border border-bg3 bg-white p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-river-2"
                    >
                      <div className="font-display text-[1.05rem] font-bold leading-tight text-text group-hover:text-river">
                        {p.title}
                      </div>
                      {p.summary && (
                        <p className="mt-1 text-[0.88rem] leading-[1.55] text-text-2 line-clamp-3">
                          {p.summary}
                        </p>
                      )}
                      {p.publishedAt && (
                        <div className="mt-2 text-[0.74rem] uppercase tracking-[0.1em] text-text-2">
                          {new Intl.DateTimeFormat(locale, {
                            dateStyle: "medium",
                          }).format(p.publishedAt)}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {results.news.length > 0 && (
            <Section title={t("section_news")}>
              <ul className="flex flex-col gap-3">
                {results.news.map((n) => {
                  const inner = (
                    <>
                      <div className="font-display text-[1.05rem] font-bold leading-tight text-text group-hover:text-river">
                        {n.title}
                        {n.externalUrl && (
                          <span className="ml-2 text-[0.85rem] text-text-2">↗</span>
                        )}
                      </div>
                      {n.summary && (
                        <p className="mt-1 text-[0.88rem] leading-[1.55] text-text-2 line-clamp-2">
                          {n.summary}
                        </p>
                      )}
                      {n.publishedAt && (
                        <div className="mt-2 text-[0.74rem] uppercase tracking-[0.1em] text-text-2">
                          {new Intl.DateTimeFormat(locale, {
                            dateStyle: "medium",
                          }).format(n.publishedAt)}
                        </div>
                      )}
                    </>
                  );
                  return (
                    <li key={n.id}>
                      {n.externalUrl ? (
                        <a
                          href={n.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block rounded-lg border border-bg3 bg-white p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-river-2"
                        >
                          {inner}
                        </a>
                      ) : (
                        <Link
                          href={`/noticias/${n.slug}`}
                          className="group block rounded-lg border border-bg3 bg-white p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-river-2"
                        >
                          {inner}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {results.guests.length > 0 && (
            <Section title={t("section_guests")}>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {results.guests.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/invitados/${g.slug}`}
                      className="group block rounded-lg border border-bg3 bg-white p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-river-2"
                    >
                      <div className="font-display text-[1rem] font-bold leading-tight text-text group-hover:text-river">
                        {g.fullName}
                      </div>
                      {g.headline && (
                        <p className="mt-1 text-[0.88rem] leading-[1.55] text-text-2 line-clamp-2">
                          {g.headline}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-text-2">
        {title}
      </h2>
      {children}
    </section>
  );
}
