"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const labels: Record<AppLocale, string> = {
  es: "ES",
  ca: "CA",
  en: "EN",
  fr: "FR",
};

export function LocaleSwitcher({ current }: { current: AppLocale }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1 text-[0.72rem] font-medium uppercase tracking-[0.1em] text-text-3">
      {routing.locales.map((l, i) => (
        <span key={l} className="contents">
          {i > 0 && <span aria-hidden className="text-bg3">·</span>}
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(() => router.replace(pathname, { locale: l }))
            }
            className={`px-1 transition-colors hover:text-river ${
              l === current ? "text-river font-semibold" : ""
            }`}
            aria-current={l === current ? "true" : undefined}
          >
            {labels[l]}
          </button>
        </span>
      ))}
    </div>
  );
}
