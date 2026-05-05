"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function NewsletterForm() {
  const t = useTranslations("home.newsletter");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");

  return (
    <form
      className="flex gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: wire to /api/newsletter/subscribe in next iteration.
        if (!email) return;
        setState("ok");
      }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("placeholder")}
        className="flex-1 rounded-[3px] border border-bg3 bg-bg px-5 py-3 font-sans text-[0.88rem] text-text outline-none transition-colors placeholder:text-text-3 focus:border-river"
      />
      <button
        type="submit"
        className="rounded-[3px] bg-river px-7 py-3 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
      >
        {t("submit")}
      </button>
      {state === "ok" && (
        <span className="sr-only" role="status">
          {t("success")}
        </span>
      )}
    </form>
  );
}
