"use server";

import { revalidatePath } from "next/cache";
import { ContactStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

export async function setContactStatus(id: string, status: ContactStatus) {
  await requireSession();
  await prisma.contactRequest.update({ where: { id }, data: { status } });
  revalidatePath("/admin/contacto");
}

export async function saveContactNotes(id: string, formData: FormData) {
  await requireSession();
  const raw = formData.get("notes");
  const notes = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  await prisma.contactRequest.update({ where: { id }, data: { notes } });
  revalidatePath("/admin/contacto");
}

export async function deleteContactRequest(id: string) {
  await requireSession();
  await prisma.contactRequest.delete({ where: { id } });
  revalidatePath("/admin/contacto");
}
