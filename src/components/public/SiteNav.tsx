"use client";
// ---------------------------------------------------------------------------
// "use client" OBLIGATORIO: el menú móvil y el desplegable «Sobre» necesitan
// estado. Es el único componente que pasa de servidor a cliente en todo el
// rediseño, y lo hace por dos motivos de accesibilidad y de idioma:
//   1. El desplegable actual solo abre con :hover — con teclado no abre.
//   2. Con seis ítems en CA/FR la barra se rompe entre 768 y 1100px, así que
//      el menú horizontal sube al breakpoint propio menu: (1120px) y por
//      debajo hace falta hamburguesa. No vale lg: (1024): medido, CA desborda
//      21px y FR 13px justo en ese ancho.
// Coste: ~1.2 kB de JS. Si prefieres cero JS, la alternativa es <details>/
// <summary> para ambos menús — menos control de estilo, misma accesibilidad.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Button } from "@/components/ui/Button";
import type { AppLocale } from "@/i18n/routing";

const MAIN = [
  { href: "/podcast", key: "podcast" },
  { href: "/invitados", key: "guests" },
  { href: "/blog", key: "blog" },
  { href: "/noticias", key: "news" },
  { href: "/eventos", key: "events" },
] as const;

const ABOUT = [
  { href: "/sobre", key: "about" },
  { href: "/servicios", key: "services" },
  { href: "/contacto", key: "contact" },
] as const;

export function SiteNav({ locale }: { locale: AppLocale }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const link =
    "block whitespace-nowrap text-[0.82rem] font-medium uppercase tracking-[0.07em] " +
    "text-text-2 no-underline transition-colors duration-150 hover:text-river";

  return (
    <nav className="vv-drop fixed inset-x-0 top-0 z-50 border-b border-bg3 bg-bg/[0.94] backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 px-6 py-[1.1rem] md:px-16">
        <Link
          href="/"
          className="whitespace-nowrap font-display text-[1.2rem] font-black tracking-[0.05em] text-text no-underline"
        >
          VALIRA<em className="not-italic text-river"> · </em>VALLEY
        </Link>

        {/* Menú horizontal a partir de menu: = 1120px (antes md:, que rompía en FR/CA) */}
        <ul className="hidden list-none items-center gap-5 menu:flex">
          {MAIN.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className={link}>
                {t(it.key)}
              </Link>
            </li>
          ))}
          <li className="relative">
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={aboutOpen}
              onClick={() => setAboutOpen((v) => !v)}
              onBlur={() => setTimeout(() => setAboutOpen(false), 120)}
              className={`${link} flex items-center gap-1`}
            >
              {t("about")}
              <span aria-hidden className="text-[0.6rem] leading-none">▾</span>
            </button>
            {aboutOpen ? (
              <ul className="absolute right-0 top-full mt-2 min-w-[200px] list-none rounded-lg border border-bg3 bg-white py-2 shadow-menu">
                {ABOUT.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} className={`${link} px-4 py-2`}>
                      {t(it.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href="/buscar"
            aria-label={t("search")}
            className="flex size-8 items-center justify-center rounded-full border border-bg3 text-text-2 no-underline transition-colors duration-150 hover:border-river hover:text-river"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>

          {/* Con el logo, la lupa y la hamburguesa, los cuatro botones de
              idioma no caben por debajo de ~640px: el wordmark se partía en
              tres líneas y la barra pasaba de 67px a 122px de alto. Debajo
              del breakpoint del menú vive dentro del cajón. */}
          <span className="max-menu:hidden">
            <LocaleSwitcher current={locale} />
          </span>

          <Button href="/#newsletter" size="sm" className="max-menu:hidden">
            {t("subscribe")}
          </Button>

          {/* Hamburguesa por debajo de menu: */}
          <button
            type="button"
            aria-label={open ? t("close") : t("menu")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex size-8 flex-col items-center justify-center gap-1 rounded-full border border-bg3 text-text-2 menu:hidden"
          >
            <span aria-hidden className="block h-px w-3.5 bg-current" />
            <span aria-hidden className="block h-px w-3.5 bg-current" />
            <span aria-hidden className="block h-px w-3.5 bg-current" />
          </button>
        </div>
      </div>

      {open ? (
        <ul className="list-none border-t border-bg3 bg-bg px-6 py-4 menu:hidden">
          {[...MAIN, ...ABOUT].map((it) => (
            <li key={it.href} className="border-b border-bg3 last:border-0">
              <Link
                href={it.href}
                onClick={() => setOpen(false)}
                className={`${link} py-3`}
              >
                {t(it.key)}
              </Link>
            </li>
          ))}
          <li className="flex items-center justify-between gap-4 pt-4">
            <Button href="/#newsletter" size="sm">
              {t("subscribe")}
            </Button>
            <LocaleSwitcher current={locale} />
          </li>
        </ul>
      ) : null}
    </nav>
  );
}
