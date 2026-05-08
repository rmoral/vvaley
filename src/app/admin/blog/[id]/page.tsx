import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { PostForm } from "@/components/admin/PostForm";
import { updatePost, deletePost } from "@/app/admin/_actions/posts";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const { saved, error } = await searchParams;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      translations: true,
      tags: { include: { tag: true } },
    },
  });
  if (!post) notFound();

  const update = updatePost.bind(null, id);
  const remove = async () => {
    "use server";
    await deletePost(id);
  };

  const titleEs =
    post.translations.find((t) => t.locale === "es")?.title ??
    post.translations[0]?.title ??
    "(Sin título)";

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <Link
        href="/admin/blog"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Blog
      </Link>
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-[1.8rem] font-bold text-text">
          {titleEs}
        </h1>
        {post.status === "PUBLISHED" && (
          <Link
            href={`/blog/${post.slug}`}
            target="_blank"
            className="text-[0.78rem] font-semibold text-river no-underline hover:text-text"
          >
            Ver en la web ↗
          </Link>
        )}
      </header>
      <PostForm
        post={post}
        action={update}
        deleteAction={remove}
        saved={Boolean(saved)}
        error={error}
      />
    </AdminShell>
  );
}
