/**
 * Formatos recurrentes de eventos.
 *
 * El plan de empresa define cuatro: Meetup (mensual), Table (trimestral),
 * Summit (anual) y Ski (de temporada). Cada edición es un Event con su fecha,
 * su aforo y su invitado; lo que las agrupa es el campo `series`.
 *
 * Por qué existe este campo en lugar de una URL por edición: el meetup es
 * mensual y toda la comunicación —LinkedIn, podcast, siembra privada, el email
 * de la lista— apunta a un único enlace. Si cada edición tuviera su propia URL
 * habría que reescribir ese enlace cada mes en todas partes, y el
 * posicionamiento se repartiría entre doce páginas que compiten entre sí en vez
 * de acumularse en una. /meetup es fijo y por dentro resuelve la edición que
 * toca.
 */

export const SERIES = {
  MEETUP: "meetup",
  CAFE_IA: "cafe-ia",
  TABLE: "table",
  SUMMIT: "summit",
  SKI: "ski",
} as const;

export type Series = (typeof SERIES)[keyof typeof SERIES];

export const SERIES_VALUES: readonly string[] = Object.values(SERIES);

/**
 * Series que tienen landing pública. Es la plantilla: una entrada aquí más
 * un bloque de textos en i18n bajo `ns` es todo lo que hace falta para que una
 * serie nueva tenga su página. La ruta, la etiqueta del back-office, el
 * sitemap y el bloque de descubrimiento en /eventos salen de este registro,
 * así que no hay cuatro listas que mantener a mano.
 *
 * `variant` es el estrato visual de la cabecera: "ink" es el fondo oscuro del
 * bloque comercial, que comparte el meetup con /servicios; "river" es el teal
 * de marca a fondo completo, más llamativo, para las series que quieren
 * destacar frente a las demás.
 */
export type LandingVariant = "ink" | "river";

export const LANDINGS: Record<string, { path: string; ns: string; variant: LandingVariant }> = {
  [SERIES.MEETUP]: { path: "/meetup", ns: "meetup", variant: "ink" },
  [SERIES.CAFE_IA]: { path: "/cafe-ia", ns: "cafeIa", variant: "river" },
};

/** Serie a la que pertenece una ruta de landing, o null si no es una. */
export function seriesForPath(path: string): string | null {
  for (const [series, l] of Object.entries(LANDINGS)) {
    if (l.path === path) return series;
  }
  return null;
}

/** Duración asumida cuando una edición no declara hora de fin. */
const DURACION_POR_DEFECTO_MS = 4 * 60 * 60 * 1000;

type Edicion = { startsAt: Date; endsAt: Date | null };

/**
 * Una edición deja de ser la próxima cuando termina, no cuando empieza.
 *
 * Importa más de lo que parece: el meetup va de 19:00 a 22:00 y es justo
 * durante esas tres horas cuando más gente entra en la landing desde el móvil,
 * buscando la dirección o el horario. Si a las 19:01 la página saltara a
 * «próxima edición por anunciar», dejaría tirado al asistente que va de camino.
 */
export function haTerminado(edicion: Edicion, ahora: Date): boolean {
  const fin =
    edicion.endsAt ?? new Date(edicion.startsAt.getTime() + DURACION_POR_DEFECTO_MS);
  return fin.getTime() < ahora.getTime();
}

/**
 * Elige qué edición pinta la landing: la primera que no haya terminado.
 *
 * Espera la lista ordenada por fecha ascendente. Devuelve null cuando no hay
 * ninguna en pie, y entonces la página muestra el formato en abstracto y
 * recoge emails, que es lo correcto: una landing sin fecha sigue sirviendo para
 * construir lista, y es exactamente la situación del mes de preparación.
 */
export function proximaEdicion<T extends Edicion>(
  ediciones: readonly T[],
  ahora: Date,
): T | null {
  for (const e of ediciones) {
    if (!haTerminado(e, ahora)) return e;
  }
  return null;
}

/**
 * Precio en el idioma del visitante. null cuando no hay precio publicado, que
 * no es lo mismo que ser gratis: una edición sin precio decidido todavía no
 * debe anunciar «gratis».
 */
export function formatearPrecio(
  cents: number | null | undefined,
  locale: string,
): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    // 20 € y no 20,00 €: los importes redondos se leen mejor sin decimales,
    // y los que no lo son (12,50 €) los conservan.
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
