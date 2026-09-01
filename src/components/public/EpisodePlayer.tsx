// Server Component. El <audio controls> nativo, enmarcado para que deje de
// parecer un elemento pegado del navegador. No se sustituye por un player
// propio: costaría "use client" y JS, y el nativo ya es accesible y
// controlable por teclado. Solo se le da caja, cota y contexto.

export function EpisodePlayer({
  src,
  label,
  duration,
}: {
  src: string;
  /** t("listen") o similar. */
  label: string;
  /** Ya formateado: "44 min". */
  duration?: string;
}) {
  return (
    <div className="rounded-lg border border-bg3 bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-river">
          {label}
        </p>
        {duration ? (
          <p className="text-[0.74rem] uppercase tracking-[0.08em] text-text-2">{duration}</p>
        ) : null}
      </div>
      <audio controls preload="metadata" src={src} className="w-full">
        <a href={src}>{label}</a>
      </audio>
    </div>
  );
}
