// Normalise a "social handle" the user typed in the admin into a real URL.
// Accepts:
//  · full URLs (https://…) → returned as-is
//  · "@handle" or "handle" → returned as `${baseUrl}/handle`
function toUrl(value: string | null | undefined, baseUrl: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, "").replace(/^\/+/, "");
  if (!handle) return null;
  return `${baseUrl}/${handle}`;
}

export type GuestLinks = {
  photoUrl?: string | null;
  email?: string | null;
  website?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  instagram?: string | null;
};

type Variant = "compact" | "detail";

const wrapperByVariant: Record<Variant, string> = {
  compact: "flex flex-wrap items-center gap-2",
  detail:
    "flex flex-wrap items-center gap-2 border-y border-bg3 py-3 my-6",
};

const sizeByVariant: Record<Variant, string> = {
  compact:
    "h-7 w-7 text-[0.85rem] rounded-md border-bg3 bg-bg2 text-text-2 hover:border-river hover:text-river",
  detail:
    "h-9 px-3 text-[0.78rem] rounded-md border-bg3 bg-white text-text-2 hover:border-river hover:text-river",
};

export function GuestSocialLinks({
  guest,
  variant = "detail",
}: {
  guest: GuestLinks;
  variant?: Variant;
}) {
  const items = [
    {
      key: "website",
      label: "Web",
      icon: "↗",
      href: toUrl(guest.website, "https://"),
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      icon: "in",
      href: toUrl(guest.linkedin, "https://linkedin.com/in"),
    },
    {
      key: "twitter",
      label: "X / Twitter",
      icon: "𝕏",
      href: toUrl(guest.twitter, "https://x.com"),
    },
    {
      key: "instagram",
      label: "Instagram",
      icon: "◈",
      href: toUrl(guest.instagram, "https://instagram.com"),
    },
    {
      key: "email",
      label: "Email",
      icon: "✉",
      href: guest.email ? `mailto:${guest.email}` : null,
    },
  ].filter((it): it is typeof it & { href: string } => Boolean(it.href));

  if (items.length === 0) return null;

  const className = `${sizeByVariant[variant]} inline-flex items-center justify-center gap-2 border no-underline transition-colors`;

  return (
    <div className={wrapperByVariant[variant]}>
      {variant === "detail" && (
        <span className="mr-2 text-[0.74rem] uppercase tracking-[0.12em] text-text-2">
          Encuéntrale en
        </span>
      )}
      {items.map((it) => (
        <a
          key={it.key}
          href={it.href}
          target={it.key === "email" ? undefined : "_blank"}
          rel={it.key === "email" ? undefined : "noopener noreferrer"}
          aria-label={it.label}
          title={it.label}
          className={className}
        >
          <span aria-hidden>{it.icon}</span>
          {variant === "detail" && (
            <span className="font-medium">{it.label}</span>
          )}
        </a>
      ))}
    </div>
  );
}
