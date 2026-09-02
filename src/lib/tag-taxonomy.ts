/**
 * Vocabulario canónico de etiquetas.
 *
 * El paquete editorial trae las etiquetas que escribió redacción, y son
 * legítimas una a una: el problema es el conjunto. Las 20 primeras piezas
 * generaban 57 etiquetas distintas, o sea 57 páginas de etiqueta, 35 de ellas
 * con una sola pieza. Una página de etiqueta con un solo artículo no ayuda a
 * navegar y compite consigo misma en el buscador.
 *
 * Aquí no se borra ninguna idea: se funden las que nombran lo mismo
 * («IA», «IA aplicada», «IA en la empresa» → inteligencia artificial) y se
 * absorben las de un solo uso en la etiqueta general que ya existía
 * («salarios», «precios», «inflación» → costes). El resultado son 21
 * etiquetas, todas con dos piezas o más.
 *
 * El mapa se aplica al importar, no al escribir: redacción sigue etiquetando
 * con su vocabulario y el sitio lo normaliza. Cuando aparezca una etiqueta
 * nueva que merezca página propia, se deja fuera del mapa y ya está.
 */

/** slug de origen → slug canónico. Lo que no está aquí, se queda como está. */
const SINONIMOS: Record<string, string> = {
  // Inteligencia artificial
  ia: "inteligencia-artificial",
  "ia-aplicada": "inteligencia-artificial",
  "ia-en-la-empresa": "inteligencia-artificial",

  // Agentes y su gobierno
  agentes: "gobernanza",
  "agentes-de-ia": "gobernanza",
  riesgo: "gobernanza",

  // Normativa
  cumplimiento: "regulacion",
  "cumplimiento-normativo": "regulacion",
  transparencia: "regulacion",

  // Unión Europea
  europa: "union-europea",
  "acuerdo-de-asociacion": "union-europea",

  // Dinero que entra
  inversion: "financiacion",
  "capital-riesgo": "financiacion",

  // Ecosistema emprendedor
  scaleups: "startups",
  ecosistema: "startups",

  // Dinero que sale
  "costes-laborales": "costes",
  salarios: "costes",
  precios: "costes",
  inflacion: "costes",

  // Personas
  contratacion: "talento",
  "recursos-humanos": "talento",

  // Procesos
  operaciones: "automatizacion",
  productividad: "automatizacion",

  // Contenidos y posicionamiento
  seo: "geo",
  contenidos: "geo",
  "marketing-b2b": "geo",

  // Infraestructura
  infraestructura: "cloud",

  // Retorno
  roi: "ebit",

  // Gestión de empresa
  empresas: "empresa",
  estrategia: "empresa",
  gestion: "empresa",
  expansion: "empresa",

  // Macro
  pib: "economia",
  "tipos-de-interes": "economia",
  inmobiliario: "economia",

  // Ayudas públicas
  subvenciones: "digitalizacion",
};

/** Nombre visible de cada etiqueta canónica que no sale bien de un slug. */
const NOMBRES: Record<string, string> = {
  "inteligencia-artificial": "Inteligencia artificial",
  "union-europea": "Unión Europea",
  "ai-act": "AI Act",
  regulacion: "Regulación",
  financiacion: "Financiación",
  automatizacion: "Automatización",
  digitalizacion: "Digitalización",
  economia: "Economía",
  fiscalidad: "Fiscalidad",
  gobernanza: "Gobernanza",
  costes: "Costes",
  talento: "Talento",
  startups: "Startups",
  emprendimiento: "Emprendimiento",
  empresa: "Empresa",
  andorra: "Andorra",
  espana: "España",
  pymes: "Pymes",
  cloud: "Cloud",
  geo: "GEO",
  ebit: "EBIT",
};

export function canonicalTagSlug(slug: string): string {
  return SINONIMOS[slug] ?? slug;
}

/** Nombre visible para un slug canónico, con caída al nombre de origen. */
export function canonicalTagName(slug: string, original: string): string {
  return NOMBRES[slug] ?? original;
}
