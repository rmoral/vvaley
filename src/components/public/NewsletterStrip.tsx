"use client";

import { useTranslations } from "next-intl";
import { useNewsletterSubscribe } from "@/hooks/useNewsletterSubscribe";

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
      {/* Subtle topo accent in the brand language. */}
      <div
        aria-hidden
        className="hero-topo pointer-events-none absolute inset-y-0 right-[-15%] w-[55%] opacity-[0.05]"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md">
          <div className="mb-3 inline-flex items-center gap-2 rounded-[2px] border border-[rgba(46,139,143,0.25)] bg-white px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-river">
            {t("eyebrow")}
          </div>
          <h2
            id="newsletter-strip-title"
            className="font-display text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold leading-[1.15] text-text"
          >
            {t("title")}
          </h2>
          <p className="mt-2 text-[0.9rem] leading-[1.55] text-text-2">
            {t("sub")}
          </p>
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
            <div className="rounded-[3px] border border-[rgba(46,139,143,0.3)] bg-white px-4 py-4 text-[0.92rem] font-medium text-river">
              ✓ {t("success")}
            </div>
          ) : (
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
                className="flex-1 rounded-[3px] border border-bg3 bg-white px-5 py-3 text-[0.92rem] text-text outline-none transition-colors placeholder:text-text-3 focus:border-river"
              />
              <button
                type="submit"
                disabled={state === "loading"}
                className="rounded-[3px] bg-river px-7 py-3 text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state === "loading" ? "..." : t("cta")}
              </button>
            </div>
          )}
          {!submitted && (
            <p className="mt-2 text-[0.74rem] text-text-3">
              {t("trust")}
            </p>
          )}
          {state === "error" && (
            <p className="mt-2 text-[0.78rem] text-red-700" role="alert">
              {t("error")}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
