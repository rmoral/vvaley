import { redirect } from "next/navigation";
import Link from "next/link";
import { EventStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";

const statusLabel: Record<EventStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  CANCELLED: "Cancelado",
  COMPLETED: "Finalizado",
};

const statusClass: Record<EventStatus, string> = {
  DRAFT: "bg-bg2 text-text-2",
  PUBLISHED: "bg-[rgba(46,139,143,0.1)] text-river",
  CANCELLED: "bg-red-50 text-red-700",
  COMPLETED: "bg-bg2 text-text-3",
};

export default async function EventsListAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { status } = await searchParams;
  const filter =
    status && status in EventStatus
      ? { status: status as EventStatus }
      : undefined;

  const events = await prisma.event.findMany({
    where: filter,
    orderBy: { startsAt: "desc" },
    include: {
      translations: { select: { locale: true, title: true } },
      _count: { select: { registrations: true } },
    },
  });

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.8rem] font-bold text-text">
            Eventos
          </h1>
          <p className="text-[0.9rem] text-text-2">
            {events.length} {events.length === 1 ? "evento" : "eventos"}.
          </p>
        </div>
        <Link
          href="/admin/eventos/nuevo"
          className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          + Nuevo evento
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[0.78rem]">
        <FilterPill href="/admin/eventos" active={!status}>
          Todos
        </FilterPill>
        {(Object.keys(EventStatus) as EventStatus[]).map((s) => (
          <FilterPill
            key={s}
            href={`/admin/eventos?status=${s}`}
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
              <th className="px-4 py-3">Inicio</th>
              <th className="px-4 py-3">Inscritos</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-3">
                  Aún no hay eventos. Crea el primero.
                </td>
              </tr>
            )}
            {events.map((ev) => {
              const defaultTitle =
                ev.translations.find((t) => t.locale === "es")?.title ??
                ev.translations[0]?.title ??
                "(Sin título)";

              return (
                <tr key={ev.id} className="border-t border-bg3">
                  <td className="px-4 py-3 font-medium text-text">{defaultTitle}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[0.74rem] font-semibold ${statusClass[ev.status]}`}
                    >
                      {statusLabel[ev.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-3">
                    {new Intl.DateTimeFormat("es", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(ev.startsAt)}
                  </td>
                  <td className="px-4 py-3 text-text-3">
                    <Link
                      href={`/admin/eventos/${ev.id}/inscripciones`}
                      className="text-river no-underline hover:text-text"
                    >
                      {ev._count.registrations}
                      {ev.capacity ? ` / ${ev.capacity}` : ""}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/eventos/${ev.id}`}
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
