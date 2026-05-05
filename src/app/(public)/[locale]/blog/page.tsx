import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/blog";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function BlogListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blogList");

  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { translations: true, author: { select: { name: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-16">
      <h1 className="mb-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] font-black leading-[1.05] text-text">
        {t("title")}
      </h1>
      <p className="mb-12 max-w-[600px] text-[1.02rem] font-light leading-[1.7] text-text-2">
        {t("sub")}
      </p>

      {posts.length === 0 && (
        <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-3">
          {t("empty")}
        </div>
      )}

      <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {posts.map((post) => {
          const tr = pickTranslation(post, locale as AppLocale);
          if (!tr) return null;
          return (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col gap-3 rounded-lg border border-bg3 bg-white p-6 no-underline transition-all hover:-translate-y-1 hover:border-river-2"
              >
                {post.coverImageUrl && (
                  <div
                    className="aspect-[16/9] w-full rounded-md bg-bg2 bg-cover bg-center"
                    style={{ backgroundImage: `url(${post.coverImageUrl})` }}
                    aria-hidden
                  />
                )}
                {post.publishedAt && (
                  <div className="text-[0.74rem] uppercase tracking-[0.1em] text-river">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(post.publishedAt)}
                  </div>
                )}
                <h2 className="font-display text-[1.3rem] font-bold leading-tight text-text group-hover:text-river">
                  {tr.title}
                </h2>
                {tr.summary && (
                  <p className="text-[0.9rem] leading-[1.6] text-text-2 line-clamp-3">
                    {tr.summary}
                  </p>
                )}
                {post.author?.name && (
                  <div className="mt-auto text-[0.78rem] text-text-3">
                    {t("by")} {post.author.name}
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
