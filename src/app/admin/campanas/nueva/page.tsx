import Link from "next/link";
import { SubscriberStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { CampaignForm } from "@/components/admin/CampaignForm";
import { createCampaign } from "@/app/admin/_actions/campaigns";

export default async function NewCampaignPage() {
  const { user } = await requireSession();
  const counts = await audienceCounts();

  return (
    <AdminShell userName={user.name ?? user.email} userRole={user.role}>
      <Link
        href="/admin/campanas"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Campañas
      </Link>
      <h1 className="mb-8 font-display text-[1.8rem] font-bold text-text">
        Nueva campaña
      </h1>
      <CampaignForm action={createCampaign} audienceCounts={counts} />
    </AdminShell>
  );
}

async function audienceCounts() {
  const groups = await prisma.newsletterSubscriber.groupBy({
    where: { status: SubscriberStatus.CONFIRMED },
    by: ["locale"],
    _count: { _all: true },
  });
  const perLocale: Record<string, number> = {};
  let all = 0;
  for (const g of groups) {
    perLocale[g.locale] = g._count._all;
    all += g._count._all;
  }
  return { all, perLocale };
}
