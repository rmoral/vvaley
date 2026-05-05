import { redirect } from "next/navigation";
import Link from "next/link";
import { NewsStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { routing } from "@/i18n/routing";

const statusLabel: Record<NewsStatus, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programado",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

const statusClass: Record<NewsStatus, string> = {
  DRAFT: "bg-bg2 text-text-2",
  SCHEDULED: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-[rgba(46,139,143,0.1)] text-river",
  ARCHIVED: "bg-bg2 text-text-3",
};

export default async function NewsListAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { status } = await searchParams;
  const filter =
    status && status in NewsStatus ? { status: status as NewsStatus } : undefined;

  const items = await prisma.news.findMany({
    where: filter,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      translations: { select: { locale: true, title: true } },
      author: { select: { name: true } },
    },
  });

  return (
    <AdminShell userName={session.user.name ?? session.user.email}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.8rem] font-bold text-text">
            Noticias
          </h1>
          <p className="text-[0.9rem] text-text-2">
            {items.length} {items.length === 1 ? "noticia" : "noticias"}.
          </p>
        </div>
        <Link
          href="/admin/noticias/nuevo"
          className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          + Nueva noticia
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[0.78rem]">
        <FilterPill href="/admin/noticias" active={!status}>
          Todas
        </FilterPill>
        {(Object.keys(NewsStatus) as NewsStatus[]).map((s) => (
          <FilterPill
            key={s}
            href={`/admin/noticias?status=${s}`}
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
              <th className="px-4 py-3">Titular</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Idiomas</th>
              <th className="px-4 py-3">Externa</th>
              <th className="px-4 py-3">Publicada</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-3">
                  Aún no hay noticias. Crea la primera.
                </td>
              </tr>
            )}
            {items.map((n) => {
              const defaultTitle =
                n.translations.find((t) => t.locale === "es")?.title ??
                n.translations[0]?.title ??
                "(Sin titular)";
              const translatedLocales = new Set(
                n.translations.filter((t) => t.title).map((t) => t.locale),
              );

              return (
                <tr key={n.id} className="border-t border-bg3">
                  <td className="px-4 py-3 font-medium text-text">{defaultTitle}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[0.74rem] font-semibold ${statusClass[n.status]}`}
                    >
                      {statusLabel[n.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-3">
                    <div className="flex gap-1">
                      {routing.locales.map((loc) => (
                        <span
                          key={loc}
                          title={
                            translatedLocales.has(loc)
                              ? `${loc}: traducida`
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
                  <td className="px-4 py-3 text-text-3">
                    {n.externalUrl ? "↗" : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-3">
                    {n.publishedAt
                      ? new Intl.DateTimeFormat("es", {
                          dateStyle: "medium",
                        }).format(n.publishedAt)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/noticias/${n.id}`}
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
