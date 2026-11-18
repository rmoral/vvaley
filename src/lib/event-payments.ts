import type { Event, EventRegistration, EventTranslation } from "@prisma/client";
import { registrationIdFrom } from "@/lib/event-registration";
import { prisma } from "@/lib/prisma";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  sendPaidRegistrationTeamNotice,
  sendRegistrationEmail,
  type EventForEmail,
} from "@/lib/event-registration-emails";
import {
  amountToCents,
  createCheckoutSession,
  getCheckoutSession,
  getKunfupayConfig,
  KunfupayError,
  type KunfupayWebhook,
} from "@/lib/kunfupay";
import { getSiteUrl } from "@/lib/site-url";

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
  const confirmedCount = await prisma.eventRegistration.count({
    where: { eventId: reg.eventId, status: "CONFIRMED" },
  });
  await sendPaidRegistrationTeamNotice({
    event: reg.event,
    registration: reg,
    paid: { cents: reg.paidCents ?? reg.amountCents ?? 0, currency: reg.currency ?? "EUR" },
    confirmedCount,
  });

  if (reg.status === "CONFIRMED") await sendPaidConfirmation(reg);
  return true;
}

type RegistrationWithEvent = EventRegistration & { event: EventForEmail };

/**
 * Correo de confirmación a quien ha pagado. Guarda cuándo salió: si el SMTP
 * falla queda a null y el admin lo ve y puede reenviarlo.
 */
export async function sendPaidConfirmation(reg: RegistrationWithEvent): Promise<boolean> {
  const locale = asLocale(reg.locale);
  const result = await sendRegistrationEmail({
    to: reg.email,
    locale,
    event: reg.event,
    registration: reg,
    kind: "confirmed",
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

/** URL de vuelta del checkout: la página de gracias del evento. */
export function paymentReturnUrl(event: Pick<Event, "slug">, registrationId: string, locale: string) {
  return `${getSiteUrl()}/${asLocale(locale)}/eventos/${event.slug}/pago?r=${registrationId}`;
}

/**
 * Abre un checkout de Kunfupay para una inscripción que ya está marcada como
 * pendiente de pago (paymentStatus PENDING, amountCents y paymentAttempts al
 * día) y guarda la sesión. Devuelve la URL a la que redirigir, o null si
 * Kunfupay no está configurado o falla (queda en el log).
 */
export async function openRegistrationCheckout(
  event: Pick<Event, "id" | "slug"> & { translations: Pick<EventTranslation, "locale" | "title">[] },
  registration: Pick<EventRegistration, "id" | "locale" | "amountCents" | "paymentAttempts">,
  source: "registration_form" | "payment_link",
): Promise<string | null> {
  const config = getKunfupayConfig();
  if (!config || registration.amountCents == null) return null;
  const returnUrl = paymentReturnUrl(event, registration.id, registration.locale);
  try {
    const session = await createCheckoutSession(config, {
      amountCents: registration.amountCents,
      currency: "EUR",
      description: eventTitle(event, registration.locale).slice(0, 200),
      externalReference: registration.id,
      metadata: {
        registrationId: registration.id,
        eventId: event.id,
        eventSlug: event.slug,
        source,
      },
      successUrl: returnUrl,
      cancelUrl: `${returnUrl}&cancelled=1`,
      // Un intento = una sesión. Reintentar la misma petición recupera la
      // misma sesión en vez de crear otra.
      idempotencyKey: `vv-reg-${registration.id}-${registration.paymentAttempts}`,
    });
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { kunfupaySessionId: session.id },
    });
    return session.checkoutUrl;
  } catch (err) {
    console.error(
      "[kunfupay] no se pudo crear el checkout",
      registration.id,
      err instanceof KunfupayError ? { status: err.status, body: err.body } : err,
    );
    return null;
  }
}

/** expiresAt de Kunfupay puede venir en segundos o en milisegundos. */
const toMs = (t: number) => (t < 1e12 ? t * 1000 : t);

/**
 * Si la última sesión de la inscripción sigue abierta (al menos 10 minutos
 * más), su URL. Así abrir el enlace de pago varias veces, o que un antivirus
 * de correo lo visite antes que la persona, no deja una sesión por visita.
 */
export async function reusableCheckoutUrl(
  registration: Pick<EventRegistration, "kunfupaySessionId">,
): Promise<string | null> {
  const config = getKunfupayConfig();
  if (!config || !registration.kunfupaySessionId) return null;
  try {
    const session = await getCheckoutSession(config, registration.kunfupaySessionId);
    const open =
      session.status === "pending" &&
      session.checkoutUrl &&
      (session.expiresAt == null || toMs(session.expiresAt) > Date.now() + 10 * 60_000);
    return open ? session.checkoutUrl! : null;
  } catch {
    return null;
  }
}
