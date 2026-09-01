"use client";
// ---------------------------------------------------------------------------
// REESCRITO sobre el namespace `eventDetail` existente. No introduce ninguna
// clave nueva: usa exactamente las que ya están en los cuatro JSON.
//
// Claves consumidas (todas ya existentes):
//   form_title · field_name · field_email · field_company · field_notes
//   form_cta · registered_eyebrow · registered_title · registered_body
//   waitlist_eyebrow · waitlist_title · waitlist_body
//   error_not_open_yet · error_closed · error_event_passed · error_not_published
//   error_invalid_input · error_invalid_json · error_not_found · error_network
//   error_unknown
//
// Se conserva íntegra la lógica original: el POST a /api/events/[slug]/register
// devuelve status CONFIRMED o WAITLIST, y el mensaje de error se resuelve por
// `error_${reason}` con caída a error_unknown.
//
// Qué cambia respecto al componente actual del repo:
//   · Campos vía <TextField> (etiqueta visible, foco teal, radius del sistema)
//   · Botón vía <Button> (una sola definición de estilo en todo el sitio)
//   · Error en --color-alert en lugar de text-red-700, y con role="alert"
//   · El estado de éxito no salta de layout y anuncia con aria-live
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; status: "CONFIRMED" | "WAITLIST" }
  | { kind: "error"; reason: string };

// Razones que el API puede devolver y que TIENEN mensaje propio en eventDetail.
const KNOWN_ERRORS = [
  "not_open_yet",
  "closed",
  "event_passed",
  "not_published",
  "invalid_input",
  "invalid_json",
  "not_found",
  "network",
  "unknown",
] as const;

type KnownError = (typeof KNOWN_ERRORS)[number];

function errorKey(reason: string): `error_${KnownError}` {
  return (KNOWN_ERRORS as readonly string[]).includes(reason)
    ? (`error_${reason}` as `error_${KnownError}`)
    : "error_unknown";
}

export function EventRegistrationForm({ slug }: { slug: string }) {
  const t = useTranslations("eventDetail");
  const locale = useLocale();

  const [fields, setFields] = useState({
    fullName: "",
    email: "",
    company: "",
    notes: "",
  });
  const [result, setResult] = useState<Result>({ kind: "idle" });

  const set = (k: keyof typeof fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (result.kind === "loading") return;
    setResult({ kind: "loading" });
    try {
      const res = await fetch(`/api/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, locale }),
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
    const waitlisted = result.status === "WAITLIST";
    return (
      <div
        aria-live="polite"
        className="rounded-lg border border-river/30 bg-river/[0.05] p-6 text-center"
      >
        <p className="mb-1 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-river">
          ✓ {t(waitlisted ? "waitlist_eyebrow" : "registered_eyebrow")}
        </p>
        <h3 className="font-display text-[1.3rem] font-bold text-text text-pretty">
          {t(waitlisted ? "waitlist_title" : "registered_title")}
        </h3>
        <p className="mt-2 text-[0.92rem] leading-[1.7] text-text-2">
          {t(waitlisted ? "waitlist_body" : "registered_body")}
        </p>
      </div>
    );
  }

  const loading = result.kind === "loading";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-lg border border-bg3 bg-white p-6"
    >
      <h3 className="mb-4 font-display text-card font-bold text-text">
        {t("form_title")}
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="ev-name"
          label={t("field_name")}
          required
          autoComplete="name"
          value={fields.fullName}
          onChange={set("fullName")}
        />
        <TextField
          id="ev-email"
          label={t("field_email")}
          type="email"
          required
          autoComplete="email"
          value={fields.email}
          onChange={set("email")}
        />
      </div>

      <div className="mt-4">
        <TextField
          id="ev-company"
          label={t("field_company")}
          autoComplete="organization"
          value={fields.company}
          onChange={set("company")}
        />
      </div>

      <div className="mt-4">
        <TextField
          id="ev-notes"
          label={t("field_notes")}
          multiline
          rows={3}
          value={fields.notes}
          onChange={set("notes")}
        />
      </div>

      <div className="mt-5">
        <Button type="submit" disabled={loading} fullWidthMobile>
          {loading ? "…" : t("form_cta")}
        </Button>
      </div>

      {result.kind === "error" ? (
        <p role="alert" className="mt-3 text-[0.85rem] text-alert">
          {t(errorKey(result.reason))}
        </p>
      ) : null}
    </form>
  );
}
