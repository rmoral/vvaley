import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { NewsItem } from "@/components/public/NewsItem";
import { RevealMount } from "@/components/public/RevealMount";
import { ListHeader } from "@/components/public/ListHeader";
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
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");

  const items = await prisma.news.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { translations: true, tags: { include: { tag: true } } },
  });

  const rows = items
    .map((news) => {
      const tr = pickTranslation(news, locale as AppLocale);
      if (!tr) return null;
      return {
        slug: news.slug,
        title: tr.title,
        summary: tr.summary,
        publishedAt: news.publishedAt,
        externalUrl: news.externalUrl,
        tags: news.tags.map((nt) => nt.tag),
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  return (
    <main>
      <RevealMount />
      <ListHeader
        eyebrow={tn("news")}
        altitude={tc("cota_02")}
        title={t("title")}
        sub={t("sub")}
        width="5xl"
      />

      <section className="mx-auto max-w-5xl px-6 pb-24 pt-16 md:px-16">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-2">
            {t("empty")}
          </div>
        ) : (
          <ul className="vv-seq flex flex-col gap-4">
            {rows.map((news) => (
              <li key={news.slug}>
                <NewsItem
                  news={news}
                  locale={locale}
                  externalLabel={tc("externalLink")}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
