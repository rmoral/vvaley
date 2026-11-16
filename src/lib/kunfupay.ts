import { createHmac, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Cliente mínimo de la API «Link de pago simple» de Kunfupay.
//
//   POST /api/v1/external/checkout/sessions      → crea un checkout de un uso
//   GET  /api/v1/external/checkout/sessions/:id  → estado (fallback al webhook)
//
// Kunfupay solo ofrece checkout alojado: se redirige al cliente a checkoutUrl
// tal cual llega. Los importes van en unidades mayores (30 = 30,00 €), nunca
// en céntimos. Autenticación con la cabecera X-API-Key (clave secreta: solo
// servidor). Los webhooks se firman con HMAC-SHA256 sobre el body crudo y la
// firma llega en X-Webhook-Signature como "sha256=<hex>".
// ---------------------------------------------------------------------------

const DEFAULT_API_URL = "https://api.kunfupay.com";

export type KunfupayConfig = {
  apiUrl: string;
  apiKey: string;
};

/** null si falta la clave: el cobro online queda desactivado. */
export function getKunfupayConfig(): KunfupayConfig | null {
  const apiKey = process.env.KUNFUPAY_API_KEY?.trim();
  if (!apiKey) return null;
  const apiUrl = (process.env.KUNFUPAY_API_URL?.trim() || DEFAULT_API_URL).replace(/\/$/, "");
  return { apiUrl, apiKey };
}

export class KunfupayError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "KunfupayError";
  }
}

export type CheckoutSessionStatus = "pending" | "completed" | "failed" | "expired" | string;

export type CheckoutSession = {
  id: string;
  checkoutUrl?: string;
  status: CheckoutSessionStatus;
  amount: number;
  currency: string;
  customerEmail?: string;
  externalReference?: string;
  metadata?: Record<string, string>;
  expiresAt?: number;
  createdAt?: number;
};

export type CreateCheckoutSessionInput = {
  /** Importe en céntimos; se convierte a unidades mayores para la API. */
  amountCents: number;
  currency: "EUR" | "USD";
  description: string;
  externalReference: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl?: string;
  idempotencyKey: string;
};

/** 3000 → 30, 2999 → 29.99. La API rechaza más de dos decimales. */
export function centsToAmount(cents: number): number {
  return Math.round(cents) / 100;
}

/** 29.99 → 2999. Redondea para no arrastrar errores de coma flotante. */
export function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

async function request<T>(
  config: KunfupayConfig,
  method: "GET" | "POST",
  path: string,
  init: { body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "X-API-Key": config.apiKey,
    Accept: "application/json",
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new KunfupayError(`Kunfupay ${method} ${path} → ${res.status}`, res.status, data);
  }
  return data as T;
}

export async function createCheckoutSession(
  config: KunfupayConfig,
  input: CreateCheckoutSessionInput,
): Promise<CheckoutSession & { checkoutUrl: string }> {
  const session = await request<CheckoutSession>(config, "POST", "/api/v1/external/checkout/sessions", {
    idempotencyKey: input.idempotencyKey,
    body: {
      amount: centsToAmount(input.amountCents),
      currency: input.currency,
      description: input.description,
      externalReference: input.externalReference,
      metadata: input.metadata,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    },
  });
  if (!session?.id || !session.checkoutUrl) {
    throw new KunfupayError("Kunfupay no devolvió checkoutUrl", 502, session);
  }
  return session as CheckoutSession & { checkoutUrl: string };
}

export async function getCheckoutSession(
  config: KunfupayConfig,
  id: string,
): Promise<CheckoutSession> {
  return request<CheckoutSession>(
    config,
    "GET",
    `/api/v1/external/checkout/sessions/${encodeURIComponent(id)}`,
  );
}

/**
 * Verifica la firma de un webhook. `rawBody` debe ser el cuerpo exacto
 * recibido, antes de parsearlo. Comparación en tiempo constante.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (!secret || typeof signatureHeader !== "string") return false;
  if (!/^sha256=[a-f0-9]{64}$/i.test(signatureHeader)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signatureHeader.slice(7), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Forma común de los webhooks payment.* del checkout simple. */
export type KunfupayWebhook = {
  eventId: string;
  eventType: string;
  timestamp?: number;
  payload?: {
    checkoutSessionId?: string;
    customerEmail?: string;
    externalReference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    metadata?: Record<string, string>;
  };
};

export function parseWebhook(raw: string): KunfupayWebhook | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.eventId !== "string" || !obj.eventId) return null;
  if (typeof obj.eventType !== "string" || !obj.eventType) return null;
  return data as KunfupayWebhook;
}
