import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventForm } from "@/components/admin/EventForm";
import { getKunfupayConfig } from "@/lib/kunfupay";
import { updateEvent, deleteEvent, sendTestPaymentEmails } from "@/app/admin/_actions/events";
import { isAdmin } from "@/lib/auth-helpers";
import { guestOptions } from "@/lib/guest-options";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; test_email?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const { saved, error, test_email: testEmail } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      translations: true,
      _count: { select: { registrations: true } },
    },
  });
  if (!event) notFound();

  const guests = await guestOptions();
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
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
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
        paymentsConfigured={getKunfupayConfig() != null}
        event={event}
        guests={guests}
        action={update}
        deleteAction={remove}
        saved={Boolean(saved)}
        error={error}
      />

      {isAdmin(session.user.role) && (
        <section className="mt-8 rounded-lg border border-bg3 bg-white p-5">
          <h2 className="mb-2 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-text-3">
            Probar los correos de pago
          </h2>
          <p className="mb-4 max-w-[46rem] text-[0.85rem] text-text-2">
            Te envía a <strong className="text-text">{session.user.email}</strong> los dos
            correos que salen cuando alguien paga este evento: la confirmación que recibe
            la persona (en el idioma que elijas) y el aviso al equipo, con una persona de
            ejemplo. No crea ninguna inscripción ni pasa por Kunfupay.
          </p>
          <form
            action={sendTestPaymentEmails.bind(null, event.id)}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
              Idioma de la confirmación
              <select
                name="locale"
                defaultValue="es"
                className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none focus:border-river"
              >
                <option value="es">Español</option>
                <option value="ca">Català</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md border border-bg3 bg-white px-4 py-2 text-[0.85rem] font-semibold text-text-2 transition-colors hover:border-river hover:text-river"
            >
              Enviarme los correos de prueba
            </button>
          </form>
          {testEmail === "ok" && (
            <p className="mt-3 text-[0.8rem] font-semibold text-river">
              Enviados. Revisa tu bandeja (y la carpeta de spam).
            </p>
          )}
          {testEmail === "error" && (
            <p role="alert" className="mt-3 text-[0.8rem] font-semibold text-alert">
              No se han podido enviar. Revisa el SMTP con <code>pnpm mail:test</code> y el
              log: <code>journalctl -u vvaley | grep &quot;\[email\]&quot;</code>.
            </p>
          )}
        </section>
      )}
    </AdminShell>
  );
}
