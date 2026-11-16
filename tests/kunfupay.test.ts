import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  amountToCents,
  centsToAmount,
  parseWebhook,
  verifyWebhookSignature,
} from "@/lib/kunfupay";
import {
  MIN_ONLINE_PRICE_CENTS,
  registrationIdFrom,
  requiresOnlinePayment,
} from "@/lib/event-registration";

/**
 * Cobro de inscripciones con Kunfupay: firma de webhooks (HMAC-SHA256 sobre
 * el body crudo, cabecera "sha256=<hex>"), conversión de importes (la API
 * trabaja en unidades mayores, nosotros en céntimos) y cuándo un evento se
 * cobra online.
 */

const SECRET = "whsec_test";
const sign = (body: string, secret = SECRET) =>
  `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ eventId: "evt_1", eventType: "payment.completed" });

  it("acepta una firma válida", () => {
    assert.equal(verifyWebhookSignature(body, sign(body), SECRET), true);
  });

  it("acepta el hex en mayúsculas", () => {
    const sig = sign(body);
    assert.equal(verifyWebhookSignature(body, `sha256=${sig.slice(7).toUpperCase()}`, SECRET), true);
  });

  it("rechaza si el body cambia un solo carácter", () => {
    assert.equal(verifyWebhookSignature(`${body} `, sign(body), SECRET), false);
  });

  it("rechaza otro secreto", () => {
    assert.equal(verifyWebhookSignature(body, sign(body, "otro"), SECRET), false);
  });

  it("rechaza sin secreto configurado, sin cabecera o con formato raro", () => {
    assert.equal(verifyWebhookSignature(body, sign(body), undefined), false);
    assert.equal(verifyWebhookSignature(body, sign(body), ""), false);
    assert.equal(verifyWebhookSignature(body, null, SECRET), false);
    assert.equal(verifyWebhookSignature(body, sign(body).slice(7), SECRET), false);
    assert.equal(verifyWebhookSignature(body, "sha256=abc", SECRET), false);
  });
});

describe("parseWebhook", () => {
  it("exige eventId y eventType", () => {
    assert.equal(parseWebhook("no json"), null);
    assert.equal(parseWebhook("null"), null);
    assert.equal(parseWebhook(JSON.stringify({ eventType: "payment.completed" })), null);
    assert.equal(parseWebhook(JSON.stringify({ eventId: "e" })), null);
    const ok = parseWebhook(
      JSON.stringify({
        eventId: "e",
        eventType: "payment.completed",
        payload: { checkoutSessionId: "s", amount: 30, currency: "EUR" },
      }),
    );
    assert.equal(ok?.payload?.amount, 30);
  });
});

describe("importes", () => {
  it("convierte céntimos a unidades mayores y vuelta", () => {
    assert.equal(centsToAmount(3000), 30);
    assert.equal(centsToAmount(2999), 29.99);
    assert.equal(amountToCents(29.99), 2999);
    assert.equal(amountToCents(0.1 + 0.2), 30);
  });
});

describe("requiresOnlinePayment", () => {
  const base = { onlinePayment: true, priceCents: 3000, ticketUrl: null };

  it("cobra con la casilla activada y precio", () => {
    assert.equal(requiresOnlinePayment(base), true);
  });

  it("no cobra si la casilla está desactivada", () => {
    assert.equal(requiresOnlinePayment({ ...base, onlinePayment: false }), false);
  });

  it("la venta externa manda sobre el cobro propio", () => {
    assert.equal(requiresOnlinePayment({ ...base, ticketUrl: "https://example.com" }), false);
  });

  it("sin precio o por debajo del mínimo de Kunfupay no cobra", () => {
    assert.equal(requiresOnlinePayment({ ...base, priceCents: null }), false);
    assert.equal(requiresOnlinePayment({ ...base, priceCents: 0 }), false);
    assert.equal(requiresOnlinePayment({ ...base, priceCents: MIN_ONLINE_PRICE_CENTS - 1 }), false);
    assert.equal(requiresOnlinePayment({ ...base, priceCents: MIN_ONLINE_PRICE_CENTS }), true);
  });
});

describe("registrationIdFrom", () => {
  it("prefiere metadata.registrationId y cae a externalReference", () => {
    assert.equal(registrationIdFrom({ metadata: { registrationId: "a" }, externalReference: "b" }), "a");
    assert.equal(registrationIdFrom({ externalReference: "b" }), "b");
    assert.equal(registrationIdFrom({}), null);
  });
});
