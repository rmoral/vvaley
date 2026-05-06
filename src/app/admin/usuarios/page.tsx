import Link from "next/link";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";

const roleLabel: Record<UserRole, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
};

const roleClass: Record<UserRole, string> = {
  ADMIN: "bg-[rgba(46,139,143,0.1)] text-river",
  EDITOR: "bg-bg2 text-text-2",
};

const errorBanner: Record<string, string> = {
  cant_delete_self: "No puedes eliminarte a ti mismo.",
  not_found: "El usuario no existe.",
};

export default async function UsersListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user: current } = await requireAdmin();
  const { error } = await searchParams;

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <AdminShell userName={current.name ?? current.email} userRole={current.role}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.8rem] font-bold text-text">
            Usuarios
          </h1>
          <p className="text-[0.9rem] text-text-2">
            {users.length} {users.length === 1 ? "cuenta" : "cuentas"} ·{" "}
            {users.filter((u) => u.role === "ADMIN").length} admins ·{" "}
            {users.filter((u) => u.role === "EDITOR").length} editores
          </p>
        </div>
        <Link
          href="/admin/usuarios/nuevo"
          className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          + Nuevo usuario
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.85rem] text-red-700">
          {errorBanner[error] ?? `Error: ${error}`}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-bg3 bg-white">
        <table className="w-full text-left text-[0.88rem]">
          <thead className="bg-bg2 text-[0.74rem] uppercase tracking-[0.08em] text-text-3">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Alta</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-bg3 align-middle">
                <td className="px-4 py-3 font-medium text-text">
                  {u.email}
                  {u.id === current.id && (
                    <span className="ml-2 rounded-md bg-bg2 px-2 py-0.5 text-[0.7rem] uppercase tracking-[0.08em] text-text-3">
                      tú
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-2">{u.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[0.74rem] font-semibold ${roleClass[u.role]}`}
                  >
                    {roleLabel[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-3">
                  {new Intl.DateTimeFormat("es", { dateStyle: "short" }).format(u.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/usuarios/${u.id}`}
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
