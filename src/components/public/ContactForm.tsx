"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

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

/** Maps the ?motivo= query param used in CTAs to a preselected topic. */
const TOPIC_FROM_QUERY: Record<string, string> = {
  servicios: "SERVICES",
  invitado: "GUEST",
  patrocinio: "SPONSOR",
  prensa: "PRESS",
};

export function ContactForm({ initialTopic }: { initialTopic?: string }) {
  const t = useTranslations("contact");
  const locale = useLocale();

  const [topic, setTopic] = useState(
    TOPIC_FROM_QUERY[initialTopic ?? ""] ?? "SERVICES",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [result, setResult] = useState<Result>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult({ kind: "loading" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          name,
          email,
          company,
          phone,
          message,
          website,
          locale,
        }),
      });
      if (res.ok) {
        setResult({ kind: "ok" });
        return;
      }
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
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
      <div className="rounded-lg border border-[rgba(46,139,143,0.3)] bg-[rgba(46,139,143,0.05)] p-8 text-center">
        <h2 className="mb-2 font-display text-[1.3rem] font-bold text-text">
          {t("success_title")}
        </h2>
        <p className="text-[0.95rem] leading-[1.7] text-text-2">
          {t("success_body")}
        </p>
      </div>
    );
  }

  const loading = result.kind === "loading";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[0.8rem] font-medium text-text-2">
          {t("topic_label")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-[3px] border px-3.5 py-2 text-[0.82rem] transition-colors ${
                topic === opt.value
                  ? "border-river bg-[rgba(46,139,143,0.08)] font-semibold text-river"
                  : "border-bg3 bg-white text-text-2 hover:border-river-2"
              }`}
            >
              <input
                type="radio"
                name="topic"
                value={opt.value}
                checked={topic === opt.value}
                onChange={() => setTopic(opt.value)}
                className="sr-only"
              />
              {t(opt.key)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label={t("name")}
          value={name}
          onChange={setName}
          required
          autoComplete="name"
        />
        <Field
          label={t("email")}
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />
        <Field
          label={`${t("company")} (${t("optional")})`}
          value={company}
          onChange={setCompany}
          autoComplete="organization"
        />
        <Field
          label={`${t("phone")} (${t("optional")})`}
          type="tel"
          value={phone}
          onChange={setPhone}
          autoComplete="tel"
        />
      </div>

      <label className="flex flex-col gap-1.5 text-[0.8rem] font-medium text-text-2">
        {t("message")}
        <textarea
          required
          rows={6}
          minLength={10}
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("message_ph")}
          className="rounded-md border border-bg3 bg-white px-3.5 py-2.5 text-[0.95rem] text-text outline-none transition-colors focus:border-river"
        />
      </label>

      {/* Honeypot — hidden from humans, catnip for bots. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {result.kind === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[0.87rem] text-red-700">
          {result.reason === "invalid" ? t("error_invalid") : t("error_generic")}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-[3px] bg-river px-8 py-[0.9rem] text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("submit")}
        </button>
        <p className="max-w-[380px] text-[0.76rem] leading-[1.5] text-text-2">
          {t("privacy")}
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[0.8rem] font-medium text-text-2">
      {label}
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-bg3 bg-white px-3.5 py-2.5 text-[0.95rem] text-text outline-none transition-colors focus:border-river"
      />
    </label>
  );
}
