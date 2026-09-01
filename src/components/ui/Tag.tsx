import type { ReactNode } from "react";

// Server Component. tone="accent" se reserva a IA y tecnología.
export function Tag({
  children,
  tone = "neutral",
  size = "md",
  pill = false,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent";
  size?: "sm" | "md";
  pill?: boolean;
}) {
  return (
    <span
      className={[
        "inline-block font-semibold uppercase tracking-[0.1em]",
        pill ? "rounded-full" : "rounded-chip",
        size === "sm" ? "px-2 py-0.5 text-[0.7rem]" : "px-3 py-1 text-[0.71rem]",
        tone === "accent"
          ? "border border-river/30 bg-river/[0.07] text-river"
          : "border border-bg3 bg-bg2 text-text-2",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
