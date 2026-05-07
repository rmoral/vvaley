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

const trim = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length === 0 ? null : s;
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
 * Publish to every active target sequentially. Updates per-target
 * status/externalId so partial failures (LinkedIn ✓ but X ✗) keep their
 * own state.
 */
export async function publishNow(id: string) {
  await requireSession();

  const publication = await prisma.socialPublication.findUnique({
    where: { id },
    include: { targets: { include: { account: true } } },
  });
  if (!publication) redirect("/admin/social/publicaciones?error=not_found");
  if (publication.status === SocialPublicationStatus.PUBLISHED) {
    redirect(`/admin/social/publicaciones/${id}?error=already_published`);
  }

  await prisma.socialPublication.update({
    where: { id },
    data: { status: SocialPublicationStatus.PUBLISHING },
  });

  let allOk = true;
  for (const target of publication.targets) {
    if (!target.account.isActive) {
      await prisma.socialPublicationTarget.update({
        where: {
          publicationId_accountId: {
            publicationId: id,
            accountId: target.accountId,
          },
        },
        data: {
          status: SocialPublicationStatus.FAILED,
          attempts: { increment: 1 },
          lastError: "account_inactive",
        },
      });
      allOk = false;
      continue;
    }

    const impl = getProvider(target.account.provider);
    const result = await impl.publish(target.account, {
      body: publication.body,
      mediaUrls: publication.mediaUrls,
      sourceUrl: publication.sourceUrl,
    });

    if (result.ok) {
      await prisma.socialPublicationTarget.update({
        where: {
          publicationId_accountId: {
            publicationId: id,
            accountId: target.accountId,
          },
        },
        data: {
          status: SocialPublicationStatus.PUBLISHED,
          externalId: result.externalId,
          externalUrl: result.externalUrl,
          attempts: { increment: 1 },
          publishedAt: new Date(),
          lastError: null,
        },
      });
    } else {
      allOk = false;
      await prisma.socialPublicationTarget.update({
        where: {
          publicationId_accountId: {
            publicationId: id,
            accountId: target.accountId,
          },
        },
        data: {
          status: SocialPublicationStatus.FAILED,
          attempts: { increment: 1 },
          lastError: result.error.slice(0, 1000),
        },
      });
    }
  }

  await prisma.socialPublication.update({
    where: { id },
    data: {
      status: allOk
        ? SocialPublicationStatus.PUBLISHED
        : SocialPublicationStatus.FAILED,
      publishedAt: allOk ? new Date() : null,
    },
  });

  revalidatePath("/admin/social/publicaciones");
  revalidatePath(`/admin/social/publicaciones/${id}`);
  redirect(`/admin/social/publicaciones/${id}?published=1`);
}
