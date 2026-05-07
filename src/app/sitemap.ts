import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { routing } from "@/i18n/routing";

// Always re-generate the sitemap on demand so newly published content
// shows up without a redeploy.
export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];

const STATIC_PATHS = [
  { path: "", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/podcast", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/blog", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/noticias", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/eventos", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/invitados", priority: 0.7, changeFrequency: "weekly" as const },
];

function localizedEntry(
  path: string,
  base: string,
  lastModified?: Date,
  priority?: number,
  changeFrequency?: SitemapEntry["changeFrequency"],
): SitemapEntry {
  // The default-locale URL is the canonical. Non-default locales go in
  // the `alternates.languages` map so Google understands they're the
  // same content in another language.
  const canonical = `${base}/${routing.defaultLocale}${path}`;
  const languages = Object.fromEntries(
    routing.locales.map((loc) => [loc, `${base}/${loc}${path}`]),
  );
  return {
    url: canonical,
    lastModified,
    priority,
    changeFrequency,
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const entries: SitemapEntry[] = [];

  // Static index pages, one entry per locale (with hreflang alternates).
  for (const { path, priority, changeFrequency } of STATIC_PATHS) {
    entries.push(localizedEntry(path, base, undefined, priority, changeFrequency));
  }

  // Detail pages from the database. We only include published / public
  // items so unindexed drafts never leak.
  const [episodes, guests, posts, news, events] = await Promise.all([
    prisma.episode.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.guest.findMany({
      where: { isPublic: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    // Curated/external news redirect to their source — exclude them so
    // we don't claim authority over URLs we don't own.
    prisma.news.findMany({
      where: { status: "PUBLISHED", externalUrl: null },
      select: { slug: true, updatedAt: true },
    }),
    prisma.event.findMany({
      where: { status: { in: ["PUBLISHED", "COMPLETED"] } },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  for (const ep of episodes) {
    entries.push(
      localizedEntry(`/podcast/${ep.slug}`, base, ep.updatedAt, 0.8, "monthly"),
    );
  }
  for (const g of guests) {
    entries.push(
      localizedEntry(`/invitados/${g.slug}`, base, g.updatedAt, 0.6, "monthly"),
    );
  }
  for (const p of posts) {
    entries.push(
      localizedEntry(`/blog/${p.slug}`, base, p.updatedAt, 0.8, "monthly"),
    );
  }
  for (const n of news) {
    entries.push(
      localizedEntry(`/noticias/${n.slug}`, base, n.updatedAt, 0.7, "monthly"),
    );
  }
  for (const ev of events) {
    entries.push(
      localizedEntry(`/eventos/${ev.slug}`, base, ev.updatedAt, 0.7, "monthly"),
    );
  }

  return entries;
}
