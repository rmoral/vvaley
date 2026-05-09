import Link from "next/link";
import { CampaignStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";

const statusLabel: Record<CampaignStatus, string> = {
  DRAFT: "Borrador",
  SENDING: "Enviando",
  SENT: "Enviada",
  FAILED: "Con errores",
};

const statusClass: Record<CampaignStatus, string> = {
  DRAFT: "bg-bg2 text-text-2",
  SENDING: "bg-amber-50 text-amber-700",
  SENT: "bg-[rgba(46,139,143,0.1)] text-river",
  FAILED: "bg-red-50 text-red-700",
};

export default async function CampaignsListPage() {
  const { user } = await requireSession();

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true, email: true } } },
  });

  return (
    <AdminShell userName={user.name ?? user.email} userRole={user.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.8rem] font-bold text-text">
            Campañas
          </h1>
          <p className="text-[0.9rem] text-text-2">
            Envíos a la newsletter. Compón un borrador, revísalo y dispara el
            envío cuando estés listo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/campanas/nueva-asistida"
            className="rounded-md border border-river bg-white px-4 py-2 text-[0.85rem] font-semibold text-river no-underline transition-all hover:-translate-y-0.5 hover:bg-river hover:text-white"
          >
            + Desde contenido
          </Link>
          <Link
            href="/admin/campanas/nueva"
            className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
          >
            + Nueva campaña
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-bg3 bg-white">
        <table className="w-full text-left text-[0.88rem]">
          <thead className="bg-bg2 text-[0.74rem] uppercase tracking-[0.08em] text-text-3">
            <tr>
              <th className="px-4 py-3">Asunto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Audiencia</th>
              <th className="px-4 py-3">Resultados</th>
              <th className="px-4 py-3">Autor</th>
              <th className="px-4 py-3">Creada</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-text-3">
                  Aún no hay campañas. Crea la primera.
                </td>
              </tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t border-bg3 align-middle">
                <td className="px-4 py-3 font-medium text-text">{c.subject}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[0.74rem] font-semibold ${statusClass[c.status]}`}
                  >
                    {statusLabel[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-3">
                  {c.audienceLocale ? c.audienceLocale.toUpperCase() : "Todos"}
                </td>
                <td className="px-4 py-3 text-text-3">
                  {c.recipients > 0
                    ? `${c.delivered}/${c.recipients}${c.failed > 0 ? ` · ${c.failed}✗` : ""}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-text-3">
                  {c.author?.name ?? c.author?.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-text-3">
                  {new Intl.DateTimeFormat("es", { dateStyle: "short" }).format(c.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/campanas/${c.id}`}
                    className="text-[0.82rem] font-semibold text-river no-underline hover:text-text"
                  >
                    {c.status === CampaignStatus.DRAFT ? "Editar" : "Ver"} →
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
