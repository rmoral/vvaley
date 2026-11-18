import { createHmac, timingSafeEqual } from "node:crypto";
import { getSiteUrl } from "@/lib/site-url";

// ---------------------------------------------------------------------------
// Enlace de pago de una inscripción: lo que el equipo manda a quien se
// inscribió y no ha pagado. Lleva a /<idioma>/eventos/<slug>/pagar, que abre
// un checkout de Kunfupay y, al pagar, vuelve a la página de gracias.
//
// El enlace va firmado (HMAC del id de la inscripción) para que no se pueda
// construir a mano ni recorrer ids. No caduca: deja de servir solo, cuando la
// inscripción está pagada o cancelada. La firma usa PAYMENT_LINK_SECRET o, si
// no está, AUTH_SECRET; cambiar ese secreto invalida los enlaces enviados.
// ---------------------------------------------------------------------------

type Env = Record<string, string | undefined>;

export function paymentLinkSecret(env: Env = process.env): string | null {
  return env.PAYMENT_LINK_SECRET?.trim() || env.AUTH_SECRET?.trim() || null;
}

/** Firma corta (128 bits, base64url) del id de la inscripción. */
export function paymentLinkToken(registrationId: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`vv-payment-link:${registrationId}`)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

export function verifyPaymentLinkToken(
  registrationId: string,
  token: string | null | undefined,
  secret: string | null,
): boolean {
  if (!secret || !token || !registrationId) return false;
  const expected = Buffer.from(paymentLinkToken(registrationId, secret));
  const received = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** URL absoluta del enlace de pago, o null si no hay secreto para firmarla. */
export function paymentLinkUrl(
  registration: { id: string; locale: string },
  event: { slug: string },
  env: Env = process.env,
): string | null {
  const secret = paymentLinkSecret(env);
  if (!secret) return null;
  const token = paymentLinkToken(registration.id, secret);
  return `${getSiteUrl()}/${registration.locale}/eventos/${event.slug}/pagar?r=${encodeURIComponent(registration.id)}&t=${token}`;
}
