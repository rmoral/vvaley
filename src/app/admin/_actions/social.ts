"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  SocialProvider,
  SocialPublicationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { getProvider } from "@/lib/social/registry";
import {
  callbackUrl,
  newNonce,
  setOAuthState,
} from "@/lib/social/oauth-state";
import { processPublication } from "@/lib/social/process";

const trim = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length === 0 ? null : s;
};

const dateOrNull = (v: FormDataEntryValue | null) => {
  const s = trim(v);
  if (s === null) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Kick off the OAuth dance: store the nonce in a cookie, build the
 * provider's authorize URL, redirect.
 */
export async function startConnect(provider: SocialProvider) {
  await requireSession();

  const impl = getProvider(provider);
  if (!impl.isAvailable) {
    redirect(`/admin/social?error=provider_not_configured`);
  }

  const nonce = newNonce();
  await setOAuthState({
    provider,
    nonce,
    returnTo: "/admin/social",
  });

  const url = impl.buildAuthorizationUrl({
    state: nonce,
    redirectUri: callbackUrl(provider),
  });

  redirect(url);
}

export async function disconnectAccount(id: string) {
  await requireSession();
  // Soft disconnect: keep history, mark inactive. Editor can reconnect by
  // running the OAuth flow again, which upserts on (provider, externalId).
  await prisma.socialAccount.update({
    where: { id },
    data: { isActive: false, accessToken: "", refreshToken: null },
  });
  revalidatePath("/admin/social");
}

export async function reconnectAccount(id: string) {
  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account) redirect("/admin/social?error=not_found");
  await startConnect(account.provider);
}

const publicationSchema = z.object({
  body: z.string().min(1, "El cuerpo no puede estar vacío.").max(3000),
  sourceUrl: z
    .string()
    .url()
    .nullable()
    .or(z.literal("").transform(() => null)),
  mediaUrls: z.array(z.string().url()),
  accountIds: z.array(z.string()).min(1, "Elige al menos una cuenta."),
  scheduledAt: z.date().nullable(),
});

function parseForm(formData: FormData) {
  const accountIds = formData.getAll("accountIds").map(String).filter(Boolean);
  const mediaUrls = formData
    .getAll("mediaUrls")
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);

  return publicationSchema.parse({
    body: trim(formData.get("body")) ?? "",
    sourceUrl: trim(formData.get("sourceUrl")),
    mediaUrls,
    accountIds,
    scheduledAt: dateOrNull(formData.get("scheduledAt")),
  });
}

export async function createPublication(formData: FormData) {
  const { user } = await requireSession();
  const data = parseForm(formData);

  const accounts = await prisma.socialAccount.findMany({
    where: { id: { in: data.accountIds }, isActive: true },
    select: { id: true },
  });
  if (accounts.length === 0) redirect("/admin/social/publicaciones?error=no_accounts");

  const pub = await prisma.socialPublication.create({
    data: {
      body: data.body,
      sourceUrl: data.sourceUrl,
      mediaUrls: data.mediaUrls,
      authorId: user.id,
      // Pre-set the schedule if the editor picked a future date.
      status:
        data.scheduledAt && data.scheduledAt.getTime() > Date.now()
          ? SocialPublicationStatus.SCHEDULED
          : SocialPublicationStatus.DRAFT,
      scheduledAt: data.scheduledAt,
      targets: {
        create: accounts.map((a) => ({
          accountId: a.id,
        })),
      },
    },
  });

  revalidatePath("/admin/social/publicaciones");
  redirect(`/admin/social/publicaciones/${pub.id}?saved=1`);
}

export async function deletePublication(id: string) {
  await requireSession();
  await prisma.socialPublication.delete({ where: { id } });
  revalidatePath("/admin/social/publicaciones");
  redirect("/admin/social/publicaciones");
}

/**
 * Publish to every active target right now (delegates to the shared
 * processPublication helper so the cron worker behaves the same).
 */
export async function publishNow(id: string) {
  await requireSession();

  const existing = await prisma.socialPublication.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) redirect("/admin/social/publicaciones?error=not_found");
  if (existing.status === SocialPublicationStatus.PUBLISHED) {
    redirect(`/admin/social/publicaciones/${id}?error=already_published`);
  }

  await processPublication(id);

  revalidatePath("/admin/social/publicaciones");
  revalidatePath(`/admin/social/publicaciones/${id}`);
  redirect(`/admin/social/publicaciones/${id}?published=1`);
}

/**
 * Move the publication from DRAFT/SCHEDULED to SCHEDULED with a new date.
 * The cron worker will pick it up when scheduledAt <= now.
 */
export async function schedulePublication(id: string, formData: FormData) {
  await requireSession();
  const scheduledAt = dateOrNull(formData.get("scheduledAt"));
  if (!scheduledAt) {
    redirect(`/admin/social/publicaciones/${id}?error=missing_date`);
  }
  if (scheduledAt.getTime() <= Date.now()) {
    redirect(`/admin/social/publicaciones/${id}?error=date_in_past`);
  }

  const publication = await prisma.socialPublication.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!publication) redirect("/admin/social/publicaciones?error=not_found");
  if (publication.status === SocialPublicationStatus.PUBLISHED) {
    redirect(`/admin/social/publicaciones/${id}?error=already_published`);
  }

  await prisma.socialPublication.update({
    where: { id },
    data: {
      status: SocialPublicationStatus.SCHEDULED,
      scheduledAt,
    },
  });

  revalidatePath("/admin/social/publicaciones");
  revalidatePath(`/admin/social/publicaciones/${id}`);
  redirect(`/admin/social/publicaciones/${id}?scheduled=1`);
}

export async function cancelSchedule(id: string) {
  await requireSession();
  await prisma.socialPublication.update({
    where: { id },
    data: { status: SocialPublicationStatus.DRAFT, scheduledAt: null },
  });
  revalidatePath(`/admin/social/publicaciones/${id}`);
}
