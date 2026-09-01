import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

// Server Component. El hover es CSS puro: no hay estado, no hay "use client".
type Variant = "primary" | "secondary" | "ghost" | "invert";
type Size = "md" | "sm";

const SIZE: Record<Size, string> = {
  md: "px-8 py-[0.9rem] text-[0.88rem]",
  sm: "px-5 py-2 text-[0.8rem]",
};

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-river text-white border-[1.5px] border-transparent hover:-translate-y-0.5 hover:bg-text",
  secondary:
    "border-[1.5px] border-bg3 text-river hover:border-river hover:bg-river/[0.05]",
  ghost:
    "text-river px-0 py-0 border-0 hover:text-text",
  invert:
    "bg-river-2 text-ink border-[1.5px] border-transparent hover:-translate-y-0.5 hover:bg-white",
};

const BASE =
  "inline-block rounded-btn font-semibold uppercase tracking-[0.05em] no-underline " +
  "transition-all duration-250 ease-out-soft disabled:cursor-not-allowed disabled:opacity-60";

export function Button({
  href,
  variant = "primary",
  size = "md",
  fullWidthMobile = false,
  type = "button",
  disabled,
  children,
  className = "",
}: {
  href?: string;
  variant?: Variant;
  size?: Size;
  /** En móvil ocupa el 100%: evita que dos CTA largas en FR/CA se compriman. */
  fullWidthMobile?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const cls = [
    BASE,
    SIZE[size],
    VARIANT[variant],
    fullWidthMobile ? "max-sm:w-full max-sm:text-center" : "",
    className,
  ].join(" ");

  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
