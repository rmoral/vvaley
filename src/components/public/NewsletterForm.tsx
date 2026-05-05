"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type State = "idle" | "loading" | "ok" | "error";

export function NewsletterForm({ source = "home" }: { source?: string }) {
  const t = useTranslations("home.newsletter");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, source }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean }
        | null;
      setState(res.ok && data?.ok ? "ok" : "error");
      if (res.ok) setEmail("");
    } catch {
      setState("error");
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
      <div className="flex gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("placeholder")}
          disabled={state === "loading"}
          className="flex-1 rounded-[3px] border border-bg3 bg-bg px-5 py-3 font-sans text-[0.88rem] text-text outline-none transition-colors placeholder:text-text-3 focus:border-river"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="rounded-[3px] bg-river px-7 py-3 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "loading" ? "..." : t("submit")}
        </button>
      </div>
      {state === "ok" && (
        <p className="text-[0.85rem] text-river" role="status">
          {t("success")}
        </p>
      )}
      {state === "error" && (
        <p className="text-[0.85rem] text-red-700" role="alert">
          {t("error")}
        </p>
      )}
    </form>
  );
}
