import { Link } from "@/i18n/navigation";

// Server Component. La flecha se desplaza 3px en hover; no la sustituyas
// por un icono: el sistema no tiene librería de iconos.
export function ExploreCard({
  href,
  title,
  desc,
  cta,
}: {
  href: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="vv-reveal group flex h-full flex-col gap-3 rounded-lg border border-bg3 bg-white p-6 no-underline transition-all duration-250 ease-out-soft hover:-translate-y-1 hover:border-river-2 hover:shadow-lift"
    >
      <h3 className="font-display text-[1.15rem] font-bold leading-tight text-text transition-colors duration-150 group-hover:text-river text-pretty">
        {title}
      </h3>
      <p className="text-[0.85rem] leading-[1.55] text-text-2">{desc}</p>
      <span className="mt-auto pt-2 text-[0.74rem] font-semibold uppercase tracking-[0.1em] text-river">
        {cta}{" "}
        <span
          aria-hidden
          className="inline-block transition-transform duration-250 ease-out-soft group-hover:translate-x-[3px]"
        >
          →
        </span>
      </span>
    </Link>
  );
}
