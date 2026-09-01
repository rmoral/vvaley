import type { ReactNode } from "react";

// Server Component. Una por sección, siempre antes del h2.
export function SectionLabel({
  children,
  invert = false,
}: {
  children: ReactNode;
  invert?: boolean;
}) {
  return (
    <div
      className={[
        "inline-block rounded-chip px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]",
        invert
          ? "border border-river-2/40 bg-river-2/10 text-river-2"
          : "border border-river/25 bg-river/[0.04] text-river",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
