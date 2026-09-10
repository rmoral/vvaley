import { Link } from "@/i18n/navigation";
import { CoverArt } from "./CoverArt";
import { TagChips } from "./TagChips";

// Server Component. Fila de /noticias. Formato lista con fecha en columna
// izquierda: la noticia es un flujo cronológico, no una rejilla de tarjetas.
//
// La miniatura se añadió después. La fila nació sin imagen, y eso hacía que
// subir una portada a una noticia no cambiara nada en el listado: la portada
// solo se veía al abrir la pieza. Va como miniatura y no como cabecera de
// tarjeta para no romper el ritmo de lectura cronológico: en una lista de
// veinte noticias, veinte imágenes grandes obligan a desplazarse tres pantallas
// para ver lo mismo. Y va bajo la fecha, no al otro lado del texto, porque así
// las dos piezas de metadato ocupan una sola columna y la fila se ajusta a la
// altura del texto en vez de a la del elemento más alto de tres.
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
    coverImageUrl?: string | null;
    /** true cuando la portada es la de temática, no una subida. */
    coverIsDefault?: boolean;
    publishedAt?: Date | null;
    externalUrl?: string | null;
    tags?: { slug: string; name: string }[];
  };
  locale: string;
  /** Texto accesible del ↗, p. ej. "Se abre en otra web". */
  externalLabel: string;
}) {
  const shell =
    "vv-reveal group flex flex-col gap-3 rounded-lg border border-bg3 bg-white p-5 no-underline " +
    "transition-all duration-250 ease-out-soft hover:-translate-y-0.5 hover:border-river-2 hover:shadow-lift " +
    "sm:flex-row sm:items-start sm:gap-6";

  const body = (
    <>
      {/* Fecha y miniatura comparten columna. La fecha ocupa una línea y dejaba
          el resto de su columna en blanco mientras la imagen colgaba al otro
          lado del texto: tres columnas para dos cosas, y la fila crecía hasta
          la más alta de las tres. Apiladas, la altura la marca el texto y las
          filas quedan más juntas. En móvil no hay columnas y sale fecha,
          imagen a ancho completo y texto, que es el orden de lectura. */}
      <div className="flex shrink-0 flex-col gap-2.5 sm:w-40">
        {news.publishedAt ? (
          <time
            dateTime={news.publishedAt.toISOString()}
            className="text-[0.74rem] uppercase tracking-[0.1em] text-river sm:pt-1"
          >
            {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(news.publishedAt)}
          </time>
        ) : null}

        <CoverArt
          src={news.coverImageUrl}
          alt=""
          variant="contour"
          treatment={news.coverIsDefault ? "plate" : "duotone"}
          sizes="(max-width: 640px) 100vw, 160px"
          className="aspect-video w-full overflow-hidden rounded-md"
        />
      </div>

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
