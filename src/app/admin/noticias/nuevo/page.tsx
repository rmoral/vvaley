import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { NewsForm } from "@/components/admin/NewsForm";
import { createNews } from "@/app/admin/_actions/news";

export default async function NewNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const { error } = await searchParams;

  return (
    <AdminShell userName={session.user.name ?? session.user.email}>
      <Link
        href="/admin/noticias"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Noticias
      </Link>
      <h1 className="mb-8 font-display text-[1.8rem] font-bold text-text">
        Nueva noticia
      </h1>
      <NewsForm action={createNews} error={error} />
    </AdminShell>
  );
}
