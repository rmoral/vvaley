"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { esRutaDeRecurso } from "@/lib/asset-url";
import { normalizePresenterUrl } from "@/lib/event-presenters";
import { routing } from "@/i18n/routing";

// Quién presenta en un evento (sección «Presentan» de la página pública).
// Crear y editar con sesión; borrar solo ADMIN.

const text = (formData: FormData, name: string) => {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
};

type Fields = {
  name: string;
  url: string | null;
  logoUrl: string | null;
  position: number;
  descriptions: { locale: string; description: string }[];
};

function readFields(formData: FormData): Fields | string {
  const name = text(formData, "name");
  if (!name) return "missing_name";

  const rawUrl = text(formData, "url");
  const url = normalizePresenterUrl(rawUrl);
  if (rawUrl && !url) return "invalid_url";

  const logoUrl = text(formData, "logoUrl") || null;
  if (logoUrl && !esRutaDeRecurso(logoUrl)) return "invalid_logo";

  const position = Number(text(formData, "position") || "0");
  return {
    name: name.slice(0, 120),
    url,
    logoUrl,
    position: Number.isFinite(position) ? Math.round(position) : 0,
    descriptions: routing.locales
      .map((locale) => ({ locale, description: text(formData, `description_${locale}`).slice(0, 600) }))
      .filter((d) => d.description),
  };
}

const back = (eventId: string, query: string) => `/admin/eventos/${eventId}/presentan?${query}`;

function refresh(eventId: string) {
  revalidatePath(`/admin/eventos/${eventId}/presentan`);
  revalidatePath("/eventos", "layout");
}

export async function createEventPresenter(eventId: string, formData: FormData) {
  await requireSession();
  const fields = readFields(formData);
  if (typeof fields === "string") redirect(back(eventId, `error=${fields}`));
  const { descriptions, ...data } = fields;
  await prisma.eventPresenter.create({
    data: { ...data, eventId, translations: { create: descriptions } },
  });
  refresh(eventId);
  redirect(back(eventId, "saved=1"));
}

export async function updateEventPresenter(eventId: string, presenterId: string, formData: FormData) {
  await requireSession();
  const fields = readFields(formData);
  if (typeof fields === "string") redirect(back(eventId, `error=${fields}#p-${presenterId}`));
  const { descriptions, ...data } = fields;
  await prisma.$transaction([
    prisma.eventPresenter.update({ where: { id: presenterId, eventId }, data }),
    prisma.eventPresenterTranslation.deleteMany({ where: { presenterId } }),
    prisma.eventPresenterTranslation.createMany({
      data: descriptions.map((d) => ({ ...d, presenterId })),
    }),
  ]);
  refresh(eventId);
  redirect(back(eventId, "saved=1"));
}

export async function deleteEventPresenter(eventId: string, presenterId: string) {
  await requireAdmin();
  await prisma.eventPresenter.deleteMany({ where: { id: presenterId, eventId } });
  refresh(eventId);
  redirect(back(eventId, "deleted=1"));
}
