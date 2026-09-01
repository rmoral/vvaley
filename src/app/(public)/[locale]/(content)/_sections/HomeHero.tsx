import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";

// Server Component. Sustituye al hero actual:
//   · fuera min-h-screen (era 100vh) → ~72vh
//   · fuera el sello giratorio y sus dos anillos punteados
//   · entra la columna de archivo con los 3 últimos episodios enlazados
//
// NOTA DE LCP: el <h1> NO lleva animación de entrada. vv-rise arranca en
// opacity:0 y Chrome cuenta el LCP cuando el elemento es visible, así que
// animar el h1 sumaría ~900ms a la métrica. La coreografía la llevan el
// antetítulo, el filete, la entradilla, los chips, los botones y el archivo.

export type HeroArchiveItem = {
  slug: string;
  number: number | null;
  title: string;
  meta: string;
};

const TAGS = ["economy", "company", "entrepreneurship", "tech"] as const;

export async function HomeHero({ archive }: { archive: HeroArchiveItem[] }) {
  const t = await getTranslations("home");

  return (
    <header className="hero-bg relative overflow-hidden px-6 pt-32 md:px-16">
      <div
        aria-hidden
        className="topo-rings pointer-events-none absolute -inset-y-1/3 left-[30%] -right-[10%]"
      />

      <div className="relative grid gap-14 pb-14 lg:grid-cols-[1fr_400px]">
        <div>
          <span className="vv-settle inline-block">
            <Eyebrow altitude={t("hero.cota")}>{t("hero.eyebrow")}</Eyebrow>
          </span>

          {/* Sin animación: es el candidato a LCP. */}
          <h1 className="mt-6 font-display text-hero font-black text-text text-pretty">
            {t("hero.title_1")}{" "}
            <em className="font-bold italic text-river">{t("hero.title_2")}</em>
          </h1>

          <p className="vv-settle mt-5 max-w-[560px] text-[1.05rem] font-light leading-[1.75] text-text-2 [animation-delay:180ms]">
            {t("hero.sub")}
          </p>

          <div className="vv-settle mt-7 flex flex-wrap gap-2 [animation-delay:260ms]">
            {TAGS.map((k) => (
              <Tag key={k} tone={k === "tech" ? "accent" : "neutral"}>
                {t(`hero.tag_${k}`)}
              </Tag>
            ))}
          </div>

          <div className="vv-settle mt-8 flex flex-wrap gap-4 [animation-delay:340ms]">
            <Button href="/podcast" fullWidthMobile>
              {t("hero.cta_listen")}
            </Button>
            <Button href="/servicios" variant="secondary" fullWidthMobile>
              {t("hero.cta_services")}
            </Button>
          </div>
        </div>

        {/* Columna de archivo: el producto visible sin hacer scroll. */}
        {archive.length > 0 ? (
          <aside
            aria-labelledby="hero-archive-title"
            className="vv-settle border-l border-bg3 pl-7 [animation-delay:420ms] max-lg:hidden"
          >
            <div className="flex justify-between border-b border-bg3 pb-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-text-2">
              <span id="hero-archive-title">{t("hero.archive")}</span>
              <span>{archive.length}</span>
            </div>
            {archive.map((ep, i) => (
              <Link
                key={ep.slug}
                href={`/podcast/${ep.slug}`}
                className={`group grid grid-cols-[34px_1fr] gap-3.5 py-4 no-underline ${
                  i < archive.length - 1 ? "border-b border-bg3" : ""
                }`}
              >
                <span aria-hidden className="font-display text-[0.95rem] font-black text-river-2">
                  {String(ep.number ?? i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block font-display text-[0.95rem] font-bold leading-[1.28] text-text transition-colors duration-150 group-hover:text-river text-pretty">
                    {ep.title}
                  </span>
                  <span className="mt-1.5 block text-[0.7rem] tracking-[0.04em] text-text-2">
                    {ep.meta}
                  </span>
                </span>
              </Link>
            ))}
          </aside>
        ) : null}
      </div>
    </header>
  );
}
