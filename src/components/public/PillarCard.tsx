// Server Component. El numeral va en text-bg3: es textura, no información,
// y por eso lleva aria-hidden.
export function PillarCard({
  num,
  name,
  desc,
  accent = false,
}: {
  num: string;
  name: string;
  desc: string;
  /** Tinte teal: reservado al pilar de tecnología e IA. */
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "flex h-full flex-col rounded-lg p-7 transition-all duration-250 ease-out-soft",
        "hover:border-river-2 hover:shadow-lift",
        accent ? "border border-river/25 bg-river/[0.02]" : "border border-bg3 bg-white",
      ].join(" ")}
    >
      <p aria-hidden className="mb-4 font-display text-[1.1rem] font-black leading-none text-bg3">
        {num}
      </p>
      <h3 className="mb-2 text-[0.95rem] font-semibold text-text">{name}</h3>
      <p className="text-[0.83rem] leading-[1.65] text-text-2">{desc}</p>
    </div>
  );
}
