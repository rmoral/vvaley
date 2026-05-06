import { redirect } from "next/navigation";
import Link from "next/link";
import { PostStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { routing } from "@/i18n/routing";

const statusLabel: Record<PostStatus, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programado",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

const statusClass: Record<PostStatus, string> = {
  DRAFT: "bg-bg2 text-text-2",
  SCHEDULED: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-[rgba(46,139,143,0.1)] text-river",
  ARCHIVED: "bg-bg2 text-text-3",
};

export default async function BlogListAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { status } = await searchParams;
  const filter =
    status && status in PostStatus ? { status: status as PostStatus } : undefined;

  const posts = await prisma.post.findMany({
    where: filter,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      translations: { select: { locale: true, title: true } },
      author: { select: { name: true } },
    },
  });

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.8rem] font-bold text-text">Blog</h1>
          <p className="text-[0.9rem] text-text-2">
            {posts.length} {posts.length === 1 ? "post" : "posts"}.
          </p>
        </div>
        <Link
          href="/admin/blog/nuevo"
          className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          + Nuevo post
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[0.78rem]">
        <FilterPill href="/admin/blog" active={!status}>
          Todos
        </FilterPill>
        {(Object.keys(PostStatus) as PostStatus[]).map((s) => (
          <FilterPill
            key={s}
            href={`/admin/blog?status=${s}`}
            active={status === s}
          >
            {statusLabel[s]}
          </FilterPill>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-bg3 bg-white">
        <table className="w-full text-left text-[0.88rem]">
          <thead className="bg-bg2 text-[0.74rem] uppercase tracking-[0.08em] text-text-3">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Idiomas</th>
              <th className="px-4 py-3">Autor</th>
              <th className="px-4 py-3">Publicado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-3">
                  Aún no hay posts. Crea el primero.
                </td>
              </tr>
            )}
            {posts.map((p) => {
              const defaultTitle =
                p.translations.find((t) => t.locale === "es")?.title ??
                p.translations[0]?.title ??
                "(Sin título)";
              const translatedLocales = new Set(
                p.translations.filter((t) => t.title).map((t) => t.locale),
              );

              return (
                <tr key={p.id} className="border-t border-bg3">
                  <td className="px-4 py-3 font-medium text-text">{defaultTitle}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[0.74rem] font-semibold ${statusClass[p.status]}`}
                    >
                      {statusLabel[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-3">
                    <div className="flex gap-1">
                      {routing.locales.map((loc) => (
                        <span
                          key={loc}
                          title={
                            translatedLocales.has(loc)
                              ? `${loc}: traducido`
                              : `${loc}: pendiente`
                          }
                          className={`inline-block rounded px-1.5 py-0.5 font-mono text-[0.7rem] uppercase ${
                            translatedLocales.has(loc)
                              ? "bg-[rgba(46,139,143,0.1)] text-river"
                              : "bg-bg2 text-text-3"
                          }`}
                        >
                          {loc}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-3">{p.author?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-text-3">
                    {p.publishedAt
                      ? new Intl.DateTimeFormat("es", {
                          dateStyle: "medium",
                        }).format(p.publishedAt)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/blog/${p.id}`}
                      className="text-[0.82rem] font-semibold text-river no-underline hover:text-text"
                    >
                      Editar →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 no-underline transition-colors ${
        active
          ? "border-river bg-[rgba(46,139,143,0.08)] text-river"
          : "border-bg3 bg-white text-text-2 hover:border-river"
      }`}
    >
      {children}
    </Link>
  );
}
