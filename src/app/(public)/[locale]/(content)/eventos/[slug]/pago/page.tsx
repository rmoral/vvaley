import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { syncRegistrationPayment } from "@/lib/event-payments";
import { Button } from "@/components/ui/Button";
import { PaymentStatusRefresher } from "@/components/public/PaymentStatusRefresher";

// Vuelta desde el checkout de Kunfupay. La fuente de verdad es el webhook;
// si aún no ha llegado, se consulta la sesión a Kunfupay como respaldo y,
// mientras siga pendiente, la página se refresca sola.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type State = "paid" | "pending" | "failed" | "unknown";

export default async function EventPaymentReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ r?: string; cancelled?: string }>;
}) {
  const { locale, slug } = await params;
  const { r, cancelled } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("eventPayment");

  let state: State = "unknown";
  if (r) {
    let reg = await prisma.eventRegistration.findFirst({
      where: { id: r, event: { slug } },
    });
    if (reg?.paymentStatus === "PENDING") {
      await syncRegistrationPayment(reg);
      reg = await prisma.eventRegistration.findUnique({ where: { id: reg.id } });
    }
    if (reg?.paymentStatus === "PAID") state = "paid";
    else if (reg?.paymentStatus === "FAILED") state = "failed";
    else if (reg?.paymentStatus === "PENDING") state = cancelled ? "failed" : "pending";
  }

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-40 text-center md:px-16">
      <div
        aria-live="polite"
        className={`mb-3 text-[0.74rem] font-semibold uppercase tracking-[0.2em] ${
          state === "failed" ? "text-alert" : "text-river"
        }`}
      >
        {state === "paid" ? "✓ " : ""}
        {t(`${state}_eyebrow`)}
      </div>
      <h1 className="mb-4 font-display text-[clamp(2rem,4vw,2.8rem)] font-black leading-[1.1] text-text text-balance">
        {t(`${state}_title`)}
      </h1>
      <p className="mb-8 text-[1rem] leading-[1.7] text-text-2">{t(`${state}_body`)}</p>

      <Button
        href={`/eventos/${slug}`}
        variant={state === "failed" ? "primary" : "secondary"}
        fullWidthMobile
      >
        {state === "failed" ? t("retry_cta") : t("back_to_event")}
      </Button>

      {state === "pending" ? <PaymentStatusRefresher /> : null}
    </main>
  );
}
