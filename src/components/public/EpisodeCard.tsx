import { Link } from "@/i18n/navigation";
import { CoverArt } from "./CoverArt";

// Server Component. Hover 100% CSS. Toda la tarjeta es el enlace.
export type EpisodeCardData = {
  slug: string;
  number: number | null;
  title: string;
  summary?: string | null;
  coverImageUrl?: string | null;
  durationSec?: number | null;
  publishedAt?: Date | null;
  guests?: string;
  /** Cota decorativa de la sección, p. ej. "Cota 1 023 m". */
  altitude?: string;
};

export function EpisodeCard({
  ep,
  locale,
  epLabel,
  priority = false,
}: {
  ep: EpisodeCardData;
  locale: string;
  /** Traducción de "min" o de la etiqueta de episodio. */
  epLabel?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/podcast/${ep.slug}`}
      className="vv-reveal group flex h-full flex-col overflow-hidden rounded-lg border border-bg3 bg-white no-underline transition-all duration-250 ease-out-soft hover:-translate-y-1 hover:border-river-2 hover:shadow-lift"
    >
      <CoverArt
        src={ep.coverImageUrl}
        alt=""
        number={ep.number}
        priority={priority}
        badge={ep.number ? `#${ep.number}` : undefined}
        variant={ep.number ? "numeral" : "contour"}
        className="aspect-video w-full"
      />

      <div className="flex flex-1 flex-col p-6">
        {(ep.number || ep.altitude) && (
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-text-2">
            {ep.number ? String(ep.number).padStart(2, "0") : null}
            {ep.number && ep.altitude ? " · " : null}
            {ep.altitude}
          </p>
        )}

        <h3 className="mt-2.5 font-display text-card font-bold text-text transition-colors duration-150 group-hover:text-river text-pretty">
          {ep.title}
        </h3>

        {ep.summary ? (
          <p className="mt-2 line-clamp-3 text-[0.83rem] leading-[1.6] text-text-2">
            {ep.summary}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-x-3.5 gap-y-1 pt-3.5 text-[0.66rem] uppercase tracking-[0.08em] text-text-2">
          {ep.guests ? <span>{ep.guests}</span> : null}
          {ep.durationSec ? (
            <span>
              {Math.round(ep.durationSec / 60)} {epLabel ?? "min"}
            </span>
          ) : null}
          {ep.publishedAt ? (
            <time dateTime={ep.publishedAt.toISOString()}>
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(ep.publishedAt)}
            </time>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
