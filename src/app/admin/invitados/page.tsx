import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { GuestStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";

const statusLabel: Record<GuestStatus, string> = {
  PROPOSED: "Propuesto",
  CONFIRMED: "Confirmado",
  RECORDED: "Ya grabado",
  DECLINED: "Rechazado",
};

const statusClass: Record<GuestStatus, string> = {
  PROPOSED: "bg-bg2 text-text-2",
  CONFIRMED: "bg-amber-50 text-amber-700",
  RECORDED: "bg-[rgba(39,117,119,0.1)] text-river",
  DECLINED: "bg-red-50 text-red-700",
};

const sortOptions = {
  scheduledAtAsc: { label: "Próxima fecha ↑", orderBy: { scheduledAt: "asc" as const } },
  scheduledAtDesc: { label: "Próxima fecha ↓", orderBy: { scheduledAt: "desc" as const } },
  nameAsc: { label: "Nombre A-Z", orderBy: { fullName: "asc" as const } },
  recent: { label: "Recientes", orderBy: { createdAt: "desc" as const } },
};

type SortKey = keyof typeof sortOptions;

export default async function GuestListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    visibility?: string;
    sort?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { q, status, visibility, sort } = await searchParams;

  const where: Prisma.GuestWhereInput = {};
  if (status && status in GuestStatus) {
    where.status = status as GuestStatus;
  }
  if (visibility === "public") where.isPublic = true;
  if (visibility === "private") where.isPublic = false;
  if (q && q.trim()) {
    where.OR = [
      { fullName: { contains: q.trim(), mode: "insensitive" } },
      { company: { contains: q.trim(), mode: "insensitive" } },
      { role: { contains: q.trim(), mode: "insensitive" } },
      { email: { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  const sortKey: SortKey = (sort as SortKey) in sortOptions ? (sort as SortKey) : "scheduledAtAsc";
  const orderBy = sortOptions[sortKey].orderBy;

  // Sort by scheduledAt nullslast: pretend nulls go to the bottom by adding
  // a secondary sort on createdAt so the list is deterministic.
  const guests = await prisma.guest.findMany({
    where,
    orderBy: [orderBy, { fullName: "asc" }],
    include: { _count: { select: { episodes: true } } },
  });

  const counts = await prisma.guest.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const totals = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  ) as Partial<Record<GuestStatus, number>>;

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.8rem] font-bold text-text">
            Invitados
          </h1>
          <p className="text-[0.9rem] text-text-2">
            {guests.length} {guests.length === 1 ? "ficha" : "fichas"} ·{" "}
            {totals.PROPOSED ?? 0} propuestos · {totals.CONFIRMED ?? 0}{" "}
            confirmados · {totals.RECORDED ?? 0} grabados
          </p>
        </div>
        <Link
          href="/admin/invitados/nuevo"
          className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          + Nuevo invitado
        </Link>
      </div>

      <form className="mb-4 flex flex-wrap gap-2 text-[0.78rem]">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, empresa, rol, email…"
          className="min-w-[260px] flex-1 rounded-md border border-bg3 bg-white px-3 py-1.5 text-[0.85rem] text-text outline-none focus:border-river"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-bg3 bg-white px-3 py-1.5 text-[0.85rem] text-text outline-none focus:border-river"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(GuestStatus) as GuestStatus[]).map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </select>
        <select
          name="visibility"
          defaultValue={visibility ?? ""}
          className="rounded-md border border-bg3 bg-white px-3 py-1.5 text-[0.85rem] text-text outline-none focus:border-river"
        >
          <option value="">Públicos y privados</option>
          <option value="public">Solo públicos</option>
          <option value="private">Solo privados</option>
        </select>
        <select
          name="sort"
          defaultValue={sortKey}
          className="rounded-md border border-bg3 bg-white px-3 py-1.5 text-[0.85rem] text-text outline-none focus:border-river"
        >
          {(Object.keys(sortOptions) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {sortOptions[k].label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-river px-4 py-1.5 text-[0.82rem] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          Filtrar
        </button>
        {(q || status || visibility || sort) && (
          <Link
            href="/admin/invitados"
            className="rounded-md border border-bg3 bg-white px-4 py-1.5 text-[0.82rem] text-text-2 no-underline hover:border-river"
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="overflow-hidden rounded-lg border border-bg3 bg-white">
        <table className="w-full text-left text-[0.88rem]">
          <thead className="bg-bg2 text-[0.74rem] uppercase tracking-[0.08em] text-text-3">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Empresa / Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha prevista</th>
              <th className="px-4 py-3">Eps.</th>
              <th className="px-4 py-3">Web</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-text-3">
                  Sin invitados con los filtros actuales.
                </td>
              </tr>
            )}
            {guests.map((g) => (
              <tr key={g.id} className="border-t border-bg3 align-middle">
                <td className="px-4 py-3 font-medium text-text">
                  {g.fullName}
                  {g.email && (
                    <div className="text-[0.78rem] font-normal text-text-3">
                      {g.email}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-text-2">
                  {[g.role, g.company].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[0.74rem] font-semibold ${statusClass[g.status]}`}
                  >
                    {statusLabel[g.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-3">
                  {g.scheduledAt
                    ? new Intl.DateTimeFormat("es", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(g.scheduledAt)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-text-3">{g._count.episodes}</td>
                <td className="px-4 py-3 text-[0.74rem] uppercase tracking-[0.1em] text-text-3">
                  {g.isPublic ? (
                    <span className="text-river">Visible</span>
                  ) : (
                    <span>Oculto</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/invitados/${g.id}`}
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
