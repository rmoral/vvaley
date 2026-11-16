import type { Event, EventRegistration, EventTranslation } from "@prisma/client";
import { registrationIdFrom } from "@/lib/event-registration";
import { prisma } from "@/lib/prisma";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  sendPaidRegistrationTeamNotice,
  sendRegistrationConfirmedEmail,
} from "@/lib/event-registration-emails";
import {
  amountToCents,
  getCheckoutSession,
  getKunfupayConfig,
  type KunfupayWebhook,
} from "@/lib/kunfupay";

// ---------------------------------------------------------------------------
// Cobro de inscripciones con Kunfupay.
//
// Ciclo de vida de una inscripción de pago:
//   1. El formulario crea la inscripción en PENDING_PAYMENT (paymentStatus
//      PENDING) y un checkout en Kunfupay con externalReference = id.
//   2. La persona paga en store.kunfupay.com y vuelve a /eventos/<slug>/pago.
//   3. El webhook payment.completed (o, si se retrasa, la consulta a la API
//      al volver) la pasa a CONFIRMED + PAID y envía el correo. Solo una vez.
//
// Regla de Kunfupay: payment.completed es el único estado terminal; un
// payment.failed nunca deshace un pago completado (pueden llegar
// desordenados).
// ---------------------------------------------------------------------------

function asLocale(value: string): AppLocale {
  return (routing.locales as readonly string[]).includes(value)
    ? (value as AppLocale)
    : routing.defaultLocale;
}

export function eventTitle(
  event: Pick<Event, "slug"> & { translations: Pick<EventTranslation, "locale" | "title">[] },
  locale: string,
): string {
  return (
    event.translations.find((t) => t.locale === locale)?.title ??
    event.translations.find((t) => t.locale === "es")?.title ??
    event.translations[0]?.title ??
    event.slug
  );
}

type Found = { registration: EventRegistration } | null;

async function findRegistration(
  regId: string | null,
  sessionId: string | undefined,
): Promise<Found> {
  if (regId) {
    const registration = await prisma.eventRegistration.findUnique({ where: { id: regId } });
    if (registration) return { registration };
  }
  if (sessionId) {
    const registration = await prisma.eventRegistration.findUnique({
      where: { kunfupaySessionId: sessionId },
    });
    if (registration) return { registration };
  }
  return null;
}

/**
 * Marca la inscripción como pagada y confirmada. Idempotente: el
 * updateMany condicional garantiza que solo la primera llamada (webhook o
 * vuelta del checkout, lo que llegue antes) envía el correo.
 */
export async function confirmPaidRegistration(
  regId: string,
  paid: { amount?: number; currency?: string },
): Promise<boolean> {
  const { count } = await prisma.eventRegistration.updateMany({
    where: { id: regId, paymentStatus: { not: "PAID" } },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      paidCents: paid.amount != null ? amountToCents(paid.amount) : undefined,
      currency: paid.currency ?? undefined,
    },
  });
  if (count === 0) return false;

  // Si el admin la canceló mientras pagaba, se respeta: el dinero ya está
  // cobrado y se resuelve a mano (reembolso o reactivación).
  await prisma.eventRegistration.updateMany({
    where: { id: regId, status: { in: ["PENDING_PAYMENT", "WAITLIST"] } },
    data: { status: "CONFIRMED" },
  });

  const reg = await prisma.eventRegistration.findUnique({
    where: { id: regId },
    include: { event: { include: { translations: true } } },
  });
  if (!reg) return true;

  // Al equipo siempre, aunque la inscripción estuviera cancelada: hay un
  // cobro que conocer.
  await sendPaidRegistrationTeamNotice({
    eventId: reg.eventId,
    eventTitle: eventTitle(reg.event, "es"),
    fullName: reg.fullName,
    email: reg.email,
    company: reg.company,
    notes: reg.notes,
    status: reg.status,
    cents: reg.paidCents ?? reg.amountCents ?? 0,
    currency: reg.currency ?? "EUR",
  });

  if (reg.status === "CONFIRMED") await sendPaidConfirmation(reg);
  return true;
}

type RegistrationWithEvent = EventRegistration & {
  event: Pick<Event, "slug"> & { translations: Pick<EventTranslation, "locale" | "title">[] };
};

/**
 * Correo de confirmación a quien ha pagado. Guarda cuándo salió: si el SMTP
 * falla queda a null y el admin lo ve y puede reenviarlo.
 */
export async function sendPaidConfirmation(reg: RegistrationWithEvent): Promise<boolean> {
  const locale = asLocale(reg.locale);
  const result = await sendRegistrationConfirmedEmail({
    to: reg.email,
    locale,
    eventTitle: eventTitle(reg.event, locale),
    paid:
      reg.paymentStatus === "PAID"
        ? { cents: reg.paidCents ?? reg.amountCents ?? 0, currency: reg.currency ?? "EUR" }
        : undefined,
  });
  if (!result.ok || result.dryRun) {
    console.error(`[kunfupay] correo de confirmación no enviado (${result.ok ? "dry_run" : result.error})`, reg.id);
    return false;
  }
  await prisma.eventRegistration.update({
    where: { id: reg.id },
    data: { confirmationEmailSentAt: new Date() },
  });
  return true;
}

/** Un fallo solo cuenta si el pago no se ha completado antes. */
export async function markPaymentFailed(regId: string): Promise<void> {
  await prisma.eventRegistration.updateMany({
    where: { id: regId, paymentStatus: "PENDING" },
    data: { paymentStatus: "FAILED" },
  });
}

export type WebhookOutcome = "confirmed" | "already_paid" | "failed" | "ignored" | "unknown_registration";

/** Aplica un webhook ya verificado y deduplicado. */
export async function applyKunfupayWebhook(event: KunfupayWebhook): Promise<WebhookOutcome> {
  if (event.eventType !== "payment.completed" && event.eventType !== "payment.failed") {
    // Contracargos y reembolsos quedan guardados en la bandeja para
    // conciliar a mano; no cambian la inscripción.
    return "ignored";
  }
  const payload = event.payload ?? {};
  const found = await findRegistration(registrationIdFrom(payload), payload.checkoutSessionId);
  if (!found) return "unknown_registration";

  if (event.eventType === "payment.completed") {
    const changed = await confirmPaidRegistration(found.registration.id, {
      amount: payload.amount,
      currency: payload.currency,
    });
    return changed ? "confirmed" : "already_paid";
  }

  await markPaymentFailed(found.registration.id);
  return "failed";
}

/**
 * Fallback al volver del checkout: si el webhook aún no ha llegado,
 * pregunta a Kunfupay por la sesión y aplica el resultado.
 */
export async function syncRegistrationPayment(reg: EventRegistration): Promise<void> {
  if (reg.paymentStatus === "PAID" || !reg.kunfupaySessionId) return;
  const config = getKunfupayConfig();
  if (!config) return;
  try {
    const session = await getCheckoutSession(config, reg.kunfupaySessionId);
    if (session.status === "completed") {
      await confirmPaidRegistration(reg.id, {
        amount: session.amount,
        currency: session.currency,
      });
    } else if (session.status === "failed") {
      await markPaymentFailed(reg.id);
    }
  } catch (err) {
    console.error("[kunfupay] no se pudo consultar la sesión", reg.kunfupaySessionId, err);
  }
}
