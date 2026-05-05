export function slugify(input: string): string {
  // Strip Unicode combining marks (̀-ͯ) after NFD normalization,
  // so accents/diacritics from ES/CA/FR fold to ASCII before slugifying.
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
