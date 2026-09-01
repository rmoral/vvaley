import { CoverArt } from "./CoverArt";

// Server Component. Cabecera de la ficha de invitado (/invitados/[slug]).
// Es la página más visual del sitio y la que más depende de foto enviada por
// terceros: el retrato pasa por duotono SUAVE para que la cara se reconozca,
// y sin foto van las iniciales, que es un estado normal.
//
// Los enlaces sociales siguen siendo <GuestSocialLinks>, que ya existe: se
// pasan como children para no duplicarlo.

export function GuestProfile({
  guest,
  children,
}: {
  guest: {
    fullName: string;
    role?: string | null;
    company?: string | null;
    headline?: string | null;
    photoUrl?: string | null;
  };
  children?: React.ReactNode;
}) {
  const initials = guest.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="grid gap-8 sm:grid-cols-[160px_1fr] sm:items-start">
      {guest.photoUrl ? (
        <CoverArt
          src={guest.photoUrl}
          alt={guest.fullName}
          softDuotone
          priority
          sizes="160px"
          className="size-40 overflow-hidden rounded-full"
        />
      ) : (
        <div
          aria-hidden
          className="flex size-40 items-center justify-center rounded-full bg-bg2 font-display text-[3rem] font-bold text-river"
        >
          {initials}
        </div>
      )}

      <div>
        <h1 className="font-display text-page font-black text-text text-pretty">
          {guest.fullName}
        </h1>
        {(guest.role || guest.company) && (
          <p className="mt-2 text-[1rem] text-text-2">
            {[guest.role, guest.company].filter(Boolean).join(" · ")}
          </p>
        )}
        {guest.headline ? (
          <p className="mt-4 max-w-[560px] font-display text-[1.25rem] italic leading-[1.4] text-river text-pretty">
            {guest.headline}
          </p>
        ) : null}
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </header>
  );
}
