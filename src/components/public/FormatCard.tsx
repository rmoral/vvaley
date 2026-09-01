// Server Component. Rejilla de cinco formatos de /sobre.
// Mismo lenguaje que PillarCard, con una diferencia deliberada: los cinco
// van sobre bg2 con filete, no sobre blanco. En /sobre no hay imagen, así
// que la rejilla necesita peso propio para no ser otro muro de texto.

export function FormatCard({
  num,
  title,
  desc,
}: {
  num: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-bg3 bg-bg2 p-7 transition-all duration-250 ease-out-soft hover:border-river-2 hover:bg-white hover:shadow-lift">
      <p aria-hidden className="mb-4 font-display text-[1.1rem] font-black leading-none text-bg3">
        {num}
      </p>
      <h3 className="mb-2 text-[0.95rem] font-semibold text-text">{title}</h3>
      <p className="text-[0.83rem] leading-[1.65] text-text-2">{desc}</p>
    </div>
  );
}
