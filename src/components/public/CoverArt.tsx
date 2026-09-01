import Image from "next/image";
import type { ReactNode } from "react";

// Server Component. LA PIEZA CLAVE del rediseño: hoy no hay un solo
// next/image en el proyecto y las portadas se pintan como <div> con
// background-image, lo que impide alt, priority y srcset — y, si falta la
// imagen, no se pinta nada. Aquí el hueco vacío deja de existir.
export function CoverArt({
  src,
  alt = "",
  number,
  badge,
  quote,
  priority = false,
  variant = "contour",
  treatment = "duotone",
  softDuotone = false,
  sizes = "(max-width: 768px) 100vw, 33vw",
  className = "",
}: {
  src?: string | null;
  /** "" para decorativa. Si la imagen aporta información, texto real. */
  alt?: string;
  number?: number | null;
  badge?: string;
  /** Cita usada por variant="quote". */
  quote?: string;
  /** Solo en la PRIMERA imagen sobre el pliegue. Nunca en un listado. */
  priority?: boolean;
  variant?: "contour" | "numeral" | "quote";
  /**
   * Tratamiento de la imagen. "duotone" para la foto propia del objeto;
   * "plate" para las portadas por defecto de temática, que se repiten en
   * muchas tarjetas: la placa oscura las devuelve a fondo y evita que una
   * imagen genérica se lea como la foto real del artículo.
   */
  treatment?: "duotone" | "plate";
  /** Duotono suave: fichas de invitado, donde la cara debe reconocerse. */
  softDuotone?: boolean;
  sizes?: string;
  /** Debe fijar el ratio: aspect-video, aspect-square… para CLS = 0. */
  className?: string;
}) {
  // 1 · Hay imagen → next/image + duotono (o placa, si es la de temática).
  if (src) {
    const skin =
      treatment === "plate"
        ? "plate"
        : `duotone ${softDuotone ? "duotone-soft" : ""}`;
    return (
      <div className={`${skin} relative overflow-hidden ${className}`}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
        {badge ? <Badge>{badge}</Badge> : null}
      </div>
    );
  }

  // 2 · No hay imagen, pero hay cita destacada.
  if (variant === "quote" && quote) {
    return (
      <div className={`flex items-center border-b border-bg3 bg-white px-6 ${className}`}>
        <p className="font-display text-[1.15rem] italic leading-[1.3] text-text text-pretty">
          {quote}
        </p>
      </div>
    );
  }

  // 3 · No hay imagen, pero hay número de episodio.
  if (variant === "numeral") {
    return (
      <div className={`relative flex items-center justify-center bg-bg2 ${className}`}>
        <span
          aria-hidden
          className="font-display text-[clamp(2.5rem,7vw,4rem)] font-black leading-none text-bg3"
        >
          {number ? String(number).padStart(2, "0") : "VV"}
        </span>
        {badge ? <Badge>{badge}</Badge> : null}
      </div>
    );
  }

  // 4 · Último recurso: curvas de nivel generadas en CSS. Cero peticiones.
  return (
    <div className={`topo-tight relative ${className}`}>
      {badge ? <Badge>{badge}</Badge> : null}
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="absolute left-3 top-3 bg-text/70 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-bg">
      {children}
    </span>
  );
}
