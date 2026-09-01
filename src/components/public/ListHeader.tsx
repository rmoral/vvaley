import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";

// Server Component. ABSORBIDO AL SISTEMA en la tanda 3: lo extrajimos aquí y
// el diseñador lo dio por bueno — el mapa de la tanda 2 describía la cabecera
// solo para /podcast y las ocho listas la necesitan idéntica.
//
// Props del sistema:
//   · altitude → la cota, para las listas que tienen una asignada
//   · dense    → sin curvas de nivel, para /buscar y /newsletter/archivo,
//                que son herramientas y no secciones editoriales
//
// Cotas asignadas (las mismas que en el mapa de la home):
//   /podcast 01 · 1 023 m   /invitados 03 · 1 890 m
//   /blog y /noticias 02 · 1 410 m   /eventos 03 · 1 890 m
//   /servicios 04 · 2 240 m   ·   /buscar y /archivo: sin cota
//
// AÑADIDO respecto al fichero del diseñador: `width`. Su versión no acota el
// ancho del contenido de la cabecera, y las listas sí lo acotan. Cada página
// pasa el suyo (6xl, 5xl o 4xl).
//
// El sangrado va en el div interior, no en el <header>, para reproducir
// exactamente la caja de las secciones de contenido —`mx-auto max-w-Nxl px-6
// md:px-16`, con el ancho máximo y el sangrado en el MISMO elemento—. Con el
// sangrado en el <header> el h1 se adelanta 64px respecto a las tarjetas de
// debajo en cualquier viewport por encima de 1152px. El fondo y las curvas de
// nivel siguen en el <header>, que es el que va a sangre.
const WIDTH = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;

export function ListHeader({
  title,
  sub,
  eyebrow,
  altitude,
  dense = false,
  width = "6xl",
  children,
}: {
  title: string;
  sub?: string;
  /** Antetítulo. Si falta, no se pinta la línea. */
  eyebrow?: string;
  altitude?: string;
  /** Sin curvas de nivel ni gradiente: cabecera de herramienta. */
  dense?: boolean;
  /** Debe coincidir con el ancho del contenido de la página. */
  width?: keyof typeof WIDTH;
  /** Contenido bajo la entradilla: el formulario de /buscar, filtros, etc. */
  children?: ReactNode;
}) {
  return (
    <header
      className={[
        "relative overflow-hidden pt-32",
        dense ? "bg-bg pb-8" : "hero-bg pb-10",
      ].join(" ")}
    >
      {dense ? null : (
        <div
          aria-hidden
          className="topo-rings pointer-events-none absolute -inset-y-2/5 left-[55%] -right-[10%]"
        />
      )}

      <div className={`relative mx-auto ${WIDTH[width]} px-6 md:px-16`}>
        {eyebrow ? <Eyebrow altitude={altitude}>{eyebrow}</Eyebrow> : null}

        <h1 className="mt-4 font-display text-page font-black text-text text-pretty">
          {title}
        </h1>

        {sub ? (
          <p className="mt-3 max-w-[640px] text-[1.02rem] font-light leading-[1.7] text-text-2">
            {sub}
          </p>
        ) : null}

        {children ? <div className="mt-8 max-w-[720px]">{children}</div> : null}
      </div>
    </header>
  );
}
