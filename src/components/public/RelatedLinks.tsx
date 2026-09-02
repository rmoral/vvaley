import { Link } from "@/i18n/navigation";

// Server Component. Bloque "Seguir leyendo" al final de artículos y noticias.
//
// Por qué un bloque y no enlaces dentro del texto: el paquete editorial trae
// los enlaces internos como dato (`enlaces_internos`), con su texto de ancla y
// su destino, pero ese texto no aparece literal en la prosa en 32 de los 58
// casos. Meterlos dentro obligaría a reescribir frases ajenas una a una, con
// riesgo de estropear el ritmo del artículo. Como bloque, el enlace conserva
// el ancla que escribió redacción, no toca el cuerpo y cumple igual su función:
// que el rastreador y el lector encuentren el resto del sitio.
//
// Los enlaces que YA están dentro del texto se quedan donde están; que uno
// aparezca además aquí es normal en un módulo de navegación.

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

export function RelatedLinks({
  title,
  items,
}: {
  title: string;
  items: RelatedLink[];
}) {
  return (
    <section aria-labelledby="seguir-leyendo">
      <h2
        id="seguir-leyendo"
        className="mb-5 font-display text-sub font-bold text-text text-pretty"
      >
        {title}
      </h2>

      <ul className="flex flex-col gap-px overflow-hidden rounded-lg border border-bg3 bg-bg3">
        {items.map((item) => (
          <li key={item.destino}>
            <Link
              href={item.destino}
              className="group flex items-baseline justify-between gap-4 bg-white px-5 py-4 no-underline transition-colors duration-150 ease-out-soft hover:bg-river/[0.05]"
            >
              {/* El texto de ancla se escribió para ir dentro de una frase, así
                  que empieza en minúscula. En una lista la inicial va en alta;
                  se hace con CSS y no tocando el dato, para que el texto siga
                  sirviendo tal cual si algún día el enlace va dentro del cuerpo.
                  ::first-letter necesita que el elemento no sea inline. */}
              <span className="block text-[0.95rem] leading-[1.5] text-text transition-colors duration-150 first-letter:uppercase group-hover:text-river">
                {item.texto}
              </span>
              <span
                aria-hidden
                className="shrink-0 text-river transition-transform duration-250 ease-out-soft group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
