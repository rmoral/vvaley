import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AppLocale } from "@/i18n/routing";

/**
 * Postgres ships text-search dictionaries for english, french and spanish.
 * Catalan isn't bundled, so we use the spanish stemmer for CA — close
 * enough for matching titles and bodies. The values here are
 * whitelisted so it's safe to interpolate via Prisma.raw().
 */
function tsConfig(locale: AppLocale): "english" | "french" | "spanish" {
  if (locale === "en") return "english";
  if (locale === "fr") return "french";
  return "spanish";
}

export type PostHit = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: Date | null;
  rank: number;
};

export type NewsHit = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  externalUrl: string | null;
  publishedAt: Date | null;
  rank: number;
};

export type EpisodeHit = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: Date | null;
  rank: number;
};

export type GuestHit = {
  id: string;
  slug: string;
  fullName: string;
  headline: string | null;
  rank: number;
};

export type SearchResults = {
  posts: PostHit[];
  news: NewsHit[];
  episodes: EpisodeHit[];
  guests: GuestHit[];
  total: number;
};

const PER_BUCKET = 12;

/**
 * Run a full-text search across posts, news, episodes and guests in
 * parallel. Posts and news are filtered by locale (using their
 * translation rows); episodes and guests aren't translated, so they
 * always use the spanish stemmer with unaccent.
 */
export async function searchAll(
  rawQuery: string,
  locale: AppLocale,
): Promise<SearchResults> {
  const q = rawQuery.trim();
  if (!q) {
    return { posts: [], news: [], episodes: [], guests: [], total: 0 };
  }
  const config = tsConfig(locale);

  const [posts, news, episodes, guests] = await Promise.all([
    searchPosts(q, locale, config),
    searchNews(q, locale, config),
    searchEpisodes(q),
    searchGuests(q),
  ]);

  return {
    posts,
    news,
    episodes,
    guests,
    total: posts.length + news.length + episodes.length + guests.length,
  };
}

async function searchPosts(
  q: string,
  locale: AppLocale,
  config: ReturnType<typeof tsConfig>,
): Promise<PostHit[]> {
  const cfg = Prisma.raw(`'${config}'::regconfig`);
  return prisma.$queryRaw<PostHit[]>`
    SELECT p.id, p.slug, t.title, t.summary, p."publishedAt",
      ts_rank(
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.title, ''))), 'A') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.summary, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.body, ''))), 'C'),
        plainto_tsquery(${cfg}, unaccent(${q}))
      ) AS rank
    FROM "Post" p
    JOIN "PostTranslation" t ON t."postId" = p.id
    WHERE p.status = 'PUBLISHED'
      AND t.locale = ${locale}
      AND (
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.title, ''))), 'A') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.summary, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.body, ''))), 'C')
      ) @@ plainto_tsquery(${cfg}, unaccent(${q}))
    ORDER BY rank DESC, p."publishedAt" DESC NULLS LAST
    LIMIT ${PER_BUCKET};
  `;
}

async function searchNews(
  q: string,
  locale: AppLocale,
  config: ReturnType<typeof tsConfig>,
): Promise<NewsHit[]> {
  const cfg = Prisma.raw(`'${config}'::regconfig`);
  return prisma.$queryRaw<NewsHit[]>`
    SELECT n.id, n.slug, t.title, t.summary, n."externalUrl", n."publishedAt",
      ts_rank(
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.title, ''))), 'A') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.summary, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.body, ''))), 'C'),
        plainto_tsquery(${cfg}, unaccent(${q}))
      ) AS rank
    FROM "News" n
    JOIN "NewsTranslation" t ON t."newsId" = n.id
    WHERE n.status = 'PUBLISHED'
      AND t.locale = ${locale}
      AND (
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.title, ''))), 'A') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.summary, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(t.body, ''))), 'C')
      ) @@ plainto_tsquery(${cfg}, unaccent(${q}))
    ORDER BY rank DESC, n."publishedAt" DESC NULLS LAST
    LIMIT ${PER_BUCKET};
  `;
}

async function searchEpisodes(q: string): Promise<EpisodeHit[]> {
  const cfg = Prisma.raw(`'spanish'::regconfig`);
  return prisma.$queryRaw<EpisodeHit[]>`
    SELECT e.id, e.slug, e.title, e.summary, e."publishedAt",
      ts_rank(
        setweight(to_tsvector(${cfg}, unaccent(coalesce(e.title, ''))), 'A') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(e.subtitle, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(e.summary, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(e."showNotes", ''))), 'C'),
        plainto_tsquery(${cfg}, unaccent(${q}))
      ) AS rank
    FROM "Episode" e
    WHERE e.status = 'PUBLISHED'
      AND (
        setweight(to_tsvector(${cfg}, unaccent(coalesce(e.title, ''))), 'A') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(e.subtitle, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(e.summary, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(e."showNotes", ''))), 'C')
      ) @@ plainto_tsquery(${cfg}, unaccent(${q}))
    ORDER BY rank DESC, e."publishedAt" DESC NULLS LAST
    LIMIT ${PER_BUCKET};
  `;
}

async function searchGuests(q: string): Promise<GuestHit[]> {
  const cfg = Prisma.raw(`'spanish'::regconfig`);
  return prisma.$queryRaw<GuestHit[]>`
    SELECT g.id, g.slug, g."fullName", g.headline,
      ts_rank(
        setweight(to_tsvector(${cfg}, unaccent(coalesce(g."fullName", ''))), 'A') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(g.headline, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(g.company, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(g.role, ''))), 'C') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(g.bio, ''))), 'C'),
        plainto_tsquery(${cfg}, unaccent(${q}))
      ) AS rank
    FROM "Guest" g
    WHERE g."isPublic" = true
      AND (
        setweight(to_tsvector(${cfg}, unaccent(coalesce(g."fullName", ''))), 'A') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(g.headline, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(g.company, ''))), 'B') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(g.role, ''))), 'C') ||
        setweight(to_tsvector(${cfg}, unaccent(coalesce(g.bio, ''))), 'C')
      ) @@ plainto_tsquery(${cfg}, unaccent(${q}))
    ORDER BY rank DESC, g."fullName" ASC
    LIMIT ${PER_BUCKET};
  `;
}
