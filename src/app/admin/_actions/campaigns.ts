"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CampaignStatus, SubscriberStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/email";
import { renderCampaign } from "@/lib/campaign-emails";
import { routing } from "@/i18n/routing";

const trim = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length === 0 ? null : s;
};

const campaignSchema = z.object({
  subject: z.string().min(1, "El asunto es obligatorio."),
  preheader: z.string().nullable(),
  bodyMarkdown: z.string().min(1, "El cuerpo no puede estar vacío."),
  audienceLocale: z.string().nullable(),
  isPublic: z.boolean(),
});

function parseForm(formData: FormData) {
  const audienceLocaleRaw = trim(formData.get("audienceLocale"));
  const audienceLocale =
    audienceLocaleRaw &&
    (routing.locales as readonly string[]).includes(audienceLocaleRaw)
      ? audienceLocaleRaw
      : null;

  return campaignSchema.parse({
    subject: trim(formData.get("subject")) ?? "",
    preheader: trim(formData.get("preheader")),
    bodyMarkdown: trim(formData.get("bodyMarkdown")) ?? "",
    audienceLocale,
    isPublic: formData.get("isPublic") === "on",
  });
}

export async function createCampaign(formData: FormData) {
  const { user } = await requireSession();
  const data = parseForm(formData);

  const campaign = await prisma.campaign.create({
    data: {
      subject: data.subject,
      preheader: data.preheader,
      bodyMarkdown: data.bodyMarkdown,
      audienceLocale: data.audienceLocale,
      isPublic: data.isPublic,
      authorId: user.id,
    },
  });

  revalidatePath("/admin/campanas");
  redirect(`/admin/campanas/${campaign.id}?saved=1`);
}

export async function updateCampaign(id: string, formData: FormData) {
  await requireSession();
  const data = parseForm(formData);

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) redirect("/admin/campanas?error=not_found");
  if (existing.status !== CampaignStatus.DRAFT) {
    redirect(`/admin/campanas/${id}?error=already_sent`);
  }

  await prisma.campaign.update({
    where: { id },
    data: {
      subject: data.subject,
      preheader: data.preheader,
      bodyMarkdown: data.bodyMarkdown,
      audienceLocale: data.audienceLocale,
      isPublic: data.isPublic,
    },
  });

  revalidatePath("/admin/campanas");
  revalidatePath(`/admin/campanas/${id}`);
  redirect(`/admin/campanas/${id}?saved=1`);
}

export async function deleteCampaign(id: string) {
  await requireSession();
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/admin/campanas");
  redirect("/admin/campanas");
}

/**
 * Send the campaign to every CONFIRMED subscriber that matches the
 * audience filter. Sequential so we play nice with email-provider rate
 * limits; we update the counters as we go so the editor can refresh
 * the page and watch the progress.
 */
export async function sendCampaign(id: string) {
  await requireSession();

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) redirect("/admin/campanas?error=not_found");
  if (campaign.status !== CampaignStatus.DRAFT) {
    redirect(`/admin/campanas/${id}?error=already_sent`);
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: {
      status: SubscriberStatus.CONFIRMED,
      ...(campaign.audienceLocale ? { locale: campaign.audienceLocale } : {}),
    },
    select: { email: true, name: true, confirmToken: true },
  });

  await prisma.campaign.update({
    where: { id },
    data: {
      status: CampaignStatus.SENDING,
      recipients: subscribers.length,
      delivered: 0,
      failed: 0,
    },
  });

  let delivered = 0;
  let failed = 0;
  for (const subscriber of subscribers) {
    const { subject, html, text } = renderCampaign(campaign, subscriber);
    const result = await sendEmail({
      to: subscriber.email,
      subject,
      html,
      text,
    });
    if (result.ok) delivered += 1;
    else failed += 1;
  }

  await prisma.campaign.update({
    where: { id },
    data: {
      status: failed === 0 ? CampaignStatus.SENT : CampaignStatus.FAILED,
      delivered,
      failed,
      sentAt: new Date(),
    },
  });

  revalidatePath("/admin/campanas");
  revalidatePath(`/admin/campanas/${id}`);
  redirect(`/admin/campanas/${id}?sent=1`);
}
