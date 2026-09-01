import { Link } from "@/i18n/navigation";

// Server Component. Mismo contrato que el TagChips actual del repo
// (tags, size, linked): sustitución directa, sin tocar las páginas.
// Cambios: text-text-3 → text-text-2 (contraste), y el chip usa
// rounded-full + bg-bg2 para diferenciarse del Tag de temática del hero.

type ChipTag = { slug: string; name: string };

export function TagChips({
  tags,
  size = "md",
  linked = true,
}: {
  tags: ChipTag[];
  size?: "sm" | "md";
  /** false = spans planos, para usarlo dentro de un <a> padre. */
  linked?: boolean;
}) {
  if (tags.length === 0) return null;

  const base = [
    "inline-block rounded-full border border-bg3 bg-bg2 font-medium uppercase tracking-[0.06em]",
    size === "sm" ? "px-2 py-0.5 text-[0.7rem]" : "px-2.5 py-1 text-[0.74rem]",
  ].join(" ");

  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag.slug}>
          {linked ? (
            <Link
              href={`/tags/${tag.slug}`}
              className={`${base} text-text-2 no-underline transition-colors duration-150 hover:border-river hover:bg-river/[0.06] hover:text-river`}
            >
              {tag.name}
            </Link>
          ) : (
            <span className={`${base} text-text-2`}>{tag.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
