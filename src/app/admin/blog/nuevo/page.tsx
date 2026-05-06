import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { PostForm } from "@/components/admin/PostForm";
import { createPost } from "@/app/admin/_actions/posts";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const { error } = await searchParams;

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <Link
        href="/admin/blog"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Blog
      </Link>
      <h1 className="mb-8 font-display text-[1.8rem] font-bold text-text">
        Nuevo post
      </h1>
      <PostForm action={createPost} error={error} />
    </AdminShell>
  );
}
