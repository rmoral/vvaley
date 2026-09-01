import type { ReactNode } from "react";

// Server Component. Cabecera común de las páginas de listado.
//
// No viene del paquete de diseño: el mapa de sustitución describe este
// patrón para /podcast («hero-bg + topo-rings + Eyebrow + text-page») y el
// resto de listados lo necesitan idéntico. Extraerlo evita repetir el mismo
// bloque en seis páginas y garantiza que todas rompan igual.
export function ListHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  /** Filtros o acciones que van bajo la entradilla. */
  children?: ReactNode;
}) {
  return (
    <header className="hero-bg relative overflow-hidden px-6 pb-14 pt-32 md:px-16">
      <div
        aria-hidden
        className="topo-rings pointer-events-none absolute -inset-y-1/2 left-[45%] -right-[15%]"
      />
      <div className="relative mx-auto max-w-6xl">
        <span aria-hidden className="vv-draw mb-6 block h-px w-7 bg-river" />
        <h1 className="font-display text-page font-black text-text text-pretty">
          {title}
        </h1>
        {sub ? (
          <p className="vv-settle mt-4 max-w-[600px] text-[1.02rem] font-light leading-[1.7] text-text-2 [animation-delay:120ms]">
            {sub}
          </p>
        ) : null}
        {children}
      </div>
    </header>
  );
}
