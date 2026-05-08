import { prisma } from "./prisma";
import { slugify } from "./slug";

/**
 * Parses a tags string from a form (comma-separated) into a deduplicated
 * list of names trimmed of whitespace.
 *
 *   "  IA , andorra,, IA "  →  ["IA", "andorra"]
 */
export function parseTagNames(input: string | null | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/**
 * Take a list of tag names typed by the editor, ensure each one exists
 * in the DB (creating new ones with a slug derived from the name) and
 * return their ids in input order. Names are deduplicated by their slug
 * so "IA" and "ia " end up as the same row.
 */
export async function upsertTagsByName(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  const seenSlugs = new Set<string>();
  for (const name of names) {
    const slug = slugify(name);
    if (!slug || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { slug, name },
    });
    ids.push(tag.id);
  }
  return ids;
}

/**
 * Format the tag list for the form's text input ("ia, andorra").
 */
export function tagsToString(tags: { name: string }[]): string {
  return tags.map((t) => t.name).join(", ");
}
