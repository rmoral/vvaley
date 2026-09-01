import { Link } from "@/i18n/navigation";
import { CoverArt } from "./CoverArt";

// Server Component. Sin foto, iniciales en Fraunces: es un estado normal,
// no un error. Con foto, duotono suave para que la cara se reconozca.
export function GuestCard({
  guest,
  episodesLabel,
  children,
}: {
  guest: {
    slug: string;
    fullName: string;
    role?: string | null;
    company?: string | null;
    headline?: string | null;
    photoUrl?: string | null;
  };
  episodesLabel: string;
  /** Slot para <GuestSocialLinks variant="compact" />. */
  children?: React.ReactNode;
}) {
  const initials = guest.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="vv-reveal group flex h-full flex-col rounded-lg border border-bg3 bg-white transition-all duration-250 ease-out-soft hover:-translate-y-1 hover:border-river-2 hover:shadow-lift">
      <Link
        href={`/invitados/${guest.slug}`}
        className="flex flex-1 flex-col gap-3 p-5 no-underline"
      >
        {guest.photoUrl ? (
          <CoverArt
            src={guest.photoUrl}
            alt={guest.fullName}
            softDuotone
            sizes="80px"
            className="size-20 shrink-0 rounded-full"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-bg2 font-display text-[1.6rem] font-bold text-river"
          >
            {initials}
          </div>
        )}

        <h3 className="font-display text-[1.15rem] font-bold leading-tight text-text transition-colors duration-150 group-hover:text-river text-pretty">
          {guest.fullName}
        </h3>

        {(guest.role || guest.company) && (
          <p className="text-[0.85rem] leading-[1.5] text-text-2">
            {[guest.role, guest.company].filter(Boolean).join(" · ")}
          </p>
        )}

        {guest.headline ? (
          <p className="line-clamp-2 text-[0.82rem] italic leading-[1.5] text-text-2">
            {guest.headline}
          </p>
        ) : null}

        <div className="mt-auto pt-2 text-[0.74rem] uppercase tracking-[0.1em] text-text-2">
          {episodesLabel}
        </div>
      </Link>
      {children ? <div className="border-t border-bg3 px-5 py-3">{children}</div> : null}
    </div>
  );
}
