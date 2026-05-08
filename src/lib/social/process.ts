import type { SocialAccount } from "@prisma/client";
import { SocialPublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProvider } from "./registry";
import type { SocialProviderImpl } from "./types";

/**
 * If the account's access token is about to expire and the provider knows
 * how to refresh, swap it before the publish call. Failures are swallowed
 * so the publish attempt still surfaces a meaningful error.
 */
async function ensureFreshToken(
  account: SocialAccount,
  impl: SocialProviderImpl,
): Promise<SocialAccount> {
  if (!account.expiresAt) return account;
  const remaining = account.expiresAt.getTime() - Date.now();
  if (remaining > 60_000) return account;
  if (!account.refreshToken || !impl.refreshAccessToken) return account;
  try {
    const fresh = await impl.refreshAccessToken(account.refreshToken);
    return await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        accessToken: fresh.accessToken,
        refreshToken: fresh.refreshToken ?? account.refreshToken,
        expiresAt: fresh.expiresAt,
      },
    });
  } catch {
    return account;
  }
}

/**
 * Pushes a single SocialPublication to every active target. Updates
 * per-target status / externalId / lastError so partial failures keep
 * their own state. The caller decides authentication — this helper is
 * shared between the admin "publish now" action and the cron processor.
 *
 * @returns Whether all targets succeeded.
 */
export async function processPublication(id: string): Promise<{
  ok: boolean;
  delivered: number;
  failed: number;
}> {
  const publication = await prisma.socialPublication.findUnique({
    where: { id },
    include: { targets: { include: { account: true } } },
  });
  if (!publication) return { ok: false, delivered: 0, failed: 0 };
  if (publication.status === SocialPublicationStatus.PUBLISHED) {
    return { ok: true, delivered: 0, failed: 0 };
  }

  await prisma.socialPublication.update({
    where: { id },
    data: { status: SocialPublicationStatus.PUBLISHING },
  });

  let delivered = 0;
  let failed = 0;
  for (const target of publication.targets) {
    if (
      target.status === SocialPublicationStatus.PUBLISHED ||
      !target.account.isActive
    ) {
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
        failed += 1;
      }
      continue;
    }

    const impl = getProvider(target.account.provider);
    const fresh = await ensureFreshToken(target.account, impl);
    const result = await impl.publish(fresh, {
      body: publication.body,
      mediaUrls: publication.mediaUrls,
      sourceUrl: publication.sourceUrl,
    });

    if (result.ok) {
      delivered += 1;
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
      failed += 1;
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

  const allOk = failed === 0;
  await prisma.socialPublication.update({
    where: { id },
    data: {
      status: allOk
        ? SocialPublicationStatus.PUBLISHED
        : SocialPublicationStatus.FAILED,
      publishedAt: allOk ? new Date() : null,
    },
  });

  return { ok: allOk, delivered, failed };
}
