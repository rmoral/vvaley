import { getTranslations } from "next-intl/server";
import { ogImage } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// NO hereda el force-dynamic del layout: esta imagen es la misma toda la
// semana y regenerarla en cada rastreo sale caro en satori.
// force-static ANULA el force-dynamic que el layout de [locale] impone a
// todo el árbol. Sin esto el revalidate se ignora y satori vuelve a
// componer la imagen en cada rastreo de LinkedIn, Slack o WhatsApp.
export const dynamic = "force-static";
export const revalidate = 604800;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return ogImage({
    eyebrow: t("hero.eyebrow"),
    title: `${t("hero.title_1")} ${t("hero.title_2")}`,
  });
}
