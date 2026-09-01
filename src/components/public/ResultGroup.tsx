import { Link } from "@/i18n/navigation";

// Server Components para /buscar. Cuatro grupos —episodios, artículos,
// noticias, invitados— con una fila común, en lugar de cuatro bloques de
// markup casi idéntico.
//
// Cambio de fondo respecto al actual: los resultados van sobre bg2 con
// filete, no sobre blanco. En una página que es una lista larga, el blanco
// sobre blanco no separa nada.

export function ResultGroup({
  title,
  count,
  children,
  columns = 1,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-baseline gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-text-2">
        {title}
        {count != null ? <span className="text-river">{count}</span> : null}
      </h2>
      <ul
        className={
          columns === 2
            ? "grid grid-cols-1 gap-3 md:grid-cols-2"
            : "flex flex-col gap-3"
        }
      >
        {children}
      </ul>
    </section>
  );
}

export function ResultRow({
  href,
  externalUrl,
  title,
  summary,
  meta,
  externalLabel,
}: {
  href?: string;
  externalUrl?: string | null;
  title: string;
  summary?: string | null;
  /** Fecha ya formateada u otro dato corto. */
  meta?: string;
  externalLabel?: string;
}) {
  const shell =
    "group block h-full rounded-lg border border-bg3 bg-white p-5 no-underline " +
    "transition-all duration-250 ease-out-soft hover:-translate-y-0.5 hover:border-river-2 hover:shadow-lift";

  const body = (
    <>
      <p className="font-display text-[1.05rem] font-bold leading-tight text-text transition-colors duration-150 group-hover:text-river text-pretty">
        {title}
        {externalUrl ? (
          <>
            <span aria-hidden className="ml-2 text-[0.85rem] text-text-2">↗</span>
            {externalLabel ? <span className="sr-only"> ({externalLabel})</span> : null}
          </>
        ) : null}
      </p>
      {summary ? (
        <p className="mt-1 line-clamp-2 text-[0.88rem] leading-[1.55] text-text-2">{summary}</p>
      ) : null}
      {meta ? (
        <p className="mt-2 text-[0.74rem] uppercase tracking-[0.1em] text-text-2">{meta}</p>
      ) : null}
    </>
  );

  return (
    <li>
      {externalUrl ? (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer" className={shell}>
          {body}
        </a>
      ) : (
        <Link href={href ?? "#"} className={shell}>
          {body}
        </Link>
      )}
    </li>
  );
}
