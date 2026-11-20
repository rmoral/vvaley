import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { initials, presenterLinkLabel } from "@/lib/event-presenters";

export type PresenterCard = {
  id: string;
  name: string;
  logoUrl: string | null;
  url: string | null;
  description: string | null;
};

// Sección «Presentan» de la página de un evento: logo enlazado a la web o al
// perfil de cada empresa, nombre y una descripción breve. El ancla #presentan
// es la que se comparte para llevar directo aquí.
//
// Los enlaces salen sin nofollow a propósito: dar visibilidad a quien
// presenta es el objetivo de la sección.
export async function EventPresenters({ presenters }: { presenters: PresenterCard[] }) {
  if (presenters.length === 0) return null;
  const t = await getTranslations("eventDetail");

  return (
    <section id="presentan" aria-labelledby="presentan-title" className="mt-14 scroll-mt-28">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-river">
        {t("presenters_eyebrow")}
      </p>
      <h2 id="presentan-title" className="mt-2 font-display text-[1.6rem] font-bold text-text">
        {t("presenters_title")}
      </h2>
      <p className="mt-2 text-[0.95rem] leading-[1.6] text-text-2">{t("presenters_lead")}</p>

      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {presenters.map((p) => (
          <li key={p.id} className="flex flex-col rounded-lg border border-bg3 bg-white">
            <Logo presenter={p} visitLabel={t("presenter_visit", { name: p.name })} />
            <div className="flex flex-1 flex-col gap-2 border-t border-bg3 px-5 py-4">
              <h3 className="font-display text-[1.1rem] font-bold text-text">{p.name}</h3>
              {p.description ? (
                <p className="text-[0.9rem] leading-[1.6] text-text-2">{p.description}</p>
              ) : null}
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener"
                  className="mt-auto pt-1 text-[0.82rem] font-semibold text-river no-underline hover:text-text"
                >
                  {presenterLinkLabel(p.url)} ↗
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Logo({ presenter: p, visitLabel }: { presenter: PresenterCard; visitLabel: string }) {
  const box = "relative flex h-32 items-center justify-center overflow-hidden rounded-t-lg bg-white";
  const inner = p.logoUrl ? (
    <Image
      src={p.logoUrl}
      alt={p.name}
      fill
      sizes="(max-width: 640px) 100vw, 360px"
      unoptimized={p.logoUrl.toLowerCase().endsWith(".svg")}
      className="object-contain p-6"
    />
  ) : (
    <span aria-hidden className="font-display text-[2.2rem] font-black text-bg3">
      {initials(p.name)}
    </span>
  );
  if (!p.url) return <div className={box}>{inner}</div>;
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener"
      aria-label={visitLabel}
      className={`${box} transition-opacity hover:opacity-80`}
    >
      {inner}
    </a>
  );
}
