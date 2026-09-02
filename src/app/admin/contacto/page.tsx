import { ContactStatus, ContactTopic } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  setContactStatus,
  saveContactNotes,
  deleteContactRequest,
} from "@/app/admin/_actions/contact";

export const dynamic = "force-dynamic";

const topicLabel: Record<ContactTopic, string> = {
  SERVICES: "Servicios",
  GUEST: "Invitado",
  SPONSOR: "Patrocinio",
  PRESS: "Prensa",
  OTHER: "Otro",
};

const statusLabel: Record<ContactStatus, string> = {
  NEW: "Nuevo",
  IN_PROGRESS: "En curso",
  CLOSED: "Cerrado",
};

const statusClass: Record<ContactStatus, string> = {
  NEW: "bg-[rgba(39,117,119,0.1)] text-river",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  CLOSED: "bg-bg2 text-text-3",
};

export default async function AdminContactPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; topic?: string }>;
}) {
  const { user } = await requireSession();
  const { status, topic } = await searchParams;

  const statusFilter =
    status && status in statusLabel ? (status as ContactStatus) : undefined;
  const topicFilter =
    topic && topic in topicLabel ? (topic as ContactTopic) : undefined;

  const [requests, newCount] = await Promise.all([
    prisma.contactRequest.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(topicFilter ? { topic: topicFilter } : {}),
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.contactRequest.count({ where: { status: ContactStatus.NEW } }),
  ]);

  return (
    <AdminShell userName={user.name ?? user.email} userRole={user.role}>
      <header className="mb-8">
        <h1 className="font-display text-[1.8rem] font-bold text-text">
          Contacto
        </h1>
        <p className="text-[0.9rem] text-text-2">
          Mensajes recibidos desde el formulario público.
          {newCount > 0 && (
            <>
              {" "}
              <strong className="text-river">{newCount} sin abrir.</strong>
            </>
          )}
        </p>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2 text-[0.8rem]">
        <FilterLink href="/admin/contacto" active={!statusFilter && !topicFilter}>
          Todos
        </FilterLink>
        {(Object.keys(statusLabel) as ContactStatus[]).map((s) => (
          <FilterLink
            key={s}
            href={`/admin/contacto?status=${s}`}
            active={statusFilter === s}
          >
            {statusLabel[s]}
          </FilterLink>
        ))}
        <span className="mx-1 w-px bg-bg3" aria-hidden />
        {(Object.keys(topicLabel) as ContactTopic[]).map((tp) => (
          <FilterLink
            key={tp}
            href={`/admin/contacto?topic=${tp}`}
            active={topicFilter === tp}
          >
            {topicLabel[tp]}
          </FilterLink>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-lg border border-bg3 bg-white px-6 py-16 text-center text-text-3">
          No hay mensajes con este filtro.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-bg3 bg-white p-5"
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-md px-2 py-0.5 text-[0.72rem] font-semibold ${statusClass[r.status]}`}
                >
                  {statusLabel[r.status]}
                </span>
                <span className="rounded-md border border-bg3 px-2 py-0.5 text-[0.72rem] text-text-2">
                  {topicLabel[r.topic]}
                </span>
                <span className="text-[0.78rem] text-text-3">
                  {new Intl.DateTimeFormat("es", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(r.createdAt)}
                </span>
              </div>

              <div className="mb-1 font-display text-[1.05rem] font-bold text-text">
                {r.name}
                {r.company && (
                  <span className="ml-2 text-[0.9rem] font-normal text-text-2">
                    · {r.company}
                  </span>
                )}
              </div>
              <div className="mb-3 flex flex-wrap gap-x-4 text-[0.82rem] text-text-2">
                <a
                  href={`mailto:${r.email}`}
                  className="text-river no-underline hover:text-text"
                >
                  {r.email}
                </a>
                {r.phone && <span>{r.phone}</span>}
                <span className="uppercase text-text-3">{r.locale}</span>
              </div>

              <p className="mb-4 whitespace-pre-wrap rounded-md bg-bg px-4 py-3 text-[0.9rem] leading-[1.65] text-text-2">
                {r.message}
              </p>

              <form
                action={saveContactNotes.bind(null, r.id)}
                className="mb-3 flex flex-col gap-2 sm:flex-row"
              >
                <input
                  name="notes"
                  defaultValue={r.notes ?? ""}
                  placeholder="Notas internas…"
                  className="flex-1 rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.85rem] text-text outline-none focus:border-river"
                />
                <button
                  type="submit"
                  className="rounded-md border border-bg3 bg-white px-4 py-2 text-[0.82rem] font-semibold text-text-2 transition-colors hover:border-river hover:text-river"
                >
                  Guardar nota
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-2 text-[0.8rem]">
                {(Object.keys(statusLabel) as ContactStatus[])
                  .filter((s) => s !== r.status)
                  .map((s) => (
                    <form
                      key={s}
                      action={async () => {
                        "use server";
                        await setContactStatus(r.id, s);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-md border border-bg3 bg-white px-3 py-1.5 text-text-2 transition-colors hover:border-river hover:text-river"
                      >
                        Marcar {statusLabel[s].toLowerCase()}
                      </button>
                    </form>
                  ))}
                <details className="ml-auto">
                  <summary className="cursor-pointer text-text-3 hover:text-text">
                    Eliminar
                  </summary>
                  <form
                    action={async () => {
                      "use server";
                      await deleteContactRequest(r.id);
                    }}
                    className="mt-2"
                  >
                    <button
                      type="submit"
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[0.8rem] font-semibold text-red-700 transition-colors hover:border-red-400"
                    >
                      Eliminar definitivamente
                    </button>
                  </form>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`rounded-md border px-3 py-1.5 no-underline transition-colors ${
        active
          ? "border-river bg-[rgba(39,117,119,0.08)] font-semibold text-river"
          : "border-bg3 bg-white text-text-2 hover:border-river-2"
      }`}
    >
      {children}
    </a>
  );
}
