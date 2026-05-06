import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { SubscriberStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  deleteSubscriber,
  reactivateSubscriber,
  unsubscribeSubscriber,
} from "@/app/admin/_actions/newsletter";

const statusLabel: Record<SubscriberStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  UNSUBSCRIBED: "Baja",
};

const statusClass: Record<SubscriberStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-[rgba(46,139,143,0.1)] text-river",
  UNSUBSCRIBED: "bg-bg2 text-text-3",
};

export default async function NewsletterListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { status, q } = await searchParams;
  const where: Prisma.NewsletterSubscriberWhereInput = {};
  if (status && status in SubscriberStatus) {
    where.status = status as SubscriberStatus;
  }
  if (q && q.trim()) {
    where.OR = [
      { email: { contains: q.trim(), mode: "insensitive" } },
      { name: { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  const [subscribers, totals] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.newsletterSubscriber.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const counts = Object.fromEntries(
    totals.map((t) => [t.status, t._count._all]),
  ) as Partial<Record<SubscriberStatus, number>>;

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.8rem] font-bold text-text">
            Newsletter
          </h1>
          <p className="text-[0.9rem] text-text-2">
            {counts.CONFIRMED ?? 0} confirmados · {counts.PENDING ?? 0} pendientes ·{" "}
            {counts.UNSUBSCRIBED ?? 0} bajas
          </p>
        </div>
        {/* Plain anchor (not next/link): forces a full request so the
            browser handles the CSV download via Content-Disposition. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/admin/newsletter/export"
          className="rounded-md border border-bg3 bg-white px-4 py-2 text-[0.85rem] font-semibold text-text-2 no-underline transition-colors hover:border-river hover:text-river"
        >
          Exportar CSV
        </a>
      </div>

      <form className="mb-4 flex flex-wrap gap-2 text-[0.78rem]">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por email o nombre…"
          className="min-w-[240px] flex-1 rounded-md border border-bg3 bg-white px-3 py-1.5 text-[0.85rem] text-text outline-none focus:border-river"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-bg3 bg-white px-3 py-1.5 text-[0.85rem] text-text outline-none focus:border-river"
        >
          <option value="">Todos</option>
          {(Object.keys(SubscriberStatus) as SubscriberStatus[]).map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-river px-4 py-1.5 text-[0.82rem] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          Filtrar
        </button>
        {(q || status) && (
          <Link
            href="/admin/newsletter"
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
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Idioma</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Alta</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-text-3">
                  Sin suscriptores con los filtros actuales.
                </td>
              </tr>
            )}
            {subscribers.map((s) => (
              <tr key={s.id} className="border-t border-bg3 align-middle">
                <td className="px-4 py-3 font-medium text-text">{s.email}</td>
                <td className="px-4 py-3 text-text-2">{s.name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-[0.78rem] uppercase text-text-3">
                  {s.locale}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[0.74rem] font-semibold ${statusClass[s.status]}`}
                  >
                    {statusLabel[s.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-3">
                  {new Intl.DateTimeFormat("es", { dateStyle: "short" }).format(s.createdAt)}
                </td>
                <td className="px-4 py-3 text-text-3">{s.source ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <RowActions id={s.id} status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {subscribers.length === 500 && (
        <p className="mt-3 text-[0.78rem] text-text-3">
          Mostrando los primeros 500 resultados. Refina la búsqueda para ver más.
        </p>
      )}
    </AdminShell>
  );
}

function RowActions({ id, status }: { id: string; status: SubscriberStatus }) {
  const unsubscribe = unsubscribeSubscriber.bind(null, id);
  const reactivate = reactivateSubscriber.bind(null, id);
  const remove = deleteSubscriber.bind(null, id);

  return (
    <div className="flex flex-wrap justify-end gap-2 text-[0.76rem]">
      {status !== "UNSUBSCRIBED" && (
        <form action={unsubscribe}>
          <button
            type="submit"
            className="rounded-md border border-bg3 bg-white px-2 py-1 text-text-2 transition-colors hover:border-river hover:text-river"
          >
            Dar de baja
          </button>
        </form>
      )}
      {status === "UNSUBSCRIBED" && (
        <form action={reactivate}>
          <button
            type="submit"
            className="rounded-md border border-bg3 bg-white px-2 py-1 text-text-2 transition-colors hover:border-river hover:text-river"
          >
            Reactivar
          </button>
        </form>
      )}
      <form action={remove}>
        <button
          type="submit"
          className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-red-700 transition-colors hover:border-red-400 hover:bg-red-100"
        >
          Eliminar
        </button>
      </form>
    </div>
  );
}
