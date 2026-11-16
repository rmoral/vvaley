"use client";
// ---------------------------------------------------------------------------
// Formulario de inscripción (namespace `eventDetail`).
//
// El POST a /api/events/[slug]/register devuelve:
//   · CONFIRMED / WAITLIST → se pinta el estado aquí mismo.
//   · PENDING_PAYMENT + checkoutUrl → evento de pago: se redirige al checkout
//     de Kunfupay, que devuelve a /eventos/[slug]/pago.
// Los errores se resuelven por `error_${reason}` con caída a error_unknown.
//
// Con priceLabel (evento de pago) se muestra el precio, una nota sobre el
// pago y el botón cambia a «Continuar al pago».
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "redirecting" }
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
  "payment_unavailable",
  "already_paid",
  "network",
  "unknown",
] as const;

type KnownError = (typeof KNOWN_ERRORS)[number];

function errorKey(reason: string): `error_${KnownError}` {
  return (KNOWN_ERRORS as readonly string[]).includes(reason)
    ? (`error_${reason}` as `error_${KnownError}`)
    : "error_unknown";
}

export function EventRegistrationForm({
  slug,
  priceLabel = null,
}: {
  slug: string;
  /** Precio formateado si la inscripción se cobra online. */
  priceLabel?: string | null;
}) {
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
    if (result.kind === "loading" || result.kind === "redirecting") return;
    setResult({ kind: "loading" });
    try {
      const res = await fetch(`/api/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, locale }),
      });
      const data = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            status?: "CONFIRMED" | "WAITLIST" | "PENDING_PAYMENT";
            checkoutUrl?: string;
            error?: string;
          }
        | null;

      if (res.ok && data?.ok && data.status === "PENDING_PAYMENT" && data.checkoutUrl) {
        setResult({ kind: "redirecting" });
        window.location.assign(data.checkoutUrl);
      } else if (res.ok && data?.ok && data.status !== "PENDING_PAYMENT") {
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

  const loading = result.kind === "loading" || result.kind === "redirecting";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-lg border border-bg3 bg-white p-6"
    >
      <h3 className="mb-4 font-display text-card font-bold text-text">
        {t("form_title")}
      </h3>

      {priceLabel ? (
        <p className="mb-4 text-[0.92rem] text-text-2">
          <span className="font-semibold text-text">{t("price_label", { price: priceLabel })}</span>
          <span className="mt-1 block text-[0.82rem] leading-[1.6]">{t("pay_note")}</span>
        </p>
      ) : null}

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
          {result.kind === "redirecting"
            ? t("redirecting")
            : loading
              ? "…"
              : t(priceLabel ? "form_cta_pay" : "form_cta")}
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
