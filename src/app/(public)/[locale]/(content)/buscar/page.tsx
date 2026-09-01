import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { searchAll } from "@/lib/search";
import { ResultGroup, ResultRow } from "@/components/public/ResultGroup";
import { ListHeader } from "@/components/public/ListHeader";
import { Button } from "@/components/ui/Button";
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
  return { title: t("title"), description: t("sub") };
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
  const tc = await getTranslations("common");

  const query = q.trim();
  const results = query
    ? await searchAll(query, locale as AppLocale)
    : { posts: [], news: [], episodes: [], guests: [], total: 0 };

  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <main>
      <ListHeader title={t("title")} sub={t("sub")}>
        <form
          action="/buscar"
          method="get"
          className="mt-8 flex flex-col gap-2 sm:flex-row sm:max-w-2xl"
        >
          <label htmlFor="q" className="sr-only">
            {t("title")}
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={t("placeholder")}
            autoFocus
            className="flex-1 rounded-btn border border-bg3 bg-white px-4 py-3 text-[1rem] text-text outline-none transition-colors duration-150 ease-out-soft placeholder:text-text-2/60 focus:border-river"
          />
          <Button type="submit">{t("submit")}</Button>
        </form>
      </ListHeader>

      <div className="mx-auto max-w-5xl px-6 pb-24 pt-14 md:px-16">
        {!query ? (
          <p className="text-[0.95rem] text-text-2">{t("empty_query")}</p>
        ) : results.total === 0 ? (
          <p className="text-[0.95rem] text-text-2">
            {t("no_results", { q: query })}
          </p>
        ) : (
          <div className="flex flex-col gap-12">
            {results.episodes.length > 0 && (
              <ResultGroup
                title={t("section_episodes")}
                count={results.episodes.length}
              >
                {results.episodes.map((e) => (
                  <ResultRow
                    key={e.id}
                    href={`/podcast/${e.slug}`}
                    title={e.title}
                    summary={e.summary}
                    meta={e.publishedAt ? fmt.format(e.publishedAt) : undefined}
                  />
                ))}
              </ResultGroup>
            )}

            {results.posts.length > 0 && (
              <ResultGroup
                title={t("section_posts")}
                count={results.posts.length}
                columns={2}
              >
                {results.posts.map((p) => (
                  <ResultRow
                    key={p.id}
                    href={`/blog/${p.slug}`}
                    title={p.title}
                    summary={p.summary}
                    meta={p.publishedAt ? fmt.format(p.publishedAt) : undefined}
                  />
                ))}
              </ResultGroup>
            )}

            {results.news.length > 0 && (
              <ResultGroup
                title={t("section_news")}
                count={results.news.length}
              >
                {results.news.map((n) => (
                  <ResultRow
                    key={n.id}
                    href={`/noticias/${n.slug}`}
                    externalUrl={n.externalUrl}
                    externalLabel={tc("externalLink")}
                    title={n.title}
                    summary={n.summary}
                    meta={n.publishedAt ? fmt.format(n.publishedAt) : undefined}
                  />
                ))}
              </ResultGroup>
            )}

            {results.guests.length > 0 && (
              <ResultGroup
                title={t("section_guests")}
                count={results.guests.length}
                columns={2}
              >
                {results.guests.map((g) => (
                  <ResultRow
                    key={g.id}
                    href={`/invitados/${g.slug}`}
                    title={g.fullName}
                    summary={g.headline}
                  />
                ))}
              </ResultGroup>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
