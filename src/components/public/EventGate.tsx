import { useTranslations } from "next-intl";
import { EventRegistrationForm } from "./EventRegistrationForm";

// Server Component. Encapsula la lógica de aforo y cierre que hoy está
// suelta en eventos/[slug]/page.tsx, sin cambiar ni una clave de i18n.
//
// Claves consumidas (existentes en eventDetail):
//   seats_left · seats_full · gate_not_open_yet · gate_closed · gate_event_passed
//
// registrationGate() de @/lib/event-registration sigue calculándose en la
// página: aquí solo se pinta el resultado.

export type GateReason = "not_open_yet" | "closed" | "event_passed" | "not_published";

export function EventGate({
  slug,
  open,
  reason,
  seatsLeft,
}: {
  slug: string;
  open: boolean;
  /** Motivo del cierre cuando open === false. */
  reason?: GateReason;
  /** null = aforo ilimitado. 0 = completo (el API pasará a lista de espera). */
  seatsLeft?: number | null;
}) {
  const t = useTranslations("eventDetail");

  if (!open) {
    // not_published reutiliza el copy de event_passed, igual que hoy.
    const key =
      reason === "not_open_yet"
        ? "gate_not_open_yet"
        : reason === "closed"
          ? "gate_closed"
          : "gate_event_passed";

    return (
      <div className="rounded-lg border border-bg3 bg-bg2 p-6 text-center text-[0.92rem] leading-[1.7] text-text-2">
        {t(key)}
      </div>
    );
  }

  const full = seatsLeft === 0;

  return (
    <>
      {seatsLeft != null ? (
        <p
          className={`mb-4 text-[0.74rem] font-semibold uppercase tracking-[0.14em] ${
            full ? "text-stone" : "text-river"
          }`}
        >
          {full ? t("seats_full") : t("seats_left", { count: seatsLeft })}
        </p>
      ) : null}
      <EventRegistrationForm slug={slug} />
    </>
  );
}
