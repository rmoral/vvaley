import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import type { AppLocale } from "@/i18n/routing";

export function PublicNav({ locale }: { locale: AppLocale }) {
  const t = useTranslations("nav");

  const link =
    "block whitespace-nowrap text-[0.82rem] font-medium uppercase tracking-[0.07em] text-text-3 no-underline transition-colors hover:text-river";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-b border-bg3 bg-[rgba(244,248,248,0.94)] px-6 py-[1.1rem] backdrop-blur-md md:px-16 animate-fade-down">
      <Link
        href="/"
        className="font-display text-[1.2rem] font-black tracking-[0.05em] text-text no-underline"
      >
        VALIRA<em className="text-river not-italic"> · </em>VALLEY
      </Link>

      <ul className="hidden items-center gap-5 list-none md:flex">
        <li>
          <Link href="/podcast" className={link}>
            {t("podcast")}
          </Link>
        </li>
        <li>
          <Link href="/invitados" className={link}>
            {t("guests")}
          </Link>
        </li>
        <li>
          <Link href="/blog" className={link}>
            {t("blog")}
          </Link>
        </li>
        <li>
          <Link href="/noticias" className={link}>
            {t("news")}
          </Link>
        </li>
        <li>
          <Link href="/eventos" className={link}>
            {t("events")}
          </Link>
        </li>

        {/* "About" dropdown — anchors back to the home sections so the
            project intro stays reachable from anywhere on the site.
            Pure CSS open: hover or keyboard focus reveals the panel. */}
        <li className="group relative">
          <button
            type="button"
            aria-haspopup="true"
            className={`${link} flex items-center gap-1`}
          >
            {t("about")}
            <span aria-hidden className="text-[0.6rem] leading-none">
              ▾
            </span>
          </button>
          <div
            role="menu"
            className="invisible absolute right-0 top-full pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
          >
            <ul className="min-w-[200px] list-none rounded-md border border-bg3 bg-white py-2 shadow-lg">
              <li>
                <Link href="/#naming" className={`${link} px-4 py-2`} role="menuitem">
                  {t("naming")}
                </Link>
              </li>
              <li>
                <Link href="/#pilares" className={`${link} px-4 py-2`} role="menuitem">
                  {t("pillars")}
                </Link>
              </li>
              <li>
                <Link href="/#fases" className={`${link} px-4 py-2`} role="menuitem">
                  {t("strategy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/#monetizacion"
                  className={`${link} px-4 py-2`}
                  role="menuitem"
                >
                  {t("monetization")}
                </Link>
              </li>
            </ul>
          </div>
        </li>
      </ul>

      <div className="flex items-center gap-3">
        <Link
          href="/buscar"
          aria-label={t("search")}
          title={t("search")}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-bg3 text-text-3 no-underline transition-colors hover:border-river hover:text-river"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </Link>
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
