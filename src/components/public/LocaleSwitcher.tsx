"use client";
// "use client" OBLIGATORIO: usa useRouter/usePathname de next-intl para
// cambiar de locale conservando la ruta. Ya era cliente antes del rediseño.
// Cambio del rediseño: text-text-2 → text-text-2 (el anterior daba 3.7:1).

import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const LABELS: Record<AppLocale, string> = { es: "ES", ca: "CA", en: "EN", fr: "FR" };

export function LocaleSwitcher({ current }: { current: AppLocale }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1 text-[0.72rem] font-medium uppercase tracking-[0.1em] text-text-2">
      {routing.locales.map((l, i) => (
        <span key={l} className="contents">
          {i > 0 ? <span aria-hidden className="text-bg3">·</span> : null}
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => router.replace(pathname, { locale: l }))}
            aria-current={l === current ? "true" : undefined}
            className={`px-1 transition-colors duration-150 hover:text-river ${
              l === current ? "font-semibold text-river" : ""
            }`}
          >
            {LABELS[l]}
          </button>
        </span>
      ))}
    </div>
  );
}
