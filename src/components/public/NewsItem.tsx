import { Link } from "@/i18n/navigation";
import { TagChips } from "./TagChips";

// Server Component. Fila de /noticias. Formato lista con fecha en columna
// izquierda: la noticia es un flujo cronológico, no una rejilla de tarjetas.
//
// externalUrl: si la noticia es curada, el enlace sale fuera en pestaña nueva
// y se marca con ↗. El indicador lleva su propio <span class="sr-only"> con
// el texto traducido, porque una flecha sola no la anuncia un lector.

export function NewsItem({
  news,
  locale,
  externalLabel,
}: {
  news: {
    slug: string;
    title: string;
    summary?: string | null;
    publishedAt?: Date | null;
    externalUrl?: string | null;
    tags?: { slug: string; name: string }[];
  };
  locale: string;
  /** Texto accesible del ↗, p. ej. "Se abre en otra web". */
  externalLabel: string;
}) {
  const shell =
    "vv-reveal group flex flex-col gap-2 rounded-lg border border-bg3 bg-white p-5 no-underline " +
    "transition-all duration-250 ease-out-soft hover:-translate-y-0.5 hover:border-river-2 hover:shadow-lift " +
    "sm:flex-row sm:items-baseline sm:gap-6";

  const body = (
    <>
      {news.publishedAt ? (
        <time
          dateTime={news.publishedAt.toISOString()}
          className="shrink-0 text-[0.74rem] uppercase tracking-[0.1em] text-river sm:w-32"
        >
          {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(news.publishedAt)}
        </time>
      ) : null}

      <div className="flex-1">
        <h2 className="font-display text-card font-bold leading-tight text-text transition-colors duration-150 group-hover:text-river text-pretty">
          {news.title}
          {news.externalUrl ? (
            <>
              <span aria-hidden className="ml-2 text-[0.85rem] text-text-2">↗</span>
              <span className="sr-only"> ({externalLabel})</span>
            </>
          ) : null}
        </h2>

        {news.summary ? (
          <p className="mt-1 text-[0.92rem] leading-[1.6] text-text-2">{news.summary}</p>
        ) : null}

        {news.tags && news.tags.length > 0 ? (
          <div className="mt-2">
            <TagChips tags={news.tags} size="sm" linked={false} />
          </div>
        ) : null}
      </div>
    </>
  );

  if (news.externalUrl) {
    return (
      <a href={news.externalUrl} target="_blank" rel="noopener noreferrer" className={shell}>
        {body}
      </a>
    );
  }

  return (
    <Link href={`/noticias/${news.slug}`} className={shell}>
      {body}
    </Link>
  );
}
