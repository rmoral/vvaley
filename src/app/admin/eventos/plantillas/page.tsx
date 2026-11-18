import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

const LOCALE_LABEL: Record<string, string> = { es: "ES", ca: "CA", en: "EN", fr: "FR" };

export default async function EventEmailTemplatesPage() {
  const session = await requireSession();
  const templates = await prisma.eventEmailTemplate.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { sends: true } } },
  });

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <Link
        href="/admin/eventos"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Eventos
      </Link>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.6rem] font-bold text-text">Plantillas de correo</h1>
          <p className="max-w-[46rem] text-[0.9rem] text-text-2">
            Textos con huecos para escribir a los inscritos de un evento. Se usan desde la
            página de inscripciones de cada evento.
          </p>
        </div>
        <Link
          href="/admin/eventos/plantillas/nueva"
          className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          + Nueva plantilla
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-bg3 bg-white">
        <table className="w-full text-left text-[0.88rem]">
          <thead className="bg-bg2 text-[0.74rem] uppercase tracking-[0.08em] text-text-3">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Asunto</th>
              <th className="px-4 py-3">Idioma</th>
              <th className="px-4 py-3">Envíos</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-text-3">
                  Aún no hay plantillas.
                </td>
              </tr>
            )}
            {templates.map((t) => (
              <tr key={t.id} className="border-t border-bg3">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/eventos/plantillas/${t.id}`} className="text-text no-underline hover:text-river">
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-2">{t.subject}</td>
                <td className="px-4 py-3 text-text-3">{LOCALE_LABEL[t.locale] ?? t.locale}</td>
                <td className="px-4 py-3 text-text-3">{t._count.sends}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
