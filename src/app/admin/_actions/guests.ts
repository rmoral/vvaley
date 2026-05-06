"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GuestStatus } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

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

const guestSchema = z.object({
  fullName: z.string().min(2, "El nombre es obligatorio."),
  slug: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  email: z.string().email().optional().nullable().or(z.literal("").transform(() => null)),
  website: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  linkedin: z.string().optional().nullable(),
  twitter: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  isPublic: z.boolean(),
  status: z.nativeEnum(GuestStatus),
  scheduledAt: z.date().nullable(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}

function parseForm(formData: FormData) {
  const statusRaw = trim(formData.get("status")) ?? GuestStatus.PROPOSED;
  return guestSchema.parse({
    fullName: trim(formData.get("fullName")) ?? "",
    slug: trim(formData.get("slug")),
    headline: trim(formData.get("headline")),
    company: trim(formData.get("company")),
    role: trim(formData.get("role")),
    bio: trim(formData.get("bio")),
    photoUrl: trim(formData.get("photoUrl")),
    email: trim(formData.get("email")),
    website: trim(formData.get("website")),
    linkedin: trim(formData.get("linkedin")),
    twitter: trim(formData.get("twitter")),
    instagram: trim(formData.get("instagram")),
    isPublic: formData.get("isPublic") === "on",
    status: statusRaw as GuestStatus,
    scheduledAt: dateOrNull(formData.get("scheduledAt")),
  });
}

async function uniqueSlug(base: string, ignoreId?: string) {
  let slug = base || `guest-${Date.now()}`;
  let n = 1;
  while (
    await prisma.guest.findFirst({
      where: { slug, NOT: ignoreId ? { id: ignoreId } : undefined },
      select: { id: true },
    })
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function createGuest(formData: FormData) {
  await requireAdmin();
  const data = parseForm(formData);
  const baseSlug = data.slug ? slugify(data.slug) : slugify(data.fullName);
  const slug = await uniqueSlug(baseSlug);

  const guest = await prisma.guest.create({
    data: {
      fullName: data.fullName,
      slug,
      headline: data.headline,
      company: data.company,
      role: data.role,
      bio: data.bio,
      photoUrl: data.photoUrl,
      email: data.email,
      website: data.website,
      linkedin: data.linkedin,
      twitter: data.twitter,
      instagram: data.instagram,
      isPublic: data.isPublic,
      status: data.status,
      scheduledAt: data.scheduledAt,
    },
  });

  revalidatePath("/admin/invitados");
  redirect(`/admin/invitados/${guest.id}?saved=1`);
}

export async function updateGuest(id: string, formData: FormData) {
  await requireAdmin();
  const data = parseForm(formData);
  const baseSlug = data.slug ? slugify(data.slug) : slugify(data.fullName);
  const slug = await uniqueSlug(baseSlug, id);

  await prisma.guest.update({
    where: { id },
    data: {
      fullName: data.fullName,
      slug,
      headline: data.headline,
      company: data.company,
      role: data.role,
      bio: data.bio,
      photoUrl: data.photoUrl,
      email: data.email,
      website: data.website,
      linkedin: data.linkedin,
      twitter: data.twitter,
      instagram: data.instagram,
      isPublic: data.isPublic,
      status: data.status,
      scheduledAt: data.scheduledAt,
    },
  });

  revalidatePath("/admin/invitados");
  revalidatePath(`/admin/invitados/${id}`);
  redirect(`/admin/invitados/${id}?saved=1`);
}

export async function deleteGuest(id: string) {
  await requireAdmin();
  await prisma.guest.delete({ where: { id } });
  revalidatePath("/admin/invitados");
  redirect("/admin/invitados");
}
