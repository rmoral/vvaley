import type { ReactNode } from "react";

// Server Component. El filete usa el gesto `draw` y arrastra la secuencia
// del hero. `altitude` imprime la cota ("Cota 01 · 1 023 m").
export function Eyebrow({
  children,
  altitude,
  invert = false,
}: {
  children: ReactNode;
  altitude?: string;
  invert?: boolean;
}) {
  return (
    <p
      className={[
        "inline-flex flex-wrap items-center gap-3 text-[0.73rem] font-semibold uppercase tracking-[0.18em]",
        invert ? "text-river-2" : "text-river",
      ].join(" ")}
    >
      <span aria-hidden className="vv-draw block h-px w-7 bg-current" />
      {altitude ? (
        <span className={invert ? "text-ink-2" : "text-text-2"}>{altitude}</span>
      ) : null}
      {children}
    </p>
  );
}
