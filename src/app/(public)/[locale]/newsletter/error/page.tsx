import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NewsletterErrorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newsletterPages");

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-40 text-center md:px-16">
      <div className="mb-3 text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-text-3">
        {t("error_eyebrow")}
      </div>
      <h1 className="mb-4 font-display text-[clamp(2rem,4vw,2.6rem)] font-black leading-[1.1] text-text">
        {t("error_title")}
      </h1>
      <p className="mb-8 text-[1rem] leading-[1.7] text-text-2">{t("error_body")}</p>
      <Link
        href="/"
        className="inline-block rounded-[3px] border-[1.5px] border-bg3 px-7 py-3 text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-river no-underline transition-colors hover:border-river"
      >
        {t("back_home")}
      </Link>
    </main>
  );
}
