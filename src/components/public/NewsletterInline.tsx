"use client";

import { useTranslations } from "next-intl";
import { useNewsletterSubscribe } from "@/hooks/useNewsletterSubscribe";

type Props = {
  /** Tracking source, e.g. "blog-post" or "episode". */
  source: string;
  /** Optional override for the title; falls back to the generic CTA copy. */
  variant?: "blog" | "episode" | "default";
};

export function NewsletterInline({ source, variant = "default" }: Props) {
  const t = useTranslations("newsletterCta");
  const { email, setEmail, state, submit } = useNewsletterSubscribe(source);

  const titleKey =
    variant === "blog"
      ? "inlineBlogTitle"
      : variant === "episode"
        ? "inlineEpisodeTitle"
        : "title";

  const submitted = state === "ok";

  return (
    <aside
      aria-labelledby="newsletter-inline-title"
      className="my-12 rounded-xl border border-[rgba(39,117,119,0.25)] bg-[rgba(39,117,119,0.04)] p-6 text-center md:p-8"
    >
      <div className="mx-auto inline-flex items-center gap-2 rounded-[2px] border border-[rgba(39,117,119,0.25)] bg-white px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-river">
        {t("eyebrow")}
      </div>

      <h2
        id="newsletter-inline-title"
        className="mx-auto mt-3 max-w-[460px] font-display text-[clamp(1.3rem,2.2vw,1.7rem)] font-bold leading-[1.2] text-text"
      >
        {t(titleKey)}
      </h2>
      <p className="mx-auto mt-2 max-w-[440px] text-[0.9rem] leading-[1.55] text-text-2">
        {t("sub")}
      </p>

      <form
        className="mx-auto mt-5 max-w-[440px]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
        aria-live="polite"
      >
        {submitted ? (
          <div className="rounded-[3px] border border-[rgba(39,117,119,0.3)] bg-white px-4 py-4 text-[0.92rem] font-medium text-river">
            ✓ {t("success")}
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="newsletter-inline-email" className="sr-only">
              {t("emailLabel")}
            </label>
            <input
              id="newsletter-inline-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("placeholder")}
              disabled={state === "loading"}
              className="flex-1 rounded-[3px] border border-bg3 bg-white px-5 py-3 text-[0.92rem] text-text outline-none transition-colors placeholder:text-text-2 focus:border-river"
            />
            <button
              type="submit"
              disabled={state === "loading"}
              className="rounded-[3px] bg-river px-6 py-3 text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "loading" ? "..." : t("cta")}
            </button>
          </div>
        )}
        {!submitted && (
          <p className="mt-3 text-[0.74rem] text-text-2">{t("trust")}</p>
        )}
        {state === "error" && (
          <p className="mt-2 text-[0.78rem] text-red-700" role="alert">
            {t("error")}
          </p>
        )}
      </form>
    </aside>
  );
}
