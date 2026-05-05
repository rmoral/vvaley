"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

export type SubscribeState = "idle" | "loading" | "ok" | "error";

export function useNewsletterSubscribe(source: string) {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubscribeState>("idle");

  async function submit() {
    if (state === "loading" || !email) return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, source }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      const ok = res.ok && Boolean(data?.ok);
      setState(ok ? "ok" : "error");
      if (ok) setEmail("");
    } catch {
      setState("error");
    }
  }

  return { email, setEmail, state, submit };
}
