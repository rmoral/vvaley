import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  paymentLinkSecret,
  paymentLinkToken,
  paymentLinkUrl,
  verifyPaymentLinkToken,
} from "@/lib/payment-links";
import { paymentLinkState } from "@/lib/event-registration";
import { buildEventMessage, unknownPlaceholders } from "@/lib/event-message-emails";
import { sampleEvent } from "@/lib/email-samples";

/**
 * Enlace de pago que el equipo manda a quien se inscribió y no ha pagado.
 * Lo que hay que fijar: que no se puede fabricar ni reutilizar para otra
 * inscripción, y que nunca abre un cobro a quien no debe pagar.
 */

process.env.PUBLIC_SITE_URL = "https://valiravalley.com";

const SECRET = "secreto-de-prueba";

describe("firma del enlace", () => {
  it("valida la suya y rechaza la de otra inscripción o una manipulada", () => {
    const token = paymentLinkToken("reg_1", SECRET);
    assert.equal(token.length, 22);
    assert.ok(verifyPaymentLinkToken("reg_1", token, SECRET));
    assert.ok(!verifyPaymentLinkToken("reg_2", token, SECRET));
    assert.ok(!verifyPaymentLinkToken("reg_1", token.slice(0, -1) + "A", SECRET));
    assert.ok(!verifyPaymentLinkToken("reg_1", token, "otro-secreto"));
    assert.ok(!verifyPaymentLinkToken("reg_1", undefined, SECRET));
    assert.ok(!verifyPaymentLinkToken("reg_1", token, null));
  });

  it("usa PAYMENT_LINK_SECRET y, si no está, AUTH_SECRET", () => {
    assert.equal(paymentLinkSecret({ PAYMENT_LINK_SECRET: "a", AUTH_SECRET: "b" }), "a");
    assert.equal(paymentLinkSecret({ AUTH_SECRET: "b" }), "b");
    assert.equal(paymentLinkSecret({}), null);
  });

  it("construye la URL en el idioma de la persona", () => {
    const url = paymentLinkUrl({ id: "reg_1", locale: "ca" }, { slug: "open-mic" }, { AUTH_SECRET: SECRET });
    assert.equal(
      url,
      `https://valiravalley.com/ca/eventos/open-mic/pagar?r=reg_1&t=${paymentLinkToken("reg_1", SECRET)}`,
    );
    assert.equal(paymentLinkUrl({ id: "reg_1", locale: "es" }, { slug: "x" }, {}), null);
  });
});

describe("paymentLinkState", () => {
  const now = new Date("2026-11-20T10:00:00Z");
  const event = {
    status: "PUBLISHED" as const,
    startsAt: new Date("2026-12-03T17:00:00Z"),
    capacity: 2,
    onlinePayment: true,
    priceCents: 3000,
    ticketUrl: null,
  };
  const pending = { status: "PENDING_PAYMENT" as const, paymentStatus: "PENDING" as const };

  it("abre el cobro a pendientes de pago con aforo y a confirmados sin pagar", () => {
    assert.equal(paymentLinkState(event, pending, 1, now), "ok");
    assert.equal(paymentLinkState(event, { status: "CONFIRMED", paymentStatus: null }, 2, now), "ok");
    assert.equal(paymentLinkState(event, { ...pending, paymentStatus: "FAILED" }, 0, now), "ok");
  });

  it("no vuelve a cobrar a quien ya pagó", () => {
    assert.equal(paymentLinkState(event, { status: "CONFIRMED", paymentStatus: "PAID" }, 1, now), "already_paid");
  });

  it("no cobra a canceladas, lista de espera, sin aforo ni eventos cerrados", () => {
    assert.equal(paymentLinkState(event, { status: "CANCELLED", paymentStatus: "PENDING" }, 0, now), "cancelled");
    assert.equal(paymentLinkState(event, { status: "WAITLIST", paymentStatus: null }, 0, now), "waitlist");
    assert.equal(paymentLinkState(event, pending, 2, now), "full");
    assert.equal(paymentLinkState({ ...event, status: "CANCELLED" }, pending, 0, now), "closed");
    assert.equal(paymentLinkState(event, pending, 0, new Date("2026-12-04T00:00:00Z")), "closed");
    assert.equal(paymentLinkState({ ...event, onlinePayment: false }, pending, 0, now), "not_payable");
    assert.equal(paymentLinkState({ ...event, ticketUrl: "https://x.com" }, pending, 0, now), "not_payable");
  });
});

describe("hueco {{enlace_pago}}", () => {
  it("existe y se rellena con el enlace de cada persona", () => {
    assert.deepEqual(unknownPlaceholders("Paga aquí: {{enlace_pago}}"), []);
    const url = "https://valiravalley.com/es/eventos/open-mic/pagar?r=reg_1&t=abc";
    const msg = buildEventMessage({
      event: { ...sampleEvent(), slug: "open-mic" },
      registration: { id: "reg_1", fullName: "Marta Puig", company: null },
      locale: "es",
      subject: "Completa tu pago",
      body: "Hola, {{nombre}}:\n\nPaga aquí: {{enlace_pago}}",
      reason: "",
      paymentUrl: url,
    });
    assert.match(msg.text, /Paga aquí: https:\/\/valiravalley\.com\/es\/eventos\/open-mic\/pagar\?r=reg_1&t=abc/);
    assert.ok(msg.html.includes(`<a href="${url.replace("&", "&amp;")}">`));
  });
});
