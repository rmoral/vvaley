// Validación de los enlaces internos que guarda `relatedLinks`. Vive aquí y
// no en el componente porque es normalización de datos de la base, y así se
// puede probar sin arrastrar React ni Prisma.
export type RelatedLink = { texto: string; destino: string };

/**
 * Valida el JSON de la base de datos. Solo pasan las rutas internas: un
 * destino externo aquí sería un enlace saliente disfrazado de navegación.
 */
export function parseRelatedLinks(value: unknown): RelatedLink[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const rows = value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const { texto, destino } = row as Record<string, unknown>;
    if (typeof texto !== "string" || typeof destino !== "string") return [];
    const t = texto.trim();
    const d = destino.trim();
    if (!t || !d.startsWith("/") || d.startsWith("//")) return [];
    if (seen.has(d)) return [];
    seen.add(d);
    return [{ texto: t, destino: d }];
  });
  return rows.length > 0 ? rows : null;
}
