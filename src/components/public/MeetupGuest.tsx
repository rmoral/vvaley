import { Link } from "@/i18n/navigation";
import { CoverArt } from "./CoverArt";

// Bloque del invitado de la edición.
//
// No reutiliza GuestCard a propósito: aquella es una tarjeta de listado,
// pensada para verse en rejilla junto a otras diez y con la foto a 80px. Aquí
// el invitado es el argumento de venta de la noche —el plan editorial lo dice
// sin rodeos: nunca se anuncia una edición sin invitado— así que ocupa un
// bloque entero, con la foto grande y el titular completo en vez de recortado
// a dos líneas.

export function MeetupGuest({
  guest,
  label,
  linkLabel,
}: {
  guest: {
    slug: string;
    fullName: string;
    role?: string | null;
    company?: string | null;
    headline?: string | null;
    photoUrl?: string | null;
  };
  /** Antetítulo del bloque ("El invitado de esta edición"). */
  label: string;
  linkLabel: string;
}) {
  const iniciales = guest.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="vv-reveal flex flex-col gap-6 rounded-lg border border-bg3 bg-white p-6 sm:flex-row sm:items-start sm:gap-8 sm:p-8">
      {guest.photoUrl ? (
        <CoverArt
          src={guest.photoUrl}
          alt={guest.fullName}
          softDuotone
          sizes="(max-width: 640px) 128px, 160px"
          className="size-32 shrink-0 rounded-full sm:size-40"
        />
      ) : (
        <div
          aria-hidden
          className="flex size-32 shrink-0 items-center justify-center rounded-full bg-bg2 font-display text-[2.4rem] font-bold text-river sm:size-40"
        >
          {iniciales}
        </div>
      )}

      <div className="min-w-0">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-river">
          {label}
        </p>

        <h3 className="mt-3 font-display text-sub font-bold text-text text-pretty">
          {guest.fullName}
        </h3>

        {guest.role || guest.company ? (
          <p className="mt-1.5 text-[0.92rem] leading-[1.5] text-text-2">
            {[guest.role, guest.company].filter(Boolean).join(" · ")}
          </p>
        ) : null}

        {guest.headline ? (
          <p className="mt-4 text-[1rem] font-light leading-[1.7] text-text-2 text-pretty">
            {guest.headline}
          </p>
        ) : null}

        <Link
          href={`/invitados/${guest.slug}`}
          className="mt-5 inline-flex items-center gap-2 text-[0.88rem] font-semibold text-river no-underline transition-colors duration-150 hover:text-text"
        >
          {linkLabel}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
