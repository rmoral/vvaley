import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { TagChips } from "@/components/public/TagChips";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function NewsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newsList");

  const items = await prisma.news.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: {
      translations: true,
      tags: { include: { tag: true } },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-16">
      <h1 className="mb-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] font-black leading-[1.05] text-text">
        {t("title")}
      </h1>
      <p className="mb-12 max-w-[600px] text-[1.02rem] font-light leading-[1.7] text-text-2">
        {t("sub")}
      </p>

      {items.length === 0 && (
        <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-3">
          {t("empty")}
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {items.map((news) => {
          const tr = pickTranslation(news, locale as AppLocale);
          if (!tr) return null;

          const Wrapper = ({ children }: { children: React.ReactNode }) =>
            news.externalUrl ? (
              <a
                href={news.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-2 rounded-lg border border-bg3 bg-white p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-river-2 sm:flex-row sm:items-baseline sm:gap-6"
              >
                {children}
              </a>
            ) : (
              <Link
                href={`/noticias/${news.slug}`}
                className="group flex flex-col gap-2 rounded-lg border border-bg3 bg-white p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-river-2 sm:flex-row sm:items-baseline sm:gap-6"
              >
                {children}
              </Link>
            );

          return (
            <li key={news.id}>
              <Wrapper>
                {news.publishedAt && (
                  <time
                    className="shrink-0 text-[0.74rem] uppercase tracking-[0.1em] text-river sm:w-32"
                    dateTime={news.publishedAt.toISOString()}
                  >
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                    }).format(news.publishedAt)}
                  </time>
                )}
                <div className="flex-1">
                  <h2 className="font-display text-[1.2rem] font-bold leading-tight text-text group-hover:text-river">
                    {tr.title}
                    {news.externalUrl && (
                      <span className="ml-2 text-[0.85rem] text-text-3">↗</span>
                    )}
                  </h2>
                  {tr.summary && (
                    <p className="mt-1 text-[0.92rem] leading-[1.6] text-text-2">
                      {tr.summary}
                    </p>
                  )}
                  {news.tags.length > 0 && (
                    <div className="mt-2">
                      <TagChips
                        tags={news.tags.map((nt) => nt.tag)}
                        size="sm"
                        linked={false}
                      />
                    </div>
                  )}
                </div>
              </Wrapper>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
