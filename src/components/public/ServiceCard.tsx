// Server Component. `invert` solo dentro del estrato oscuro de /servicios.
export function ServiceCard({
  num,
  title,
  desc,
  forWho,
  bullets,
  forLabel,
  includesLabel,
  invert = false,
}: {
  num: string;
  title: string;
  desc: string;
  forWho?: string;
  bullets: string[];
  forLabel: string;
  includesLabel: string;
  invert?: boolean;
}) {
  return (
    <article
      className={[
        "vv-reveal grid gap-8 rounded-lg p-8 md:grid-cols-[1.2fr_1fr] md:p-10",
        invert ? "border border-bg3/20 bg-white/[0.04]" : "border border-bg3 bg-bg",
      ].join(" ")}
    >
      <div>
        <p
          aria-hidden
          className={[
            "font-display text-[1.1rem] font-black leading-none",
            invert ? "text-ink-2/40" : "text-bg3",
          ].join(" ")}
        >
          {num}
        </p>
        <h2
          className={[
            "mt-4 font-display text-card-lg font-bold text-pretty",
            invert ? "text-white" : "text-text",
          ].join(" ")}
        >
          {title}
        </h2>
        <p
          className={[
            "mt-3 text-[0.97rem] leading-[1.7]",
            invert ? "text-ink-2" : "text-text-2",
          ].join(" ")}
        >
          {desc}
        </p>

        {forWho ? (
          <div
            className={[
              "mt-5 rounded-field p-4",
              invert
                ? "border border-river-2/35 bg-river-2/[0.08]"
                : "border border-river/25 bg-river/[0.05]",
            ].join(" ")}
          >
            <p
              className={[
                "text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
                invert ? "text-river-2" : "text-river",
              ].join(" ")}
            >
              {forLabel}
            </p>
            <p
              className={[
                "mt-1 text-[0.87rem] leading-[1.6]",
                invert ? "text-ink-2" : "text-text-2",
              ].join(" ")}
            >
              {forWho}
            </p>
          </div>
        ) : null}
      </div>

      <div>
        <p
          className={[
            "text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
            invert ? "text-ink-2/80" : "text-text-2",
          ].join(" ")}
        >
          {includesLabel}
        </p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {bullets.map((b) => (
            <li
              key={b}
              className={[
                "grid grid-cols-[14px_1fr] items-start gap-3 text-[0.89rem] leading-[1.6]",
                invert ? "text-ink-2" : "text-text-2",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "mt-[7px] block size-1.5 rounded-full",
                  invert ? "bg-river-2" : "bg-river",
                ].join(" ")}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
