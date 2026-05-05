import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | null | undefined): string {
  if (value == null) return "";
  const needsQuote = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "email",
    "name",
    "locale",
    "status",
    "source",
    "created_at",
    "confirmed_at",
    "unsubscribed_at",
  ].join(",");

  const lines = subscribers.map((s) =>
    [
      csvCell(s.email),
      csvCell(s.name),
      csvCell(s.locale),
      csvCell(s.status),
      csvCell(s.source),
      csvCell(s.createdAt.toISOString()),
      csvCell(s.confirmedAt?.toISOString() ?? null),
      csvCell(s.unsubscribedAt?.toISOString() ?? null),
    ].join(","),
  );

  const body = [header, ...lines].join("\n");
  const filename = `vvaley-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
