import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseWebhook, verifyWebhookSignature } from "@/lib/kunfupay";
import { applyKunfupayWebhook } from "@/lib/event-payments";

// Webhook de Kunfupay. Se configura en el panel de Kunfupay (sección
// Webhooks) apuntando a https://valiravalley.com/api/kunfupay/webhook con los
// eventos payment.completed y payment.failed. El secreto de firma va en
// KUNFUPAY_WEBHOOK_SECRET.
//
// Kunfupay entrega al menos una vez y reintenta ante cualquier no-2xx, con
// un timeout de 10 s. Por eso: firma sobre el body crudo → guardar eventId
// (único) → aplicar → 200. Un evento ya procesado responde 200 sin repetir
// nada; uno que falló a medias se reprocesa en el reintento (aplicarlo es
// idempotente).

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  const ok = verifyWebhookSignature(
    raw,
    req.headers.get("x-webhook-signature"),
    process.env.KUNFUPAY_WEBHOOK_SECRET,
  );
  if (!ok) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const event = parseWebhook(raw);
  if (!event) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const stored = await prisma.kunfupayWebhookEvent.upsert({
    where: { eventId: event.eventId },
    update: {},
    create: {
      eventId: event.eventId,
      eventType: event.eventType,
      payload: event as unknown as Prisma.InputJsonValue,
    },
  });
  if (stored.processedAt) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const outcome = await applyKunfupayWebhook(event);
    await prisma.kunfupayWebhookEvent.update({
      where: { id: stored.id },
      data: {
        processedAt: new Date(),
        error: outcome === "unknown_registration" ? "unknown_registration" : null,
      },
    });
    return NextResponse.json({ received: true, outcome });
  } catch (err) {
    console.error("[kunfupay] error procesando webhook", event.eventId, err);
    await prisma.kunfupayWebhookEvent
      .update({
        where: { id: stored.id },
        data: { error: err instanceof Error ? err.message.slice(0, 500) : "error" },
      })
      .catch(() => {});
    // 5xx → Kunfupay reintenta.
    return NextResponse.json({ error: "retry" }, { status: 503 });
  }
}
