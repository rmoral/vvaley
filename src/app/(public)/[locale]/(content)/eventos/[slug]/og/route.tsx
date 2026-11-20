import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { ogImage } from "@/lib/og";
import { asEmailLocale } from "@/lib/email-copy";

// Imagen para compartir un evento sin portada (la usa generateMetadata de la
// página del evento): título y fecha con la composición común de og.tsx. No
// es un opengraph-image.tsx porque esa convención sustituiría también la
// portada de los eventos que sí la tienen.

export const revalidate = 86400;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale: raw, slug } = await params;
  const locale = asEmailLocale(raw);
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { startsAt: true, timezone: true, status: true, translations: { select: { locale: true, title: true } } },
  });
  const visible = event && (event.status === "PUBLISHED" || event.status === "COMPLETED");
  const title = visible ? (pickTranslation(event, locale)?.title ?? "Valira Valley") : "Valira Valley";
  const eyebrow = visible
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: event.timezone || "Europe/Andorra",
      }).format(event.startsAt)
    : "Valira Valley";
  return ogImage({ eyebrow, title });
}
