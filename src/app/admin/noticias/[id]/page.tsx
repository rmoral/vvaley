import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { NewsForm } from "@/components/admin/NewsForm";
import { updateNews, deleteNews } from "@/app/admin/_actions/news";

export default async function EditNewsPage({
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

  const news = await prisma.news.findUnique({
    where: { id },
    include: {
      translations: true,
      tags: { include: { tag: true } },
    },
  });
  if (!news) notFound();

  const update = updateNews.bind(null, id);
  const remove = async () => {
    "use server";
    await deleteNews(id);
  };

  const titleEs =
    news.translations.find((t) => t.locale === "es")?.title ??
    news.translations[0]?.title ??
    "(Sin titular)";

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <Link
        href="/admin/noticias"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Noticias
      </Link>
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-[1.8rem] font-bold text-text">
          {titleEs}
        </h1>
        {news.status === "PUBLISHED" && (
          <Link
            href={`/noticias/${news.slug}`}
            target="_blank"
            className="text-[0.78rem] font-semibold text-river no-underline hover:text-text"
          >
            Ver en la web ↗
          </Link>
        )}
      </header>
      <NewsForm
        news={news}
        action={update}
        deleteAction={remove}
        saved={Boolean(saved)}
        error={error}
      />
    </AdminShell>
  );
}
