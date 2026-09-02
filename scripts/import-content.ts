/**
 * Importador del paquete editorial en markdown con front-matter.
 *
 *   pnpm content:import <directorio> [--publish] [--author=email@dominio]
 *
 * El directorio debe contener `articulos/` y/o `noticias/` con ficheros .md
 * cuyo front-matter siga `_recursos/plantilla.md` del paquete.
 *
 * Es IDEMPOTENTE: la clave es el `slug`. Reimportar el mismo paquete
 * actualiza las piezas en lugar de duplicarlas. Sin --publish se respeta el
 * estado que ya tuvieran (una pieza publicada no vuelve a borrador por
 * reimportar) y las nuevas entran como borrador; con --publish se publican
 * todas, también las que ya estuvieran. Las traducciones del idioma importado
 * se reemplazan; las de otros idiomas no se tocan.
 *
 * PORTADAS: las imágenes llegan aparte y por tandas. Si el fichero que pide
 * `imagen_destacada.nombre_archivo` ya está en `public/covers/piezas/`, se
 * asigna; si no, la pieza se queda sin portada y el resumen final la lista
 * como pendiente. Reimportar más adelante la recoge sin tocar nada más.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

// El .env se carga a mano ANTES de instanciar PrismaClient. Next lo lee solo,
// pero un script suelto lanzado con tsx no: sin esto el import falla en el
// servidor con "Environment variable not found: DATABASE_URL", justo donde
// nadie tiene el entorno exportado en su shell.
loadDotEnv();

import { PrismaClient, PostStatus, NewsStatus, Prisma } from "@prisma/client";
import { parse as parseYaml } from "yaml";
import { canonicalTagSlug, canonicalTagName } from "../src/lib/tag-taxonomy";

function loadDotEnv() {
  const file = path.join(process.cwd(), ".env");
  if (!existsSync(file)) return;
  for (const linea of readFileSync(file, "utf8").split("\n")) {
    const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, clave] = m;
    // Lo ya presente en el entorno manda sobre el fichero.
    if (process.env[clave] !== undefined) continue;
    process.env[clave] = m[2].trim().replace(/^(['"])(.*)\1$/s, "$2");
  }
}

const prisma = new PrismaClient();

// El paquete viene en castellano. Si algún día llega traducido, este es el
// único punto que hay que tocar.
const LOCALE = "es";

type FrontMatter = {
  tipo: "articulo" | "noticia";
  titulo_h1: string;
  title_tag?: string;
  slug: string;
  meta_description?: string;
  categoria?: string;
  etiquetas?: string[];
  autor?: string;
  fecha_publicacion?: string;
  resumen_geo?: string;
  imagen_destacada?: { alt?: string; nombre_archivo?: string };
  faq?: { pregunta: string; respuesta: string }[];
  enlaces_internos?: { texto: string; destino: string }[];
};

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Separa el front-matter YAML del cuerpo markdown. */
function splitFrontMatter(raw: string): { data: FrontMatter; body: string } {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) {
    throw new Error("el fichero no empieza por front-matter");
  }
  const end = text.indexOf("\n---\n", 3);
  if (end === -1) throw new Error("front-matter sin cierre");
  return {
    data: parseYaml(text.slice(4, end + 1)) as FrontMatter,
    body: text.slice(end + 5).trim(),
  };
}

type Faq = { pregunta: string; respuesta: string };

function cleanFaq(faq: FrontMatter["faq"]): Faq[] {
  if (!Array.isArray(faq)) return [];
  return faq
    .filter((f) => typeof f?.pregunta === "string" && typeof f?.respuesta === "string")
    .map((f) => ({ pregunta: f.pregunta.trim(), respuesta: f.respuesta.trim() }))
    .filter((f) => f.pregunta && f.respuesta);
}

/**
 * El cuerpo trae además su propia sección "## Preguntas frecuentes", escrita
 * como prosa. En 12 de las 20 piezas del paquete repite las preguntas del
 * front-matter y en 8 son preguntas DISTINTAS, así que no basta con borrar
 * una de las dos.
 *
 * Aquí se extrae la sección y se devuelve por separado, para fundirla con la
 * del front-matter. Motivo: el JSON-LD de tipo FAQPage solo es legítimo si
 * cada pregunta que declara está visible en la página. Con dos juegos —uno
 * visible y otro solo en el marcado— el sitio estaría declarando contenido
 * que el lector no ve, que es justo lo que Google sanciona.
 *
 * La sección va siempre entre "## Preguntas frecuentes" y "## Fuentes".
 */
function extractBodyFaq(body: string): { body: string; faq: Faq[] } {
  // El final de la sección es el siguiente encabezado de nivel 2 o el fin del
  // texto. Ojo con `$`: con la bandera `m` casa al final de CADA línea, así
  // que cortaría la captura en el primer salto y se perderían las preguntas.
  // `(?![\s\S])` es el fin real de la cadena.
  const m = body.match(/^## Preguntas frecuentes[^\n]*\n([\s\S]*?)(?=\n## |(?![\s\S]))/m);
  if (!m) return { body, faq: [] };

  const faq: Faq[] = [];
  const bloques = m[1].split(/^### /m).slice(1);
  for (const bloque of bloques) {
    const [primera, ...resto] = bloque.split("\n");
    const pregunta = primera.trim();
    const respuesta = resto.join("\n").trim().replace(/\s*\n\s*/g, " ");
    if (pregunta && respuesta) faq.push({ pregunta, respuesta });
  }

  return { body: (body.slice(0, m.index) + body.slice(m.index! + m[0].length)).trim(), faq };
}

/** Clave de comparación de preguntas: sin acentos, signos ni mayúsculas. */
function faqKey(q: string): string {
  return q
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Funde los dos juegos sin perder ninguna pregunta. */
function mergeFaq(...listas: Faq[][]): Faq[] | null {
  const out: Faq[] = [];
  const seen = new Set<string>();
  for (const lista of listas) {
    for (const f of lista) {
      const k = faqKey(f.pregunta);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(f);
    }
  }
  return out.length > 0 ? out : null;
}

/**
 * Enlaces internos, tal cual los escribió redacción. Se filtran a rutas del
 * propio sitio: un destino externo aquí sería un enlace saliente disfrazado
 * de navegación interna.
 */
function cleanLinks(links: FrontMatter["enlaces_internos"]) {
  if (!Array.isArray(links)) return [];
  const seen = new Set<string>();
  return links.flatMap((l) => {
    if (typeof l?.texto !== "string" || typeof l?.destino !== "string") return [];
    const texto = l.texto.trim();
    const destino = l.destino.trim();
    if (!texto || !destino.startsWith("/") || destino.startsWith("//")) return [];
    if (seen.has(destino)) return [];
    seen.add(destino);
    return [{ texto, destino }];
  });
}

/** Categoría + etiquetas, deduplicadas por slug, en un solo conjunto. */
async function resolveTagIds(fm: FrontMatter): Promise<string[]> {
  const names = [...(fm.categoria ? [fm.categoria] : []), ...(fm.etiquetas ?? [])];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    // Se normaliza contra el vocabulario canónico: redacción etiqueta con su
    // vocabulario y el sitio lo funde para no acabar con una página de
    // etiqueta por pieza.
    const slug = canonicalTagSlug(slugify(name));
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { slug, name: canonicalTagName(slug, name.trim()) },
    });
    ids.push(tag.id);
  }
  return ids;
}


// Carpeta de portadas de artículo y noticia. Separada de `public/covers/`, que
// guarda las cuatro imágenes por temática del sistema de diseño. Se llama
// "piezas" y no "articulos" porque aquí van también las portadas de noticia.
const COVER_DIR = "covers/piezas";

/**
 * Ruta pública de la portada si el fichero ya existe en disco, o null.
 * `nombre_archivo` viene del front-matter, siempre como "<slug>.jpg".
 */
function coverPath(nombre?: string): string | null {
  if (!nombre) return null;
  const rel = `/${COVER_DIR}/${nombre}`;
  return existsSync(path.join(process.cwd(), "public", rel)) ? rel : null;
}

/**
 * Qué hacer con `coverImageUrl` al reimportar.
 *
 * Se asigna cuando la pieza no tiene portada, y se actualiza cuando la que
 * tiene salió de esta misma convención. Si alguien subió otra desde el
 * back-office, se respeta: reimportar el paquete no debe deshacer un cambio
 * hecho a mano en la web.
 */
function nextCover(actual: string | null | undefined, encontrada: string | null) {
  if (!encontrada) return undefined; // sin fichero todavía: no se toca
  if (!actual || actual.startsWith(`/${COVER_DIR}/`)) return encontrada;
  return undefined;
}

type Result = {
  slug: string;
  accion: "creado" | "actualizado";
  /** Nombre del fichero de portada que la pieza espera. */
  imagen?: string;
  /** true si esa portada ya está en disco y se ha asignado. */
  portada: boolean;
  /** Destinos de los enlaces internos, para comprobar que existen. */
  destinos: string[];
};

async function importOne(
  file: string,
  opts: { publish: boolean; authorId: string | null },
): Promise<Result> {
  const { data: fm, body: raw } = splitFrontMatter(readFileSync(file, "utf8"));
  if (!fm.slug || !fm.titulo_h1) throw new Error("falta slug o titulo_h1");

  // El FAQ sale del cuerpo y se funde con el del front-matter: uno solo,
  // visible, y el mismo que declara el JSON-LD.
  const { body, faq: faqCuerpo } = extractBodyFaq(raw);
  const faq = mergeFaq(cleanFaq(fm.faq), faqCuerpo);

  const enlaces = cleanLinks(fm.enlaces_internos);
  const tagIds = await resolveTagIds(fm);
  const publishedAt = fm.fecha_publicacion ? new Date(fm.fecha_publicacion) : null;
  if (publishedAt && Number.isNaN(publishedAt.getTime())) {
    throw new Error(`fecha_publicacion inválida: ${fm.fecha_publicacion}`);
  }

  const translation = {
    locale: LOCALE,
    title: fm.titulo_h1,
    // resumen_geo es la entradilla visible; meta_description es el snippet
    // del buscador. Son textos distintos y van a campos distintos.
    summary: fm.resumen_geo ?? null,
    body,
    seoTitle: fm.title_tag ?? null,
    metaDescription: fm.meta_description ?? null,
    coverImageAlt: fm.imagen_destacada?.alt ?? null,
    faq: (faq ?? Prisma.DbNull) as Prisma.InputJsonValue,
    relatedLinks: (enlaces.length > 0
      ? enlaces
      : Prisma.DbNull) as Prisma.InputJsonValue,
  };

  const isNews = fm.tipo === "noticia";
  const imagen = fm.imagen_destacada?.nombre_archivo;
  const cover = coverPath(imagen);

  if (isNews) {
    const existing = await prisma.news.findUnique({
      where: { slug: fm.slug },
      select: { id: true, status: true, coverImageUrl: true },
    });
    // Con --publish, publica; es una orden explícita y vale también para lo
    // ya importado. Sin la bandera, se respeta el estado que ya tuviera: una
    // pieza publicada no debe volver a borrador por reimportar el paquete.
    const status = opts.publish
      ? NewsStatus.PUBLISHED
      : (existing?.status ?? NewsStatus.DRAFT);

    if (existing) {
      await prisma.newsTranslation.deleteMany({
        where: { newsId: existing.id, locale: LOCALE },
      });
      await prisma.news.update({
        where: { id: existing.id },
        data: {
          status,
          publishedAt,
          coverImageUrl: nextCover(existing.coverImageUrl, cover),
          authorId: opts.authorId ?? undefined,
          translations: { create: translation },
          tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
        },
      });
      return { slug: fm.slug, accion: "actualizado", imagen, portada: cover !== null, destinos: enlaces.map((e) => e.destino) };
    }

    await prisma.news.create({
      data: {
        slug: fm.slug,
        status,
        publishedAt,
        coverImageUrl: cover,
        authorId: opts.authorId,
        translations: { create: translation },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });
    return { slug: fm.slug, accion: "creado", imagen, portada: cover !== null, destinos: enlaces.map((e) => e.destino) };
  }

  const existing = await prisma.post.findUnique({
    where: { slug: fm.slug },
    select: { id: true, status: true, coverImageUrl: true },
  });
  const status = opts.publish
    ? PostStatus.PUBLISHED
    : (existing?.status ?? PostStatus.DRAFT);

  if (existing) {
    await prisma.postTranslation.deleteMany({
      where: { postId: existing.id, locale: LOCALE },
    });
    await prisma.post.update({
      where: { id: existing.id },
      data: {
        status,
        publishedAt,
        coverImageUrl: nextCover(existing.coverImageUrl, cover),
        authorId: opts.authorId ?? undefined,
        translations: { create: translation },
        tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
      },
    });
    return { slug: fm.slug, accion: "actualizado", imagen, portada: cover !== null, destinos: enlaces.map((e) => e.destino) };
  }

  await prisma.post.create({
    data: {
      slug: fm.slug,
      status,
      publishedAt,
      coverImageUrl: cover,
      authorId: opts.authorId,
      translations: { create: translation },
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
  });
  return { slug: fm.slug, accion: "creado", imagen, portada: cover !== null, destinos: enlaces.map((e) => e.destino) };
}

async function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) {
    console.error(
      "uso: pnpm content:import <directorio> [--publish] [--author=email]",
    );
    process.exit(1);
  }
  const publish = args.includes("--publish");
  const authorEmail = args.find((a) => a.startsWith("--author="))?.slice(9);

  let authorId: string | null = null;
  if (authorEmail) {
    const user = await prisma.user.findUnique({
      where: { email: authorEmail },
      select: { id: true },
    });
    if (!user) throw new Error(`no existe ningún usuario con email ${authorEmail}`);
    authorId = user.id;
  }

  const files: string[] = [];
  for (const sub of ["articulos", "noticias"]) {
    const d = path.join(dir, sub);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).sort()) {
      if (f.endsWith(".md")) files.push(path.join(d, f));
    }
  }
  if (files.length === 0) throw new Error(`sin ficheros .md en ${dir}`);

  console.log(
    `${files.length} ficheros · estado ${publish ? "PUBLISHED" : "DRAFT"} · autor ${authorEmail ?? "(ninguno)"}\n`,
  );

  const ok: Result[] = [];
  const fallos: { file: string; error: string }[] = [];
  for (const file of files) {
    try {
      const r = await importOne(file, { publish, authorId });
      ok.push(r);
      console.log(`  ✓ ${r.accion.padEnd(12)} ${r.slug}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      fallos.push({ file, error: msg });
      console.log(`  ✗ ${path.basename(file)}: ${msg}`);
    }
  }

  console.log(`\n${ok.length} importadas, ${fallos.length} con error.`);
  const conPortada = ok.filter((r) => r.portada);
  const sinPortada = ok.filter((r) => r.imagen && !r.portada);
  console.log(`\nPortadas: ${conPortada.length} puestas, ${sinPortada.length} pendientes.`);
  if (sinPortada.length > 0) {
    console.log(`Deja el fichero en public/${COVER_DIR}/ y vuelve a importar:`);
    for (const r of sinPortada) console.log(`  ${r.imagen}`);
  }
  // Enlaces internos que apuntan a una pieza que no existe. Se avisa en vez
  // de fallar: el paquete puede enlazar a algo que aún no se ha importado.
  const publicados = new Set([
    ...(await prisma.post.findMany({ select: { slug: true } })).map((p) => `/blog/${p.slug}`),
    ...(await prisma.news.findMany({ select: { slug: true } })).map((n) => `/noticias/${n.slug}`),
  ]);
  const rotos = new Map<string, string[]>();
  for (const r of ok) {
    const malos = r.destinos.filter((d) => !publicados.has(d));
    if (malos.length > 0) rotos.set(r.slug, malos);
  }
  const totalEnlaces = ok.reduce((n, r) => n + r.destinos.length, 0);
  console.log(`\nEnlaces internos: ${totalEnlaces} guardados, ${[...rotos.values()].flat().length} sin destino.`);
  for (const [slug, malos] of rotos) {
    console.log(`  ${slug}`);
    for (const m of malos) console.log(`     → ${m}`);
  }

  if (fallos.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
