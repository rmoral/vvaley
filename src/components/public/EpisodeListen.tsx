// Server Component. SUSTITUYE a EpisodePlayer.
//
// El hueco que detectaste es real: Episode.audioUrl es nullable y hay
// episodios que solo viven en Spotify, Apple y YouTube (el schema tiene
// spotifyUrl, appleUrl y youtubeUrl). Un componente que exige src: string
// no sirve para esos episodios.
//
// Regla de decisión:
//   · Hay audioUrl              → reproductor nativo + fila de plataformas
//   · No hay audioUrl, sí links → SOLO la fila de plataformas, con el
//                                 aspecto de una barra de escucha, no de
//                                 tres enlaces sueltos
//   · No hay nada               → no se pinta el bloque (return null).
//                                 No se inventa un player vacío ni un
//                                 "próximamente": un episodio publicado sin
//                                 ninguna forma de escucharlo es un error de
//                                 datos, y la web no debe disimularlo.
//
// El reproductor sigue siendo el <audio controls> nativo: es accesible,
// funciona con teclado y cuesta 0 kB de JS. Sustituirlo por uno propio
// costaría "use client" y no mejora nada que el usuario note.

type Platform = { key: "spotify" | "apple" | "youtube"; url: string; label: string };

export function EpisodeListen({
  audioUrl,
  spotifyUrl,
  appleUrl,
  youtubeUrl,
  label,
  duration,
  platformsLabel,
}: {
  audioUrl?: string | null;
  spotifyUrl?: string | null;
  appleUrl?: string | null;
  youtubeUrl?: string | null;
  /** t("listen") — "Escuchar el episodio". */
  label: string;
  /** Ya formateado: "44 min". */
  duration?: string;
  /** t("listen_on") — "Escúchalo en". Solo se usa si hay plataformas. */
  platformsLabel?: string;
}) {
  const platforms: Platform[] = [
    spotifyUrl ? { key: "spotify" as const, url: spotifyUrl, label: "Spotify" } : null,
    appleUrl ? { key: "apple" as const, url: appleUrl, label: "Apple Podcasts" } : null,
    youtubeUrl ? { key: "youtube" as const, url: youtubeUrl, label: "YouTube" } : null,
  ].filter(Boolean) as Platform[];

  if (!audioUrl && platforms.length === 0) return null;

  return (
    <div className="rounded-lg border border-bg3 bg-white p-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-river">
          {label}
        </p>
        {duration ? (
          <p className="text-[0.74rem] uppercase tracking-[0.08em] text-text-2">{duration}</p>
        ) : null}
      </div>

      {audioUrl ? (
        <audio controls preload="metadata" src={audioUrl} className="mt-3 w-full">
          <a href={audioUrl}>{label}</a>
        </audio>
      ) : null}

      {platforms.length > 0 ? (
        <div
          className={[
            "flex flex-wrap items-center gap-2",
            audioUrl ? "mt-4 border-t border-bg3 pt-4" : "mt-3",
          ].join(" ")}
        >
          {platformsLabel ? (
            <span className="mr-1 text-[0.7rem] uppercase tracking-[0.1em] text-text-2">
              {platformsLabel}
            </span>
          ) : null}

          {platforms.map((p) => (
            <a
              key={p.key}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-btn border border-bg3 bg-bg px-3.5 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-river no-underline transition-colors duration-150 ease-out-soft hover:border-river hover:bg-river/[0.06]"
            >
              {p.label}
              <span aria-hidden className="ml-1.5 text-[0.7rem] text-text-2">↗</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
