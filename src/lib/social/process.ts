import { SocialPublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProvider } from "./registry";

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
    const result = await impl.publish(target.account, {
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
