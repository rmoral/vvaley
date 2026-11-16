"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mientras el pago está pendiente, vuelve a pedir la página cada pocos
 * segundos: el webhook de Kunfupay suele llegar justo después de la
 * redirección. Se rinde pasados un par de minutos; el correo de
 * confirmación sale igualmente cuando llegue el webhook.
 */
export function PaymentStatusRefresher({
  intervalMs = 4000,
  maxAttempts = 30,
}: {
  intervalMs?: number;
  maxAttempts?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      if (attempts > maxAttempts) {
        window.clearInterval(id);
        return;
      }
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs, maxAttempts]);
  return null;
}
