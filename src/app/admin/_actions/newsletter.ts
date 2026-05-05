"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
}

export async function unsubscribeSubscriber(id: string) {
  await requireAdmin();
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
  await requireAdmin();
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
