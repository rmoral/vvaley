"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EventLocationType, EventStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { routing } from "@/i18n/routing";

const trim = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length === 0 ? null : s;
};

const intOrNull = (v: FormDataEntryValue | null) => {
  const s = trim(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
};

const dateOrNull = (v: FormDataEntryValue | null) => {
  const s = trim(v);
  if (s === null) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const translationSchema = z.object({
  locale: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
});

const eventSchema = z.object({
  slug: z.string().nullable(),
  status: z.nativeEnum(EventStatus),
  locationType: z.nativeEnum(EventLocationType),
  startsAt: z.date(),
  endsAt: z.date().nullable(),
  timezone: z.string(),
  venueName: z.string().nullable(),
  venueAddress: z.string().nullable(),
  onlineUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  capacity: z.number().int().nullable(),
  registrationOpensAt: z.date().nullable(),
  registrationClosesAt: z.date().nullable(),
  coverImageUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  translations: z.array(translationSchema),
});


function parseForm(formData: FormData) {
  const translations = routing.locales.map((locale) => ({
    locale,
    title: trim(formData.get(`title_${locale}`)) ?? "",
    summary: trim(formData.get(`summary_${locale}`)),
    description: trim(formData.get(`description_${locale}`)),
  }));

  const startsAt = dateOrNull(formData.get("startsAt"));
  if (!startsAt) {
    throw new Error("startsAt is required");
  }

  return eventSchema.parse({
    slug: trim(formData.get("slug")),
    status:
      (trim(formData.get("status")) as EventStatus | null) ?? EventStatus.DRAFT,
    locationType:
      (trim(formData.get("locationType")) as EventLocationType | null) ??
      EventLocationType.INPERSON,
    startsAt,
    endsAt: dateOrNull(formData.get("endsAt")),
    timezone: trim(formData.get("timezone")) ?? "Europe/Andorra",
    venueName: trim(formData.get("venueName")),
    venueAddress: trim(formData.get("venueAddress")),
    onlineUrl: trim(formData.get("onlineUrl")),
    capacity: intOrNull(formData.get("capacity")),
    registrationOpensAt: dateOrNull(formData.get("registrationOpensAt")),
    registrationClosesAt: dateOrNull(formData.get("registrationClosesAt")),
    coverImageUrl: trim(formData.get("coverImageUrl")),
    translations,
  });
}

async function uniqueSlug(base: string, ignoreId?: string) {
  let slug = base || `evento-${Date.now()}`;
  let n = 1;
  while (
    await prisma.event.findFirst({
      where: { slug, NOT: ignoreId ? { id: ignoreId } : undefined },
      select: { id: true },
    })
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

function defaultTitle(translations: { title: string; locale: string }[]) {
  return (
    translations.find((t) => t.locale === routing.defaultLocale && t.title)
      ?.title ??
    translations.find((t) => t.title)?.title ??
    ""
  );
}

function persistedTranslations(
  translations: {
    locale: string;
    title: string;
    summary: string | null;
    description: string | null;
  }[],
) {
  return translations
    .filter((t) => t.title.trim().length > 0)
    .map((t) => ({
      locale: t.locale,
      title: t.title,
      summary: t.summary,
      description: t.description,
    }));
}

export async function createEvent(formData: FormData) {
  const session = await requireSession();
  const data = parseForm(formData);

  const persisted = persistedTranslations(data.translations);
  if (persisted.length === 0) {
    redirect("/admin/eventos/nuevo?error=missing_title");
  }

  const titleForSlug = data.slug ?? defaultTitle(data.translations);
  const slug = await uniqueSlug(slugify(titleForSlug));

  const event = await prisma.event.create({
    data: {
      slug,
      status: data.status,
      locationType: data.locationType,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      timezone: data.timezone,
      venueName: data.venueName,
      venueAddress: data.venueAddress,
      onlineUrl: data.onlineUrl,
      capacity: data.capacity,
      registrationOpensAt: data.registrationOpensAt,
      registrationClosesAt: data.registrationClosesAt,
      coverImageUrl: data.coverImageUrl,
      authorId: session.user.id,
      translations: { create: persisted },
    },
  });

  revalidatePath("/admin/eventos");
  revalidatePath("/eventos", "page");
  redirect(`/admin/eventos/${event.id}?saved=1`);
}

export async function updateEvent(id: string, formData: FormData) {
  await requireSession();
  const data = parseForm(formData);

  const persisted = persistedTranslations(data.translations);
  if (persisted.length === 0) {
    redirect(`/admin/eventos/${id}?error=missing_title`);
  }

  const titleForSlug = data.slug ?? defaultTitle(data.translations);
  const slug = await uniqueSlug(slugify(titleForSlug), id);

  await prisma.$transaction([
    prisma.eventTranslation.deleteMany({ where: { eventId: id } }),
    prisma.event.update({
      where: { id },
      data: {
        slug,
        status: data.status,
        locationType: data.locationType,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        timezone: data.timezone,
        venueName: data.venueName,
        venueAddress: data.venueAddress,
        onlineUrl: data.onlineUrl,
        capacity: data.capacity,
        registrationOpensAt: data.registrationOpensAt,
        registrationClosesAt: data.registrationClosesAt,
        coverImageUrl: data.coverImageUrl,
        translations: { create: persisted },
      },
    }),
  ]);

  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${id}`);
  revalidatePath("/eventos", "page");
  redirect(`/admin/eventos/${id}?saved=1`);
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  await prisma.event.delete({ where: { id } });
  revalidatePath("/admin/eventos");
  redirect("/admin/eventos");
}

// Registrations mutations from the admin panel.

export async function cancelRegistration(eventId: string, regId: string) {
  await requireSession();
  await prisma.eventRegistration.update({
    where: { id: regId },
    data: { status: "CANCELLED" },
  });
  revalidatePath(`/admin/eventos/${eventId}/inscripciones`);
}

export async function confirmRegistration(eventId: string, regId: string) {
  await requireSession();
  await prisma.eventRegistration.update({
    where: { id: regId },
    data: { status: "CONFIRMED" },
  });
  revalidatePath(`/admin/eventos/${eventId}/inscripciones`);
}

export async function deleteRegistration(eventId: string, regId: string) {
  await requireAdmin();
  await prisma.eventRegistration.delete({ where: { id: regId } });
  revalidatePath(`/admin/eventos/${eventId}/inscripciones`);
}
