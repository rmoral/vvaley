// Server Component. Siempre cuatro pasos; el numeral va en círculo teal.
export function ProcessStep({
  num,
  title,
  desc,
  invert = false,
}: {
  num: string;
  title: string;
  desc: string;
  invert?: boolean;
}) {
  return (
    <div
      className={[
        "flex h-full flex-col rounded-lg p-7",
        invert ? "border border-bg3/20 bg-white/[0.04]" : "border border-bg3 bg-white",
      ].join(" ")}
    >
      <div
        aria-hidden
        className={[
          "mb-4 flex size-8 items-center justify-center rounded-full border border-river/30 bg-river/[0.06] font-display text-[0.9rem] font-bold",
          invert ? "text-river-2" : "text-river",
        ].join(" ")}
      >
        {num}
      </div>
      <h3 className={`mb-2 text-[0.95rem] font-semibold ${invert ? "text-white" : "text-text"}`}>
        {title}
      </h3>
      <p className={`text-[0.83rem] leading-[1.65] ${invert ? "text-ink-2" : "text-text-2"}`}>
        {desc}
      </p>
    </div>
  );
}
