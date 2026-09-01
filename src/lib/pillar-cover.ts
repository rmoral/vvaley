// Resolución de la portada por defecto de temática.
//
// CORRECCIÓN a la tanda 3: dije "se resuelve por slug de tag", pero el schema
// dice otra cosa. Episode tiene un enum `pillar` propio (ECONOMY, COMPANY,
// ENTREPRENEURSHIP, TECH); Post y News no lo tienen y solo cuentan con tags
// libres. Así que hay DOS caminos, no uno:
//
//   Episode        → episode.pillar, directo y fiable
//   Post / News    → primer tag cuyo slug esté en PILLAR_BY_TAG
//
// Los tags son libres y los crea el editor, así que el mapa de abajo hay que
// mantenerlo a mano. Si un post no casa con ninguno, devuelve null y CoverArt
// baja al siguiente escalón (contorno). Eso es correcto: es mejor un contorno
// que una imagen de temática equivocada.

import { existsSync } from "node:fs";
import path from "node:path";

export type Pillar = "ECONOMY" | "COMPANY" | "ENTREPRENEURSHIP" | "TECH";

const COVER_PATH: Record<Pillar, string> = {
  ECONOMY: "/covers/economia.jpg",          // río trenzado sobre grava gris
  COMPANY: "/covers/empresa.jpg",           // pared de roca estratificada
  ENTREPRENEURSHIP: "/covers/emprendimiento.jpg", // cresta ascendente en niebla
  TECH: "/covers/tecnologia.jpg",           // pizarra mojada con escarcha
};

// AÑADIDO: las cuatro imágenes se generan aparte y todavía no están en el
// repositorio. Sin esta comprobación, el escalón de temática apuntaría a
// ficheros inexistentes y next/image serviría un 404 donde antes había un
// contorno digno. Se resuelve una vez al arrancar el proceso — cuatro
// llamadas a stat — y el escalón se activa solo cuando el JPEG existe.
// Módulo de servidor: solo lo importan páginas, nunca un componente cliente.
export const PILLAR_COVER: Partial<Record<Pillar, string>> = Object.fromEntries(
  Object.entries(COVER_PATH).filter(([, p]) =>
    existsSync(path.join(process.cwd(), "public", p)),
  ),
);

/// Slugs de tag que mapean a un pilar. Ampliar según los cree el editor.
const PILLAR_BY_TAG: Record<string, Pillar> = {
  economia: "ECONOMY",
  fiscalidad: "ECONOMY",
  macroeconomia: "ECONOMY",
  empresa: "COMPANY",
  operaciones: "COMPANY",
  estrategia: "COMPANY",
  emprendimiento: "ENTREPRENEURSHIP",
  startups: "ENTREPRENEURSHIP",
  inversion: "ENTREPRENEURSHIP",
  ia: "TECH",
  "ia-andorra": "TECH",
  tecnologia: "TECH",
  automatizacion: "TECH",
};

export function pillarFromTags(tags: { slug: string }[]): Pillar | null {
  for (const t of tags) {
    const p = PILLAR_BY_TAG[t.slug];
    if (p) return p;
  }
  return null;
}

/// Escalera completa: imagen subida → temática → null (que CoverArt resuelve
/// como numeral o contorno según la superficie).
export function resolveCover({
  uploaded,
  pillar,
  tags = [],
}: {
  uploaded?: string | null;
  pillar?: Pillar | null;
  tags?: { slug: string }[];
}): { src: string | null; isDefault: boolean } {
  if (uploaded) return { src: uploaded, isDefault: false };
  const p = pillar ?? pillarFromTags(tags);
  const themed = p ? PILLAR_COVER[p] : undefined;
  if (themed) return { src: themed, isDefault: true };
  return { src: null, isDefault: false };
}
