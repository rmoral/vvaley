import type { Event, EventRegistration } from "@prisma/client";

export type RegistrationGate =
  | { open: true }
  | {
      open: false;
      reason: "not_open_yet" | "closed" | "event_passed" | "not_published";
    };

export function registrationGate(
  event: Pick<
    Event,
    "status" | "registrationOpensAt" | "registrationClosesAt" | "startsAt"
  >,
  now: Date = new Date(),
): RegistrationGate {
  if (event.status !== "PUBLISHED") {
    return { open: false, reason: "not_published" };
  }
  if (event.startsAt.getTime() < now.getTime()) {
    return { open: false, reason: "event_passed" };
  }
  if (event.registrationOpensAt && event.registrationOpensAt > now) {
    return { open: false, reason: "not_open_yet" };
  }
  if (event.registrationClosesAt && event.registrationClosesAt < now) {
    return { open: false, reason: "closed" };
  }
  return { open: true };
}

/** Mínimo que acepta Kunfupay tras descuentos: 0,99. */
export const MIN_ONLINE_PRICE_CENTS = 99;

export type PaidEventFields = Pick<Event, "onlinePayment" | "priceCents" | "ticketUrl">;

/**
 * ¿El formulario propio de este evento cobra online? La venta externa
 * (ticketUrl) manda sobre el cobro propio, igual que en la landing.
 */
export function requiresOnlinePayment(event: PaidEventFields): boolean {
  return (
    event.onlinePayment &&
    !event.ticketUrl &&
    event.priceCents != null &&
    event.priceCents >= MIN_ONLINE_PRICE_CENTS
  );
}

/** Id de nuestra inscripción a partir de un webhook o una sesión. */
export function registrationIdFrom(source: {
  externalReference?: string;
  metadata?: Record<string, string>;
}): string | null {
  return source.metadata?.registrationId || source.externalReference || null;
}

/**
 * Qué pasa al abrir el enlace de pago de una inscripción:
 *   · ok           → se abre el checkout de Kunfupay;
 *   · already_paid → se manda a la página de gracias, sin volver a cobrar;
 *   · el resto     → no se cobra y se explica por qué.
 * La lista de espera no paga con el enlace: si se libera una plaza, el
 * equipo la confirma antes y entonces el enlace funciona. Una pendiente de
 * pago sí, mientras quede aforo (las confirmadas ya tienen su plaza).
 */
export type PaymentLinkState =
  | "ok"
  | "already_paid"
  | "cancelled"
  | "waitlist"
  | "full"
  | "closed"
  | "not_payable";

export function paymentLinkState(
  event: PaidEventFields & Pick<Event, "status" | "startsAt" | "capacity">,
  registration: Pick<EventRegistration, "status" | "paymentStatus">,
  confirmedCount: number,
  now: Date = new Date(),
): PaymentLinkState {
  if (registration.paymentStatus === "PAID") return "already_paid";
  if (registration.status === "CANCELLED") return "cancelled";
  if (registration.status === "WAITLIST") return "waitlist";
  if (!requiresOnlinePayment(event)) return "not_payable";
  if (event.status !== "PUBLISHED" || event.startsAt.getTime() < now.getTime()) return "closed";
  if (
    registration.status === "PENDING_PAYMENT" &&
    event.capacity != null &&
    confirmedCount >= event.capacity
  ) {
    return "full";
  }
  return "ok";
}
