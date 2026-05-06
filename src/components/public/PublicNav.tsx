import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import type { AppLocale } from "@/i18n/routing";

export function PublicNav({ locale }: { locale: AppLocale }) {
  const t = useTranslations("nav");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-b border-bg3 bg-[rgba(244,248,248,0.94)] px-6 py-[1.1rem] backdrop-blur-md md:px-16 animate-fade-down">
      <Link
        href="/"
        className="font-display text-[1.2rem] font-black tracking-[0.05em] text-text no-underline"
      >
        VALIRA<em className="text-river not-italic"> · </em>VALLEY
      </Link>
      <ul className="hidden gap-6 list-none md:flex">
        <li>
          <Link
            href="/podcast"
            className="text-[0.82rem] font-medium uppercase tracking-[0.07em] text-text-3 no-underline transition-colors hover:text-river"
          >
            {t("podcast")}
          </Link>
        </li>
        <li>
          <Link
            href="/invitados"
            className="text-[0.82rem] font-medium uppercase tracking-[0.07em] text-text-3 no-underline transition-colors hover:text-river"
          >
            {t("guests")}
          </Link>
        </li>
        <li>
          <Link
            href="/blog"
            className="text-[0.82rem] font-medium uppercase tracking-[0.07em] text-text-3 no-underline transition-colors hover:text-river"
          >
            {t("blog")}
          </Link>
        </li>
        <li>
          <Link
            href="/noticias"
            className="text-[0.82rem] font-medium uppercase tracking-[0.07em] text-text-3 no-underline transition-colors hover:text-river"
          >
            {t("news")}
          </Link>
        </li>
        <li>
          <Link
            href="/eventos"
            className="text-[0.82rem] font-medium uppercase tracking-[0.07em] text-text-3 no-underline transition-colors hover:text-river"
          >
            {t("events")}
          </Link>
        </li>
      </ul>
      <div className="flex items-center gap-3">
        <LocaleSwitcher current={locale} />
        <Link
          href="/#newsletter"
          className="rounded-[3px] bg-river px-5 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.07em] text-white no-underline transition-all hover:-translate-y-px hover:bg-text"
        >
          {t("subscribe")}
        </Link>
      </div>
    </nav>
  );
}
