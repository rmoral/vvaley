import { NextResponse } from "next/server";
import { SocialPublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { processPublication } from "@/lib/social/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron endpoint: process every SCHEDULED publication whose scheduledAt is
 * already due. Authentication is via a shared secret (CRON_SECRET) so the
 * systemd timer can hit it without a user session.
 *
 * Call with: curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *   https://valiravalley.com/api/admin/social/process-queue
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.socialPublication.findMany({
    where: {
      status: SocialPublicationStatus.SCHEDULED,
      scheduledAt: { lte: now },
    },
    select: { id: true },
    orderBy: { scheduledAt: "asc" },
    // Cap per run so a backlog doesn't time out the request.
    take: 20,
  });

  const results: Array<{
    id: string;
    ok: boolean;
    delivered: number;
    failed: number;
  }> = [];
  for (const { id } of due) {
    const r = await processPublication(id);
    results.push({ id, ...r });
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
    at: now.toISOString(),
  });
}
