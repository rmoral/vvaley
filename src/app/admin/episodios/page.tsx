import { redirect } from "next/navigation";
import Link from "next/link";
import { EpisodeStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";

const statusLabel: Record<EpisodeStatus, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programado",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

const statusClass: Record<EpisodeStatus, string> = {
  DRAFT: "bg-bg2 text-text-2",
  SCHEDULED: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-[rgba(39,117,119,0.1)] text-river",
  ARCHIVED: "bg-bg2 text-text-3",
};

export default async function EpisodeListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { status } = await searchParams;
  const filter =
    status && status in EpisodeStatus
      ? { status: status as EpisodeStatus }
      : undefined;

  const episodes = await prisma.episode.findMany({
    where: filter,
    orderBy: [{ number: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { guests: true } } },
  });

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.8rem] font-bold text-text">
            Episodios
          </h1>
          <p className="text-[0.9rem] text-text-2">
            {episodes.length}{" "}
            {episodes.length === 1 ? "episodio" : "episodios"}.
          </p>
        </div>
        <Link
          href="/admin/episodios/nuevo"
          className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          + Nuevo episodio
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[0.78rem]">
        <FilterPill href="/admin/episodios" active={!status}>
          Todos
        </FilterPill>
        {(Object.keys(EpisodeStatus) as EpisodeStatus[]).map((s) => (
          <FilterPill
            key={s}
            href={`/admin/episodios?status=${s}`}
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
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Invitados</th>
              <th className="px-4 py-3">Publicado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {episodes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-3">
                  No hay episodios. Crea el primero.
                </td>
              </tr>
            )}
            {episodes.map((ep) => (
              <tr key={ep.id} className="border-t border-bg3">
                <td className="px-4 py-3 font-mono text-[0.82rem] text-text-3">
                  {ep.number !== null ? String(ep.number).padStart(2, "0") : "—"}
                </td>
                <td className="px-4 py-3 font-medium text-text">{ep.title}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[0.74rem] font-semibold ${statusClass[ep.status]}`}
                  >
                    {statusLabel[ep.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-3">{ep._count.guests}</td>
                <td className="px-4 py-3 text-text-3">
                  {ep.publishedAt
                    ? new Intl.DateTimeFormat("es", {
                        dateStyle: "medium",
                      }).format(ep.publishedAt)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/episodios/${ep.id}`}
                    className="text-[0.82rem] font-semibold text-river no-underline hover:text-text"
                  >
                    Editar →
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
          ? "border-river bg-[rgba(39,117,119,0.08)] text-river"
          : "border-bg3 bg-white text-text-2 hover:border-river"
      }`}
    >
      {children}
    </Link>
  );
}
