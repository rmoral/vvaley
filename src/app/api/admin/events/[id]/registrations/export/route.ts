import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | null | undefined): string {
  if (value == null) return "";
  const needsQuote = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!event) return new Response("Not found", { status: 404 });

  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "asc" },
  });

  const header = [
    "full_name",
    "email",
    "company",
    "status",
    "locale",
    "notes",
    "created_at",
  ].join(",");

  const lines = registrations.map((r) =>
    [
      csvCell(r.fullName),
      csvCell(r.email),
      csvCell(r.company),
      csvCell(r.status),
      csvCell(r.locale),
      csvCell(r.notes),
      csvCell(r.createdAt.toISOString()),
    ].join(","),
  );

  const body = [header, ...lines].join("\n");
  const filename = `vvaley-${event.slug}-registrations-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
