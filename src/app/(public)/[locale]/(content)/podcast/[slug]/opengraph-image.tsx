import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ogImage } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// force-static ANULA el force-dynamic que el layout de [locale] impone a
// todo el árbol. Sin esto el revalidate se ignora y satori vuelve a
// componer la imagen en cada rastreo de LinkedIn, Slack o WhatsApp.
export const dynamic = "force-static";
export const revalidate = 604800;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  // Consulta mínima: dos columnas. Nunca relaciones para una imagen.
  const ep = await prisma.episode.findUnique({
    where: { slug },
    select: { title: true, number: true },
  });
  const t = await getTranslations({ locale, namespace: "nav" });

  return ogImage({
    eyebrow: ep?.number
      ? `${t("podcast")} ${String(ep.number).padStart(2, "0")}`
      : t("podcast"),
    title: ep?.title ?? "Valira Valley",
  });
}
