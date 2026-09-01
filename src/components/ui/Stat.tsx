// Server Component. Prohibido animar la cifra: el contador animado está
// excluido del sistema. Si todos los valores son 0, oculta la franja entera.
export function Stat({
  value,
  label,
  invert = false,
}: {
  value: string;
  label: string;
  invert?: boolean;
}) {
  return (
    <div>
      <div
        className={[
          "font-display text-[2.2rem] font-black leading-none",
          invert ? "text-river-2" : "text-river",
        ].join(" ")}
      >
        {value}
      </div>
      <div
        className={[
          "mt-2 text-[0.71rem] uppercase tracking-[0.1em]",
          invert ? "text-ink-2" : "text-text-2",
        ].join(" ")}
      >
        {label}
      </div>
    </div>
  );
}
