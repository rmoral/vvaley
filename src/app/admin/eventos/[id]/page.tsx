import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventForm } from "@/components/admin/EventForm";
import { updateEvent, deleteEvent } from "@/app/admin/_actions/events";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const { saved, error } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      translations: true,
      _count: { select: { registrations: true } },
    },
  });
  if (!event) notFound();

  const update = updateEvent.bind(null, id);
  const remove = async () => {
    "use server";
    await deleteEvent(id);
  };

  const titleEs =
    event.translations.find((t) => t.locale === "es")?.title ??
    event.translations[0]?.title ??
    "(Sin título)";

  return (
    <AdminShell userName={session.user.name ?? session.user.email}>
      <Link
        href="/admin/eventos"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Eventos
      </Link>
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[1.8rem] font-bold text-text">
          {titleEs}
        </h1>
        <div className="flex gap-4 text-[0.78rem]">
          <Link
            href={`/admin/eventos/${event.id}/inscripciones`}
            className="font-semibold text-river no-underline hover:text-text"
          >
            Inscripciones ({event._count.registrations}
            {event.capacity ? ` / ${event.capacity}` : ""}) →
          </Link>
          {event.status === "PUBLISHED" && (
            <Link
              href={`/eventos/${event.slug}`}
              target="_blank"
              className="font-semibold text-river no-underline hover:text-text"
            >
              Ver en la web ↗
            </Link>
          )}
        </div>
      </header>
      <EventForm
        event={event}
        action={update}
        deleteAction={remove}
        saved={Boolean(saved)}
        error={error}
      />
    </AdminShell>
  );
}
