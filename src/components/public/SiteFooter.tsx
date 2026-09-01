import { useTranslations } from "next-intl";

// Server Component (useTranslations funciona en Server Components con
// next-intl 3). El lema en cursiva teal es el único uso de cursiva en la
// interfaz fuera de los titulares.
export function SiteFooter() {
  const t = useTranslations("home.footer");

  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-bg3 bg-white px-6 py-10 md:px-16">
      <div className="font-display text-[1.05rem] font-black text-text">
        VALIRA<em className="not-italic text-river"> · </em>VALLEY
      </div>
      <div className="text-[0.78rem] italic text-river">{t("tagline")}</div>
      <div className="text-[0.75rem] text-text-2">{t("copy")}</div>
    </footer>
  );
}
