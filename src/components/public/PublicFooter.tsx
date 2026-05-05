import { useTranslations } from "next-intl";

export function PublicFooter() {
  const t = useTranslations("home.footer");

  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-bg3 bg-white px-6 py-10 md:px-16">
      <div className="font-display text-[1.05rem] font-black text-text">
        VALIRA<em className="text-river not-italic"> · </em>VALLEY
      </div>
      <div className="text-[0.78rem] italic text-river">{t("tagline")}</div>
      <div className="text-[0.75rem] text-text-3">{t("copy")}</div>
    </footer>
  );
}
