"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NewsStatus } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { parseTagNames, upsertTagsByName } from "@/lib/tags";
import { routing } from "@/i18n/routing";

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

const translationSchema = z.object({
  locale: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  body: z.string().nullable(),
});

const newsSchema = z.object({
  slug: z.string().nullable(),
  status: z.nativeEnum(NewsStatus),
  coverImageUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  externalUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  publishedAt: z.date().nullable(),
  translations: z.array(translationSchema),
  tagNames: z.array(z.string()),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}

function parseForm(formData: FormData) {
  const translations = routing.locales.map((locale) => ({
    locale,
    title: trim(formData.get(`title_${locale}`)) ?? "",
    summary: trim(formData.get(`summary_${locale}`)),
    body: trim(formData.get(`body_${locale}`)),
  }));

  return newsSchema.parse({
    slug: trim(formData.get("slug")),
    status:
      (trim(formData.get("status")) as NewsStatus | null) ?? NewsStatus.DRAFT,
    coverImageUrl: trim(formData.get("coverImageUrl")),
    externalUrl: trim(formData.get("externalUrl")),
    publishedAt: dateOrNull(formData.get("publishedAt")),
    translations,
    tagNames: parseTagNames(trim(formData.get("tags"))),
  });
}

async function uniqueSlug(base: string, ignoreId?: string) {
  let slug = base || `news-${Date.now()}`;
  let n = 1;
  while (
    await prisma.news.findFirst({
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
  translations: { locale: string; title: string; summary: string | null; body: string | null }[],
) {
  return translations
    .filter((t) => t.title.trim().length > 0)
    .map((t) => ({
      locale: t.locale,
      title: t.title,
      summary: t.summary,
      body: t.body,
    }));
}

export async function createNews(formData: FormData) {
  const session = await requireAdmin();
  const data = parseForm(formData);

  const persisted = persistedTranslations(data.translations);
  if (persisted.length === 0) {
    redirect("/admin/noticias/nuevo?error=missing_title");
  }

  const titleForSlug = data.slug ?? defaultTitle(data.translations);
  const slug = await uniqueSlug(slugify(titleForSlug));

  const publishedAt =
    data.publishedAt ??
    (data.status === NewsStatus.PUBLISHED ? new Date() : null);

  const tagIds = await upsertTagsByName(data.tagNames);

  const news = await prisma.news.create({
    data: {
      slug,
      status: data.status,
      coverImageUrl: data.coverImageUrl,
      externalUrl: data.externalUrl,
      publishedAt,
      authorId: session.user.id,
      translations: { create: persisted },
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
  });

  revalidatePath("/admin/noticias");
  revalidatePath("/noticias", "page");
  redirect(`/admin/noticias/${news.id}?saved=1`);
}

export async function updateNews(id: string, formData: FormData) {
  await requireAdmin();
  const data = parseForm(formData);

  const persisted = persistedTranslations(data.translations);
  if (persisted.length === 0) {
    redirect(`/admin/noticias/${id}?error=missing_title`);
  }

  const titleForSlug = data.slug ?? defaultTitle(data.translations);
  const slug = await uniqueSlug(slugify(titleForSlug), id);

  const publishedAt =
    data.publishedAt ??
    (data.status === NewsStatus.PUBLISHED ? new Date() : null);

  const tagIds = await upsertTagsByName(data.tagNames);

  await prisma.$transaction([
    prisma.newsTranslation.deleteMany({ where: { newsId: id } }),
    prisma.newsTag.deleteMany({ where: { newsId: id } }),
    prisma.news.update({
      where: { id },
      data: {
        slug,
        status: data.status,
        coverImageUrl: data.coverImageUrl,
        externalUrl: data.externalUrl,
        publishedAt,
        translations: { create: persisted },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    }),
  ]);

  revalidatePath("/admin/noticias");
  revalidatePath(`/admin/noticias/${id}`);
  revalidatePath("/noticias", "page");
  redirect(`/admin/noticias/${id}?saved=1`);
}

export async function deleteNews(id: string) {
  await requireAdmin();
  await prisma.news.delete({ where: { id } });
  revalidatePath("/admin/noticias");
  redirect("/admin/noticias");
}
