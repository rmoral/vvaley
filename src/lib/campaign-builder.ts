import { getSiteUrl } from "@/lib/site-url";
import { routing, type AppLocale } from "@/i18n/routing";

type EpisodePick = {
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
};

type ArticlePick = {
  slug: string;
  title: string;
  summary: string | null;
};

export type ComposeInput = {
  locale: AppLocale;
  intro: string | null;
  episode: EpisodePick | null;
  posts: ArticlePick[];
  news: ArticlePick[];
};

const COPY: Record<
  AppLocale,
  {
    greeting: string;
    episodeHeading: string;
    postsHeading: string;
    newsHeading: string;
    listenCta: string;
    readCta: string;
    moreCta: string;
    sign: string;
  }
> = {
  es: {
    greeting: "Hola {{name}},",
    episodeHeading: "## El episodio",
    postsHeading: "## Nuevo en el blog",
    newsHeading: "## Lo que está pasando",
    listenCta: "Escuchar",
    readCta: "Leer",
    moreCta: "Saber más",
    sign: "— El equipo de Valira Valley",
  },
  ca: {
    greeting: "Hola {{name}},",
    episodeHeading: "## L'episodi",
    postsHeading: "## Nou al blog",
    newsHeading: "## El que passa",
    listenCta: "Escoltar",
    readCta: "Llegir",
    moreCta: "Saber-ne més",
    sign: "— L'equip de Valira Valley",
  },
  en: {
    greeting: "Hi {{name}},",
    episodeHeading: "## The episode",
    postsHeading: "## New on the blog",
    newsHeading: "## What's happening",
    listenCta: "Listen",
    readCta: "Read",
    moreCta: "More",
    sign: "— The Valira Valley team",
  },
  fr: {
    greeting: "Bonjour {{name}},",
    episodeHeading: "## L'épisode",
    postsHeading: "## Nouveau sur le blog",
    newsHeading: "## Ce qui se passe",
    listenCta: "Écouter",
    readCta: "Lire",
    moreCta: "En savoir plus",
    sign: "— L'équipe Valira Valley",
  },
};

const PATHS = {
  podcast: "/podcast",
  blog: "/blog",
  news: "/noticias",
};

function localizedUrl(locale: AppLocale, path: string, slug: string): string {
  return `${getSiteUrl()}/${locale}${path}/${slug}`;
}

/**
 * Build a Markdown body from a picked-content selection. Output is the
 * editor's starting point — they can rewrite it freely in the regular
 * campaign editor before sending. Keeps the {{name}} placeholder so the
 * email renderer per recipient still personalises the greeting.
 */
export function buildCampaignBody(input: ComposeInput): string {
  const copy = COPY[input.locale] ?? COPY[routing.defaultLocale];
  const lines: string[] = [];

  lines.push(copy.greeting);
  lines.push("");
  if (input.intro && input.intro.trim()) {
    lines.push(input.intro.trim());
    lines.push("");
  }

  if (input.episode) {
    lines.push(copy.episodeHeading);
    lines.push("");
    lines.push(`**${input.episode.title}**`);
    if (input.episode.subtitle) {
      lines.push("");
      lines.push(input.episode.subtitle);
    }
    if (input.episode.summary) {
      lines.push("");
      lines.push(input.episode.summary);
    }
    lines.push("");
    lines.push(
      `[${copy.listenCta} →](${localizedUrl(input.locale, PATHS.podcast, input.episode.slug)})`,
    );
    lines.push("");
  }

  if (input.posts.length > 0) {
    lines.push(copy.postsHeading);
    lines.push("");
    for (const p of input.posts) {
      const url = localizedUrl(input.locale, PATHS.blog, p.slug);
      const summary = p.summary ? ` — ${p.summary}` : "";
      lines.push(`- **[${p.title}](${url})**${summary}`);
    }
    lines.push("");
  }

  if (input.news.length > 0) {
    lines.push(copy.newsHeading);
    lines.push("");
    for (const n of input.news) {
      const url = localizedUrl(input.locale, PATHS.news, n.slug);
      const summary = n.summary ? ` — ${n.summary}` : "";
      lines.push(`- **[${n.title}](${url})**${summary}`);
    }
    lines.push("");
  }

  lines.push(copy.sign);

  return lines.join("\n");
}

/**
 * Suggested subject like "Valira Valley · enero 2026". Uses the locale
 * to format the month name. The editor edits it freely afterwards.
 */
export function defaultSubject(locale: AppLocale, when: Date = new Date()): string {
  const month = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(when);
  return `Valira Valley · ${month}`;
}
