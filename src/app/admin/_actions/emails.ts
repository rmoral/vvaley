"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { asEmailLocale } from "@/lib/email-copy";
import { allEmailSamples } from "@/lib/email-samples";
import { emailPreviewEvent } from "@/lib/email-preview";

/**
 * Envía al admin que lo pide, y solo a él, un ejemplo de cada correo de la
 * web, con «[Prueba]» delante del asunto. Sale del sitio: solo ADMIN.
 */
export async function sendAllEmailSamples(formData: FormData) {
  const session = await requireAdmin();
  const to = session.user.email;
  const locale = asEmailLocale(String(formData.get("locale") ?? ""));
  if (!to) redirect(`/admin/correos?locale=${locale}&sent=error&reason=no_admin_email`);

  const event = await emailPreviewEvent(prisma);
  const samples = allEmailSamples(locale, event ?? undefined);

  let failure: string | null = null;
  for (const sample of samples) {
    const result = await sendEmail({
      to,
      subject: `[Prueba] ${sample.subject}`,
      html: sample.html,
    });
    if (!result.ok) failure = result.error;
    else if (result.dryRun) failure = "dry_run";
  }

  redirect(
    `/admin/correos?locale=${locale}&sent=${failure ? `error&reason=${encodeURIComponent(failure)}` : "ok"}`,
  );
}
