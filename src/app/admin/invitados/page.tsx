import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function GuestListPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const guests = await prisma.guest.findMany({
    orderBy: { fullName: "asc" },
    include: { _count: { select: { episodes: true } } },
  });

  return (
    <AdminShell userName={session.user.name ?? session.user.email}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.8rem] font-bold text-text">
            Invitados
          </h1>
          <p className="text-[0.9rem] text-text-2">
            {guests.length} {guests.length === 1 ? "invitado" : "invitados"} en
            la base.
          </p>
        </div>
        <Link
          href="/admin/invitados/nuevo"
          className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          + Nuevo invitado
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-bg3 bg-white">
        <table className="w-full text-left text-[0.88rem]">
          <thead className="bg-bg2 text-[0.74rem] uppercase tracking-[0.08em] text-text-3">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Empresa / Rol</th>
              <th className="px-4 py-3">Episodios</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-3">
                  Aún no hay invitados. Crea el primero.
                </td>
              </tr>
            )}
            {guests.map((g) => (
              <tr key={g.id} className="border-t border-bg3">
                <td className="px-4 py-3 font-medium text-text">{g.fullName}</td>
                <td className="px-4 py-3 text-text-2">
                  {[g.role, g.company].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 text-text-3">{g._count.episodes}</td>
                <td className="px-4 py-3 font-mono text-[0.78rem] text-text-3">
                  /{g.slug}
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
