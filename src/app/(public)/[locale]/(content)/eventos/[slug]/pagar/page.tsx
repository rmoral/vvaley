import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { openRegistrationCheckout, reusableCheckoutUrl } from "@/lib/event-payments";
import { paymentLinkState, type PaymentLinkState } from "@/lib/event-registration";
import { paymentLinkSecret, verifyPaymentLinkToken } from "@/lib/payment-links";

// Enlace de pago que el equipo envía a quien se inscribió y no ha pagado
// (src/lib/payment-links.ts). Si se puede cobrar, redirige al checkout de
// Kunfupay; al pagar, Kunfupay vuelve a /pago (la página de gracias) y el
// webhook confirma la inscripción, avisa al equipo y envía la confirmación.
// Si no se puede cobrar, lo explica aquí y no se crea ningún checkout.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Shown = Exclude<PaymentLinkState, "ok" | "already_paid"> | "invalid" | "unavailable";

export default async function EventPaymentLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ r?: string; t?: string }>;
}) {
  const { locale, slug } = await params;
  const { r, t: token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("eventPayLink");

  const state = await resolve(locale, slug, r, token);

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-40 text-center md:px-16">
      <div className="mb-3 text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-alert">
        {t("eyebrow")}
      </div>
      <h1 className="mb-4 font-display text-[clamp(2rem,4vw,2.8rem)] font-black leading-[1.1] text-text text-balance">
        {t(`${state}_title`)}
      </h1>
      <p className="mb-8 text-[1rem] leading-[1.7] text-text-2">{t(`${state}_body`)}</p>
      <Button href={`/eventos/${slug}`} variant="secondary" fullWidthMobile>
        {t("back_to_event")}
      </Button>
    </main>
  );
}

/** Redirige (checkout o página de gracias) o devuelve qué explicar. */
async function resolve(
  locale: string,
  slug: string,
  registrationId: string | undefined,
  token: string | undefined,
): Promise<Shown> {
  // La firma se comprueba antes de tocar la base: un id suelto no dice nada.
  if (!registrationId || !verifyPaymentLinkToken(registrationId, token, paymentLinkSecret())) {
    return "invalid";
  }
  const reg = await prisma.eventRegistration.findFirst({
    where: { id: registrationId, event: { slug } },
    include: { event: { include: { translations: true } } },
  });
  if (!reg) return "invalid";

  const confirmedCount = await prisma.eventRegistration.count({
    where: { eventId: reg.eventId, status: "CONFIRMED" },
  });
  const state = paymentLinkState(reg.event, reg, confirmedCount);
  if (state === "already_paid") redirect(`/${locale}/eventos/${slug}/pago?r=${reg.id}`);
  if (state !== "ok") return state;

  const price = reg.event.priceCents!;
  // Una sesión abierta por el mismo importe se reutiliza.
  if (reg.paymentStatus === "PENDING" && reg.amountCents === price) {
    const open = await reusableCheckoutUrl(reg);
    if (open) redirect(open);
  }

  // La inscripción conserva su estado (pendiente de pago o confirmada): lo
  // que cambia es el cobro. Al pagar, el webhook la deja CONFIRMED + PAID.
  const updated = await prisma.eventRegistration.update({
    where: { id: reg.id },
    data: {
      paymentStatus: "PENDING",
      amountCents: price,
      currency: "EUR",
      paymentAttempts: { increment: 1 },
    },
  });
  const checkoutUrl = await openRegistrationCheckout(reg.event, updated, "payment_link");
  if (checkoutUrl) redirect(checkoutUrl);
  return "unavailable";
}
