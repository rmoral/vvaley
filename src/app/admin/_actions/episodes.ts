"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EpisodePillar, EpisodeStatus } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

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

const episodeSchema = z.object({
  title: z.string().min(2, "El título es obligatorio."),
  slug: z.string().optional().nullable(),
  number: z.number().int().nullable(),
  subtitle: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  showNotes: z.string().optional().nullable(),
  pillar: z.nativeEnum(EpisodePillar).nullable(),
  durationSec: z.number().int().nullable(),
  audioUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  coverImageUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  spotifyUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  appleUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  youtubeUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  status: z.nativeEnum(EpisodeStatus),
  publishedAt: z.date().nullable(),
  guestIds: z.array(z.string()).default([]),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}

function parseForm(formData: FormData) {
  const pillarRaw = trim(formData.get("pillar"));
  const statusRaw = trim(formData.get("status")) ?? EpisodeStatus.DRAFT;

  const guestIds = formData.getAll("guestIds").map(String).filter(Boolean);
  const durationMin = intOrNull(formData.get("durationMin"));

  return episodeSchema.parse({
    title: trim(formData.get("title")) ?? "",
    slug: trim(formData.get("slug")),
    number: intOrNull(formData.get("number")),
    subtitle: trim(formData.get("subtitle")),
    summary: trim(formData.get("summary")),
    showNotes: trim(formData.get("showNotes")),
    pillar: pillarRaw && pillarRaw in EpisodePillar ? (pillarRaw as EpisodePillar) : null,
    durationSec: durationMin === null ? null : durationMin * 60,
    audioUrl: trim(formData.get("audioUrl")),
    coverImageUrl: trim(formData.get("coverImageUrl")),
    spotifyUrl: trim(formData.get("spotifyUrl")),
    appleUrl: trim(formData.get("appleUrl")),
    youtubeUrl: trim(formData.get("youtubeUrl")),
    status: statusRaw as EpisodeStatus,
    publishedAt: dateOrNull(formData.get("publishedAt")),
    guestIds,
  });
}

async function uniqueSlug(base: string, ignoreId?: string) {
  let slug = base || `ep-${Date.now()}`;
  let n = 1;
  while (
    await prisma.episode.findFirst({
      where: { slug, NOT: ignoreId ? { id: ignoreId } : undefined },
      select: { id: true },
    })
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function createEpisode(formData: FormData) {
  await requireAdmin();
  const data = parseForm(formData);
  const baseSlug = data.slug ? slugify(data.slug) : slugify(data.title);
  const slug = await uniqueSlug(baseSlug);

  const ep = await prisma.episode.create({
    data: {
      title: data.title,
      slug,
      number: data.number,
      subtitle: data.subtitle,
      summary: data.summary,
      showNotes: data.showNotes,
      pillar: data.pillar,
      durationSec: data.durationSec,
      audioUrl: data.audioUrl,
      coverImageUrl: data.coverImageUrl,
      spotifyUrl: data.spotifyUrl,
      appleUrl: data.appleUrl,
      youtubeUrl: data.youtubeUrl,
      status: data.status,
      publishedAt:
        data.publishedAt ??
        (data.status === EpisodeStatus.PUBLISHED ? new Date() : null),
      guests: {
        create: data.guestIds.map((guestId, i) => ({
          guestId,
          position: i,
        })),
      },
    },
  });

  revalidatePath("/admin/episodios");
  revalidatePath("/podcast", "page");
  redirect(`/admin/episodios/${ep.id}?saved=1`);
}

export async function updateEpisode(id: string, formData: FormData) {
  await requireAdmin();
  const data = parseForm(formData);
  const baseSlug = data.slug ? slugify(data.slug) : slugify(data.title);
  const slug = await uniqueSlug(baseSlug, id);

  await prisma.$transaction([
    prisma.episodeGuest.deleteMany({ where: { episodeId: id } }),
    prisma.episode.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        number: data.number,
        subtitle: data.subtitle,
        summary: data.summary,
        showNotes: data.showNotes,
        pillar: data.pillar,
        durationSec: data.durationSec,
        audioUrl: data.audioUrl,
        coverImageUrl: data.coverImageUrl,
        spotifyUrl: data.spotifyUrl,
        appleUrl: data.appleUrl,
        youtubeUrl: data.youtubeUrl,
        status: data.status,
        publishedAt:
          data.publishedAt ??
          (data.status === EpisodeStatus.PUBLISHED ? new Date() : null),
        guests: {
          create: data.guestIds.map((guestId, i) => ({
            guestId,
            position: i,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/admin/episodios");
  revalidatePath(`/admin/episodios/${id}`);
  revalidatePath("/podcast", "page");
  redirect(`/admin/episodios/${id}?saved=1`);
}

export async function deleteEpisode(id: string) {
  await requireAdmin();
  await prisma.episode.delete({ where: { id } });
  revalidatePath("/admin/episodios");
  redirect("/admin/episodios");
}
