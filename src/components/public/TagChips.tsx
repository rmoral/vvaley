import { Link } from "@/i18n/navigation";

type ChipTag = { slug: string; name: string };

export function TagChips({
  tags,
  size = "md",
  linked = true,
}: {
  tags: ChipTag[];
  size?: "sm" | "md";
  /** When false, render as plain spans (use inside parent <a> tags). */
  linked?: boolean;
}) {
  if (tags.length === 0) return null;
  const padding =
    size === "sm" ? "px-2 py-0.5 text-[0.7rem]" : "px-2.5 py-1 text-[0.74rem]";
  const base = `inline-block rounded-full border border-bg3 bg-bg ${padding} font-medium uppercase tracking-[0.06em]`;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag.slug}>
          {linked ? (
            <Link
              href={`/tags/${tag.slug}`}
              className={`${base} text-text-3 no-underline transition-colors hover:border-river hover:text-river`}
            >
              {tag.name}
            </Link>
          ) : (
            <span className={`${base} text-text-3`}>{tag.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
