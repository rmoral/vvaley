import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { RegistrationStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  cancelRegistration,
  confirmRegistration,
  deleteRegistration,
} from "@/app/admin/_actions/events";

const statusLabel: Record<RegistrationStatus, string> = {
  CONFIRMED: "Confirmado",
  WAITLIST: "Lista de espera",
  CANCELLED: "Cancelado",
};

const statusClass: Record<RegistrationStatus, string> = {
  CONFIRMED: "bg-[rgba(46,139,143,0.1)] text-river",
  WAITLIST: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-bg2 text-text-3",
};

export default async function EventRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      translations: { select: { locale: true, title: true } },
      registrations: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!event) notFound();

  const titleEs =
    event.translations.find((t) => t.locale === "es")?.title ??
    event.translations[0]?.title ??
    "(Sin título)";

  const counts = event.registrations.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<RegistrationStatus, number>,
  );

  return (
    <AdminShell userName={session.user.name ?? session.user.email}>
      <Link
        href={`/admin/eventos/${event.id}`}
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← {titleEs}
      </Link>

      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.6rem] font-bold text-text">
            Inscripciones
          </h1>
          <p className="text-[0.9rem] text-text-2">
            {counts.CONFIRMED ?? 0} confirmados · {counts.WAITLIST ?? 0} en espera ·{" "}
            {counts.CANCELLED ?? 0} cancelados{" "}
            {event.capacity ? `· aforo ${event.capacity}` : ""}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href={`/api/admin/events/${event.id}/registrations/export`}
          className="rounded-md border border-bg3 bg-white px-4 py-2 text-[0.85rem] font-semibold text-text-2 no-underline transition-colors hover:border-river hover:text-river"
        >
          Exportar CSV
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border border-bg3 bg-white">
        <table className="w-full text-left text-[0.88rem]">
          <thead className="bg-bg2 text-[0.74rem] uppercase tracking-[0.08em] text-text-3">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {event.registrations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-3">
                  Aún no hay inscripciones.
                </td>
              </tr>
            )}
            {event.registrations.map((r) => (
              <tr key={r.id} className="border-t border-bg3 align-top">
                <td className="px-4 py-3 font-medium text-text">
                  {r.fullName}
                  {r.notes && (
                    <p className="mt-1 max-w-[24rem] text-[0.78rem] font-normal text-text-3">
                      {r.notes}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-text-2">{r.email}</td>
                <td className="px-4 py-3 text-text-3">{r.company ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[0.74rem] font-semibold ${statusClass[r.status]}`}
                  >
                    {statusLabel[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-3">
                  {new Intl.DateTimeFormat("es", { dateStyle: "short" }).format(
                    r.createdAt,
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <RowActions
                    eventId={event.id}
                    regId={r.id}
                    status={r.status}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function RowActions({
  eventId,
  regId,
  status,
}: {
  eventId: string;
  regId: string;
  status: RegistrationStatus;
}) {
  const cancel = cancelRegistration.bind(null, eventId, regId);
  const confirm = confirmRegistration.bind(null, eventId, regId);
  const remove = deleteRegistration.bind(null, eventId, regId);

  return (
    <div className="flex flex-wrap justify-end gap-2 text-[0.76rem]">
      {status !== "CONFIRMED" && (
        <form action={confirm}>
          <button
            type="submit"
            className="rounded-md border border-bg3 bg-white px-2 py-1 text-text-2 transition-colors hover:border-river hover:text-river"
          >
            Confirmar
          </button>
        </form>
      )}
      {status !== "CANCELLED" && (
        <form action={cancel}>
          <button
            type="submit"
            className="rounded-md border border-bg3 bg-white px-2 py-1 text-text-2 transition-colors hover:border-river hover:text-river"
          >
            Cancelar
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
