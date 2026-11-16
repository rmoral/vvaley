import type { PrismaClient } from "@prisma/client";
import type { EventForEmail } from "@/lib/event-registration-emails";

/**
 * Evento real para los ejemplos de correo: el próximo publicado, o el último
 * si no hay ninguno por venir. null = se usa el evento de ejemplo.
 */
export async function emailPreviewEvent(prisma: PrismaClient): Promise<EventForEmail | null> {
  const include = { translations: { select: { locale: true, title: true } } } as const;
  return (
    (await prisma.event.findFirst({
      where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      include,
    })) ??
    (await prisma.event.findFirst({
      where: { status: { in: ["PUBLISHED", "COMPLETED"] } },
      orderBy: { startsAt: "desc" },
      include,
    }))
  );
}
