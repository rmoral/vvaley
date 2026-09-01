"use client";
// "use client" OBLIGATORIO: gestiona el estado del envío (idle/loading/ok/
// error) con el hook useNewsletterSubscribe. Ya era cliente antes.
// Cambios del rediseño: el estado `ok` sustituye el formulario EN SU SITIO
// (sin salto de layout), foco teal, y text-text-3 → text-text-2.

import { useTranslations } from "next-intl";
import { useNewsletterSubscribe } from "@/hooks/useNewsletterSubscribe";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";

export function NewsletterStrip({ source = "strip" }: { source?: string }) {
  const t = useTranslations("newsletterCta");
  const { email, setEmail, state, submit } = useNewsletterSubscribe(source);
  const submitted = state === "ok";

  return (
    <section
      id="newsletter"
      aria-labelledby="newsletter-strip-title"
      className="relative overflow-hidden border-y border-bg3 bg-bg2 px-6 py-14 md:px-16"
    >
      <div
        aria-hidden
        className="hero-topo pointer-events-none absolute inset-y-0 -right-[15%] w-[55%] opacity-[0.05]"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md">
          <SectionLabel>{t("eyebrow")}</SectionLabel>
          <h2
            id="newsletter-strip-title"
            className="mt-3 font-display text-sub font-bold text-text text-pretty"
          >
            {t("title")}
          </h2>
          <p className="mt-2 text-[0.9rem] leading-[1.55] text-text-2">{t("sub")}</p>
        </div>

        <form
          className="w-full md:w-auto md:min-w-[420px]"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
          aria-live="polite"
        >
          {submitted ? (
            <div className="rounded-btn border border-river/30 bg-white px-4 py-4 text-[0.92rem] font-medium text-river">
              ✓ {t("success")}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="newsletter-strip-email" className="sr-only">
                  {t("emailLabel")}
                </label>
                <input
                  id="newsletter-strip-email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("placeholder")}
                  disabled={state === "loading"}
                  className="flex-1 rounded-btn border border-bg3 bg-white px-5 py-3 text-[0.92rem] text-text outline-none transition-colors duration-150 placeholder:text-text-2/60 focus:border-river"
                />
                <Button type="submit" disabled={state === "loading"} fullWidthMobile>
                  {state === "loading" ? "…" : t("cta")}
                </Button>
              </div>
              <p className="mt-2 text-[0.74rem] text-text-2">{t("trust")}</p>
            </>
          )}
          {state === "error" ? (
            <p className="mt-2 text-[0.78rem] text-alert" role="alert">
              {t("error")}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
