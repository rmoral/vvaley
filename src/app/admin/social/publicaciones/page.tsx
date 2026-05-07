import Link from "next/link";
import { SocialPublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { PROVIDER_LABELS } from "@/lib/social/registry";

const statusLabel: Record<SocialPublicationStatus, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  PUBLISHING: "Publicando",
  PUBLISHED: "Publicada",
  FAILED: "Con errores",
};

const statusClass: Record<SocialPublicationStatus, string> = {
  DRAFT: "bg-bg2 text-text-2",
  SCHEDULED: "bg-amber-50 text-amber-700",
  PUBLISHING: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-[rgba(46,139,143,0.1)] text-river",
  FAILED: "bg-red-50 text-red-700",
};

export default async function PublicationsListPage() {
  const { user } = await requireSession();

  const items = await prisma.socialPublication.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      targets: { include: { account: true } },
    },
  });

  return (
    <AdminShell userName={user.name ?? user.email} userRole={user.role}>
      <Link
        href="/admin/social"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Redes sociales
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[1.8rem] font-bold text-text">
          Publicaciones
        </h1>
        <Link
          href="/admin/social/publicaciones/nueva"
          className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          + Nueva publicación
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-bg3 bg-white">
        <table className="w-full text-left text-[0.88rem]">
          <thead className="bg-bg2 text-[0.74rem] uppercase tracking-[0.08em] text-text-3">
            <tr>
              <th className="px-4 py-3">Texto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Destinos</th>
              <th className="px-4 py-3">Creada</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-3">
                  Aún no hay publicaciones. Crea la primera.
                </td>
              </tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-t border-bg3 align-top">
                <td className="px-4 py-3 text-text-2 max-w-md">
                  <span className="line-clamp-2">{p.body}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[0.74rem] font-semibold ${statusClass[p.status]}`}
                  >
                    {statusLabel[p.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-3">
                  <div className="flex flex-wrap gap-1">
                    {p.targets.map((t) => (
                      <span
                        key={t.accountId}
                        title={t.lastError ?? undefined}
                        className={`rounded-md px-2 py-0.5 text-[0.7rem] uppercase ${statusClass[t.status]}`}
                      >
                        {PROVIDER_LABELS[t.account.provider]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-3">
                  {new Intl.DateTimeFormat("es", { dateStyle: "short" }).format(p.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/social/publicaciones/${p.id}`}
                    className="text-[0.82rem] font-semibold text-river no-underline hover:text-text"
                  >
                    {p.status === "PUBLISHED" ? "Ver" : "Editar"} →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
