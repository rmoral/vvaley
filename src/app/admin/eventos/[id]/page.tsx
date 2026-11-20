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

/** Explicación de los códigos que devuelve sendTestPaymentEmails. */
const testEmailHint: Record<string, string> = {
  not_configured: "faltan las variables SMTP_* en el .env del servidor o el servicio no se ha reiniciado",
  smtp_config: "las variables SMTP_* están incompletas o mal (el log dice cuál)",
  dry_run: "el servidor no está en modo producción y solo imprime los correos",
  no_admin_email: "tu usuario de admin no tiene email",
  event_not_found: "el evento ya no existe",
  smtp_EAUTH: "el servidor de correo rechaza el usuario o la contraseña",
  smtp_ECONNECTION: "no se puede conectar con el servidor de correo",
  smtp_ETIMEDOUT: "el servidor de correo no responde",
  smtp_ESOCKET: "fallo de conexión o de TLS con el servidor de correo",
  smtp_EENVELOPE: "remitente o destinatario no válidos (revisa MAIL_FROM)",
};

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
    test_email?: string;
    reason?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const { saved, error, test_email: testEmail, reason } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      translations: true,
      _count: { select: { registrations: true, presenters: true } },
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
          <Link
            href={`/admin/eventos/${event.id}/presentan`}
            className="font-semibold text-river no-underline hover:text-text"
          >
            Presentan ({event._count.presenters}) →
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
            <div role="alert" className="mt-3 text-[0.8rem] text-alert">
              <p className="font-semibold">
                No se han podido enviar.
                {reason ? (
                  <>
                    {" "}Motivo: <code>{reason}</code>
                    {testEmailHint[reason] ? ` — ${testEmailHint[reason]}` : ""}
                  </>
                ) : null}
              </p>
              <p className="mt-2 text-text-2">En el servidor, por separado:</p>
              <pre className="mt-1 overflow-x-auto rounded-md bg-bg2 px-3 py-2 text-[0.78rem] text-text">
                pnpm mail:test {session.user.email}
              </pre>
              <pre className="mt-1 overflow-x-auto rounded-md bg-bg2 px-3 py-2 text-[0.78rem] text-text">
                journalctl -u vvaley --since &quot;1 hour ago&quot; | grep &quot;\[email\]&quot;
              </pre>
            </div>
          )}
        </section>
      )}
    </AdminShell>
  );
}
