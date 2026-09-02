"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";


export async function unsubscribeSubscriber(id: string) {
  await requireSession();
  await prisma.newsletterSubscriber.update({
    where: { id },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });
  revalidatePath("/admin/newsletter");
}

export async function deleteSubscriber(id: string) {
  await requireAdmin();
  await prisma.newsletterSubscriber.delete({ where: { id } });
  revalidatePath("/admin/newsletter");
}

export async function reactivateSubscriber(id: string) {
  await requireSession();
  await prisma.newsletterSubscriber.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      unsubscribedAt: null,
    },
  });
  revalidatePath("/admin/newsletter");
}
