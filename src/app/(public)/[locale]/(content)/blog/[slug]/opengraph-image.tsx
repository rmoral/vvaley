import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { ogImage } from "@/lib/og";
import type { AppLocale } from "@/i18n/routing";

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
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { translations: { select: { locale: true, title: true } } },
  });
  const t = await getTranslations({ locale, namespace: "nav" });
  const tr = post ? pickTranslation(post, locale as AppLocale) : null;

  return ogImage({
    eyebrow: t("blog"),
    title: tr?.title ?? "Valira Valley",
  });
}
