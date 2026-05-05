"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PostStatus } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
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

const postSchema = z.object({
  slug: z.string().nullable(),
  status: z.nativeEnum(PostStatus),
  coverImageUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  publishedAt: z.date().nullable(),
  translations: z.array(translationSchema),
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

  return postSchema.parse({
    slug: trim(formData.get("slug")),
    status:
      (trim(formData.get("status")) as PostStatus | null) ?? PostStatus.DRAFT,
    coverImageUrl: trim(formData.get("coverImageUrl")),
    publishedAt: dateOrNull(formData.get("publishedAt")),
    translations,
  });
}

async function uniqueSlug(base: string, ignoreId?: string) {
  let slug = base || `post-${Date.now()}`;
  let n = 1;
  while (
    await prisma.post.findFirst({
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

function translationsToPersist(
  translations: { locale: string; title: string; summary: string | null; body: string | null }[],
) {
  return translations
    .filter((t) => t.title.trim().length > 0)
    .map((t) => ({
      locale: t.locale,
      title: t.title,
      summary: t.summary,
      body: t.body ?? "",
    }));
}

export async function createPost(formData: FormData) {
  const session = await requireAdmin();
  const data = parseForm(formData);

  const persisted = translationsToPersist(data.translations);
  if (persisted.length === 0) {
    redirect("/admin/blog/nuevo?error=missing_title");
  }

  const titleForSlug = data.slug ?? defaultTitle(data.translations);
  const slug = await uniqueSlug(slugify(titleForSlug));

  const publishedAt =
    data.publishedAt ??
    (data.status === PostStatus.PUBLISHED ? new Date() : null);

  const post = await prisma.post.create({
    data: {
      slug,
      status: data.status,
      coverImageUrl: data.coverImageUrl,
      publishedAt,
      authorId: session.user.id,
      translations: { create: persisted },
    },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog", "page");
  redirect(`/admin/blog/${post.id}?saved=1`);
}

export async function updatePost(id: string, formData: FormData) {
  await requireAdmin();
  const data = parseForm(formData);

  const persisted = translationsToPersist(data.translations);
  if (persisted.length === 0) {
    redirect(`/admin/blog/${id}?error=missing_title`);
  }

  const titleForSlug = data.slug ?? defaultTitle(data.translations);
  const slug = await uniqueSlug(slugify(titleForSlug), id);

  const publishedAt =
    data.publishedAt ??
    (data.status === PostStatus.PUBLISHED ? new Date() : null);

  await prisma.$transaction([
    prisma.postTranslation.deleteMany({ where: { postId: id } }),
    prisma.post.update({
      where: { id },
      data: {
        slug,
        status: data.status,
        coverImageUrl: data.coverImageUrl,
        publishedAt,
        translations: { create: persisted },
      },
    }),
  ]);

  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}`);
  revalidatePath("/blog", "page");
  redirect(`/admin/blog/${id}?saved=1`);
}

export async function deletePost(id: string) {
  await requireAdmin();
  await prisma.post.delete({ where: { id } });
  revalidatePath("/admin/blog");
  redirect("/admin/blog");
}
