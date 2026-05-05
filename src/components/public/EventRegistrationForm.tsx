"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; status: "CONFIRMED" | "WAITLIST" }
  | { kind: "error"; reason: string };

export function EventRegistrationForm({ slug }: { slug: string }) {
  const t = useTranslations("eventDetail");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<Result>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (result.kind === "loading") return;
    setResult({ kind: "loading" });
    try {
      const res = await fetch(`/api/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, company, notes, locale }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; status?: "CONFIRMED" | "WAITLIST"; error?: string }
        | null;
      if (res.ok && data?.ok) {
        setResult({ kind: "ok", status: data.status ?? "CONFIRMED" });
      } else {
        setResult({ kind: "error", reason: data?.error ?? "unknown" });
      }
    } catch {
      setResult({ kind: "error", reason: "network" });
    }
  }

  if (result.kind === "ok") {
    return (
      <div className="rounded-lg border border-[rgba(46,139,143,0.3)] bg-[rgba(46,139,143,0.05)] p-6 text-center">
        <div className="mb-1 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-river">
          ✓{" "}
          {result.status === "WAITLIST"
            ? t("waitlist_eyebrow")
            : t("registered_eyebrow")}
        </div>
        <h3 className="font-display text-[1.3rem] font-bold text-text">
          {result.status === "WAITLIST"
            ? t("waitlist_title")
            : t("registered_title")}
        </h3>
        <p className="mt-2 text-[0.92rem] text-text-2">
          {result.status === "WAITLIST"
            ? t("waitlist_body")
            : t("registered_body")}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-lg border border-bg3 bg-white p-6"
    >
      <h3 className="mb-4 font-display text-[1.2rem] font-bold text-text">
        {t("form_title")}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label={t("field_name")}
          required
          value={fullName}
          onChange={setFullName}
          autoComplete="name"
        />
        <Field
          label={t("field_email")}
          required
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
      </div>
      <div className="mt-3">
        <Field
          label={t("field_company")}
          value={company}
          onChange={setCompany}
          autoComplete="organization"
        />
      </div>
      <div className="mt-3">
        <FieldArea
          label={t("field_notes")}
          value={notes}
          onChange={setNotes}
        />
      </div>

      <button
        type="submit"
        disabled={result.kind === "loading"}
        className="mt-5 w-full rounded-[3px] bg-river px-7 py-3 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {result.kind === "loading" ? "..." : t("form_cta")}
      </button>

      {result.kind === "error" && (
        <p className="mt-3 text-[0.85rem] text-red-700" role="alert">
          {t(`error_${result.reason}` as Parameters<typeof t>[0]) ||
            t("error_unknown")}
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  required,
  type = "text",
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
      {label} {required && <span aria-hidden className="text-river">*</span>}
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none transition-colors focus:border-river"
      />
    </label>
  );
}

function FieldArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
      {label}
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none transition-colors focus:border-river"
      />
    </label>
  );
}
