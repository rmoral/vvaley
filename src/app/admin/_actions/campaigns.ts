"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CampaignStatus, SubscriberStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/email";
import { renderCampaign } from "@/lib/campaign-emails";
import { buildCampaignBody, defaultSubject } from "@/lib/campaign-builder";
import { routing, type AppLocale } from "@/i18n/routing";

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

/**
 * Build a draft campaign from picked content. Reads the selection, fetches
 * the matching translation rows for the chosen audience locale, runs the
 * shared builder to produce Markdown, then redirects to the regular
 * campaign editor so the editor can refine before sending.
 */
export async function composeCampaignFromContent(formData: FormData) {
  const { user } = await requireSession();

  const localeRaw = trim(formData.get("locale"));
  const locale: AppLocale =
    localeRaw && (routing.locales as readonly string[]).includes(localeRaw)
      ? (localeRaw as AppLocale)
      : routing.defaultLocale;

  const subjectInput = trim(formData.get("subject"));
  const preheader = trim(formData.get("preheader"));
  const intro = trim(formData.get("intro"));
  const isPublic = formData.get("isPublic") === "on";
  const audienceLocaleRaw = trim(formData.get("audienceLocale"));
  const audienceLocale =
    audienceLocaleRaw &&
    (routing.locales as readonly string[]).includes(audienceLocaleRaw)
      ? audienceLocaleRaw
      : null;

  const episodeId = trim(formData.get("episodeId"));
  const postIds = formData
    .getAll("postIds")
    .map(String)
    .filter(Boolean);
  const newsIds = formData
    .getAll("newsIds")
    .map(String)
    .filter(Boolean);

  if (!episodeId && postIds.length === 0 && newsIds.length === 0) {
    redirect("/admin/campanas/nueva-asistida?error=empty_pick");
  }

  const [episode, posts, news] = await Promise.all([
    episodeId
      ? prisma.episode.findUnique({
          where: { id: episodeId },
          select: { slug: true, title: true, subtitle: true, summary: true },
        })
      : Promise.resolve(null),
    postIds.length
      ? prisma.post.findMany({
          where: { id: { in: postIds }, status: "PUBLISHED" },
          select: {
            id: true,
            slug: true,
            translations: {
              select: { locale: true, title: true, summary: true },
            },
          },
        })
      : Promise.resolve([]),
    newsIds.length
      ? prisma.news.findMany({
          where: { id: { in: newsIds }, status: "PUBLISHED" },
          select: {
            id: true,
            slug: true,
            translations: {
              select: { locale: true, title: true, summary: true },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  // Pick the translation for the chosen locale, with a fallback chain
  // so the body never lands with an empty title even if a piece of
  // content isn't translated to the audience locale yet.
  const pickTr = (
    translations: { locale: string; title: string; summary: string | null }[],
  ) =>
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === routing.defaultLocale) ??
    translations[0] ??
    null;

  const postPicks = posts
    .map((p) => {
      const tr = pickTr(p.translations);
      return {
        id: p.id,
        slug: p.slug,
        title: tr?.title ?? p.slug,
        summary: tr?.summary ?? null,
      };
    })
    .sort((a, b) => postIds.indexOf(a.id) - postIds.indexOf(b.id));

  const newsPicks = news
    .map((n) => {
      const tr = pickTr(n.translations);
      return {
        id: n.id,
        slug: n.slug,
        title: tr?.title ?? n.slug,
        summary: tr?.summary ?? null,
      };
    })
    .sort((a, b) => newsIds.indexOf(a.id) - newsIds.indexOf(b.id));

  const body = buildCampaignBody({
    locale,
    intro,
    episode: episode
      ? {
          slug: episode.slug,
          title: episode.title,
          subtitle: episode.subtitle,
          summary: episode.summary,
        }
      : null,
    posts: postPicks,
    news: newsPicks,
  });

  const subject = subjectInput ?? defaultSubject(locale);

  const campaign = await prisma.campaign.create({
    data: {
      subject,
      preheader,
      bodyMarkdown: body,
      audienceLocale,
      isPublic,
      authorId: user.id,
    },
  });

  revalidatePath("/admin/campanas");
  redirect(`/admin/campanas/${campaign.id}?saved=1`);
}

export async function deleteCampaign(id: string) {
  await requireAdmin();
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
  await requireAdmin();

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
