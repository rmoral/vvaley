"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EpisodePillar, EpisodeStatus, GuestStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { sendEpisodeInvites } from "@/lib/calendar-invites";

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
  recordingAt: z.date().nullable(),
  recordingUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  publishedAt: z.date().nullable(),
  guestIds: z.array(z.string()).default([]),
});


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
    recordingAt: dateOrNull(formData.get("recordingAt")),
    recordingUrl: trim(formData.get("recordingUrl")),
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

const inviteRelevantStatus: ReadonlySet<EpisodeStatus> = new Set([
  EpisodeStatus.SCHEDULED,
  EpisodeStatus.PUBLISHED,
]);

/**
 * Decide whether the calendar invite should fire after a save.
 * Sends when there's a recording date, the episode status is at least
 * SCHEDULED, the episode has guests with email, and either the invite
 * was never sent or the date changed since it was last sent.
 */
function shouldSendInvite(
  next: { recordingAt: Date | null; status: EpisodeStatus },
  previous: { recordingAt: Date | null; inviteSentAt: Date | null } | null,
): boolean {
  if (!next.recordingAt) return false;
  if (!inviteRelevantStatus.has(next.status)) return false;
  if (!previous) return true;
  if (!previous.inviteSentAt) return true;
  return previous.recordingAt?.getTime() !== next.recordingAt.getTime();
}

async function maybeSendInvites(episodeId: string) {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: {
      guests: { orderBy: { position: "asc" }, include: { guest: true } },
    },
  });
  if (!episode) return;
  const result = await sendEpisodeInvites(episode);
  if (result.sent > 0) {
    await prisma.episode.update({
      where: { id: episodeId },
      data: { inviteSentAt: new Date() },
    });
    // Bump the guests we just emailed to CONFIRMED if they were proposed.
    const guestIds = episode.guests
      .filter(({ guest }) => guest.email && guest.status === GuestStatus.PROPOSED)
      .map(({ guest }) => guest.id);
    if (guestIds.length > 0) {
      await prisma.guest.updateMany({
        where: { id: { in: guestIds } },
        data: { status: GuestStatus.CONFIRMED, scheduledAt: episode.recordingAt },
      });
    }
  }
}

export async function createEpisode(formData: FormData) {
  await requireSession();
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
      recordingAt: data.recordingAt,
      recordingUrl: data.recordingUrl,
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

  if (shouldSendInvite({ recordingAt: data.recordingAt, status: data.status }, null)) {
    await maybeSendInvites(ep.id);
  }

  revalidatePath("/admin/episodios");
  revalidatePath("/podcast", "page");
  redirect(`/admin/episodios/${ep.id}?saved=1`);
}

export async function updateEpisode(id: string, formData: FormData) {
  await requireSession();
  const data = parseForm(formData);
  const baseSlug = data.slug ? slugify(data.slug) : slugify(data.title);
  const slug = await uniqueSlug(baseSlug, id);

  const previous = await prisma.episode.findUnique({
    where: { id },
    select: { recordingAt: true, inviteSentAt: true },
  });

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
        recordingAt: data.recordingAt,
        recordingUrl: data.recordingUrl,
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

  if (
    shouldSendInvite(
      { recordingAt: data.recordingAt, status: data.status },
      previous,
    )
  ) {
    await maybeSendInvites(id);
  }

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

/** Manual trigger from the admin UI. Lets the editor force a resend. */
export async function resendEpisodeInvites(id: string) {
  await requireSession();
  await maybeSendInvites(id);
  revalidatePath(`/admin/episodios/${id}`);
}
