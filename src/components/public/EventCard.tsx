import { Link } from "@/i18n/navigation";
import { CoverArt } from "./CoverArt";

// Server Component. Dos densidades en un solo componente, porque el listado
// las necesita ambas:
//   variant="upcoming" → tarjeta con portada, fecha, resumen y aforo
//   variant="past"     → fila compacta, sin portada (el pasado no se vende)
//
// El aforo usa --color-stone, el único color cálido del sistema, reservado a
// avisos. Los textos de aforo llegan ya formateados desde la página, que es
// donde vive registrationGate() y el conteo de inscritos.

export function EventCard({
  event,
  locale,
  locationLabel,
  seatsLabel,
  seatsFull = false,
  variant = "upcoming",
}: {
  event: {
    slug: string;
    title: string;
    summary?: string | null;
    startsAt: Date;
    coverImageUrl?: string | null;
    venueName?: string | null;
  };
  locale: string;
  /** t("loc_online" | "loc_hybrid" | "loc_inperson") ya resuelto. */
  locationLabel: string;
  /** Ya formateado: "12 plazas libres" o el texto de completo. Opcional. */
  seatsLabel?: string;
  seatsFull?: boolean;
  variant?: "upcoming" | "past";
}) {
  if (variant === "past") {
    return (
      <Link
        href={`/eventos/${event.slug}`}
        className="group flex flex-col gap-1 rounded-lg border border-bg3 bg-bg2 p-4 no-underline transition-colors duration-250 ease-out-soft hover:border-river-2 sm:flex-row sm:items-baseline sm:gap-6"
      >
        <time
          dateTime={event.startsAt.toISOString()}
          className="shrink-0 text-[0.74rem] uppercase tracking-[0.1em] text-text-2 sm:w-32"
        >
          {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(event.startsAt)}
        </time>
        <span className="font-medium text-text-2 transition-colors duration-150 group-hover:text-river">
          {event.title}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/eventos/${event.slug}`}
      className="vv-reveal group flex h-full flex-col overflow-hidden rounded-lg border border-bg3 bg-white no-underline transition-all duration-250 ease-out-soft hover:-translate-y-1 hover:border-river-2 hover:shadow-lift"
    >
      <CoverArt
        src={event.coverImageUrl}
        alt=""
        variant="contour"
        className="aspect-video w-full"
      />

      <div className="flex flex-1 flex-col p-6">
        <time
          dateTime={event.startsAt.toISOString()}
          className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-river"
        >
          {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(event.startsAt)}
        </time>

        <h3 className="mt-2.5 font-display text-[1.25rem] font-bold leading-tight text-text transition-colors duration-150 group-hover:text-river text-pretty">
          {event.title}
        </h3>

        {event.summary ? (
          <p className="mt-2 line-clamp-3 text-[0.9rem] leading-[1.55] text-text-2">
            {event.summary}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-[0.74rem] uppercase tracking-[0.08em] text-text-2">
          <span>{locationLabel}</span>
          {event.venueName ? <span>· {event.venueName}</span> : null}
          {seatsLabel ? (
            <span className={`font-semibold ${seatsFull ? "text-stone" : "text-river"}`}>
              · {seatsLabel}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
