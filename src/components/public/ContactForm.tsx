"use client";
// "use client" OBLIGATORIO: estado del formulario + fetch a /api/contact.
// Ya era cliente antes. Cambios del rediseño: campos vía <TextField>,
// error con --color-alert en lugar de red-700 de Tailwind, foco teal.

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "error"; reason: "invalid" | "generic" };

const TOPICS = [
  { value: "SERVICES", key: "topic_services" },
  { value: "GUEST", key: "topic_guest" },
  { value: "SPONSOR", key: "topic_sponsor" },
  { value: "PRESS", key: "topic_press" },
  { value: "OTHER", key: "topic_other" },
] as const;

const TOPIC_FROM_QUERY: Record<string, string> = {
  servicios: "SERVICES",
  invitado: "GUEST",
  patrocinio: "SPONSOR",
  prensa: "PRESS",
};

export function ContactForm({ initialTopic }: { initialTopic?: string }) {
  const t = useTranslations("contact");
  const locale = useLocale();

  const [topic, setTopic] = useState(TOPIC_FROM_QUERY[initialTopic ?? ""] ?? "SERVICES");
  const [fields, setFields] = useState({
    name: "", email: "", company: "", phone: "", message: "", website: "",
  });
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const set = (k: keyof typeof fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult({ kind: "loading" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, ...fields, locale }),
      });
      if (res.ok) return setResult({ kind: "ok" });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setResult({
        kind: "error",
        reason: payload.error === "invalid_input" ? "invalid" : "generic",
      });
    } catch {
      setResult({ kind: "error", reason: "generic" });
    }
  }

  if (result.kind === "ok") {
    return (
      <div className="rounded-lg border border-river/30 bg-river/[0.05] p-8 text-center">
        <h2 className="mb-2 font-display text-[1.3rem] font-bold text-text">
          {t("success_title")}
        </h2>
        <p className="text-[0.95rem] leading-[1.7] text-text-2">{t("success_body")}</p>
      </div>
    );
  }

  const loading = result.kind === "loading";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-[0.8rem] font-medium text-text-2">
          {t("topic_label")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((opt) => {
            const active = topic === opt.value;
            return (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-btn border px-3.5 py-2 text-[0.82rem] transition-colors duration-150 ${
                  active
                    ? "border-river bg-river/[0.08] font-semibold text-river"
                    : "border-bg3 bg-white text-text-2 hover:border-river-2"
                }`}
              >
                <input
                  type="radio"
                  name="topic"
                  value={opt.value}
                  checked={active}
                  onChange={() => setTopic(opt.value)}
                  className="sr-only"
                />
                {t(opt.key)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField id="c-name" label={t("name")} value={fields.name} onChange={set("name")} required autoComplete="name" />
        <TextField id="c-email" label={t("email")} type="email" value={fields.email} onChange={set("email")} required autoComplete="email" />
        <TextField id="c-company" label={t("company")} optional optionalLabel={t("optional")} value={fields.company} onChange={set("company")} autoComplete="organization" />
        <TextField id="c-phone" label={t("phone")} type="tel" optional optionalLabel={t("optional")} value={fields.phone} onChange={set("phone")} autoComplete="tel" />
      </div>

      <TextField
        id="c-message" label={t("message")} multiline rows={6} minLength={10} maxLength={5000}
        placeholder={t("message_ph")} value={fields.message} onChange={set("message")} required
      />

      {/* Honeypot — oculto para humanos. */}
      <div aria-hidden className="absolute left-[-9999px] size-0 overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={fields.website} onChange={set("website")} />
        </label>
      </div>

      {result.kind === "error" ? (
        <div role="alert" className="rounded-field border border-alert/30 bg-alert/[0.06] px-4 py-3 text-[0.87rem] text-alert">
          {result.reason === "invalid" ? t("error_invalid") : t("error_generic")}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={loading} fullWidthMobile>
          {loading ? t("sending") : t("submit")}
        </Button>
        <p className="max-w-[380px] text-[0.76rem] leading-[1.5] text-text-2">{t("privacy")}</p>
      </div>
    </form>
  );
}
