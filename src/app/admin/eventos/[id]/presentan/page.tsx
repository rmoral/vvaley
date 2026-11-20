import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin, requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventPresenterForm } from "@/components/admin/EventPresenterForm";
import {
  createEventPresenter,
  deleteEventPresenter,
  updateEventPresenter,
} from "@/app/admin/_actions/event-presenters";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing_name: "Falta el nombre.",
  invalid_url: "El enlace no es válido: usa una dirección web (empresa.com) o un @perfil de Instagram.",
  invalid_logo: "El logo debe ser una imagen subida aquí o una dirección https.",
};

/** Empresas que presentan en el evento: sección «Presentan» de su página. */
export default async function EventPresentersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { saved, deleted, error } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      translations: { select: { locale: true, title: true } },
      presenters: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: { translations: true },
      },
    },
  });
  if (!event) notFound();

  const titleEs =
    event.translations.find((t) => t.locale === "es")?.title ??
    event.translations[0]?.title ??
    "(Sin título)";
  const admin = isAdmin(session.user.role);

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <Link
        href={`/admin/eventos/${id}`}
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← {titleEs}
      </Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.6rem] font-bold text-text">Presentan</h1>
          <p className="max-w-[46rem] text-[0.9rem] text-text-2">
            Empresas y proyectos que se presentan en el evento. Salen en la página pública del
            evento, con su logo enlazado y su descripción, justo antes de la inscripción.
          </p>
        </div>
        {(event.status === "PUBLISHED" || event.status === "COMPLETED") && (
          <a
            href={`/es/eventos/${event.slug}#presentan`}
            target="_blank"
            className="rounded-md border border-bg3 bg-white px-4 py-2 text-[0.85rem] font-semibold text-text-2 no-underline transition-colors hover:border-river hover:text-river"
          >
            Ver la sección en la web ↗
          </a>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.85rem] text-red-700">
          {ERRORS[error] ?? error}
        </p>
      )}
      {(saved || deleted) && (
        <p className="mb-5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[0.85rem] text-green-700">
          {deleted ? "Quitado de la sección." : "Guardado."}
        </p>
      )}

      <div className="space-y-5">
        {event.presenters.map((p) => {
          const remove = async () => {
            "use server";
            await deleteEventPresenter(id, p.id);
          };
          return (
            <EventPresenterForm
              key={`${p.id}-${p.updatedAt.getTime()}`}
              presenter={p}
              action={updateEventPresenter.bind(null, id, p.id)}
              deleteAction={admin ? remove : undefined}
              submitLabel="Guardar cambios"
            />
          );
        })}

        <h2 className="pt-4 font-display text-[1.2rem] font-bold text-text">Añadir</h2>
        <EventPresenterForm
          key={`nuevo-${event.presenters.length}`}
          action={createEventPresenter.bind(null, id)}
          submitLabel="Añadir a la sección"
        />
      </div>
    </AdminShell>
  );
}
