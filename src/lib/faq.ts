export type FaqEntry = { pregunta: string; respuesta: string };

/**
 * Valida el JSON que viene de la base de datos. El campo es Json?, así que
 * puede traer cualquier forma: se filtra a pares con las dos cadenas llenas
 * y se devuelve null si no queda ninguno.
 */
export function parseFaq(value: unknown): FaqEntry[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const { pregunta, respuesta } = row as Record<string, unknown>;
    if (typeof pregunta !== "string" || typeof respuesta !== "string") return [];
    const p = pregunta.trim();
    const r = respuesta.trim();
    return p && r ? [{ pregunta: p, respuesta: r }] : [];
  });
  return rows.length > 0 ? rows : null;
}


// Formato de texto del editor de FAQ en el back-office. Se eligió texto plano
// y no JSON porque quien escribe las preguntas es redacción, no desarrollo:
// un corchete mal cerrado no puede tirar el guardado de un artículo.
//
//   ¿Primera pregunta?
//   Respuesta, que puede ocupar
//   varias líneas seguidas.
//
//   ¿Segunda pregunta?
//   Su respuesta.
//
// Bloques separados por una línea en blanco. La primera línea de cada bloque
// es la pregunta y el resto, la respuesta.

export function parseFaqText(input: string | null): FaqEntry[] | null {
  if (!input) return null;
  const entries = input
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) return [];
      return [{ pregunta: lines[0], respuesta: lines.slice(1).join(" ") }];
    });
  return entries.length > 0 ? entries : null;
}

export function faqToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const { pregunta, respuesta } = row as Record<string, unknown>;
      if (typeof pregunta !== "string" || typeof respuesta !== "string") return [];
      return [`${pregunta}\n${respuesta}`];
    })
    .join("\n\n");
}
