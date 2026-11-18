import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin, requireSession } from "@/lib/auth-helpers";
import { eventMessageFrom } from "@/lib/email-config";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventEmailComposer } from "@/components/admin/EventEmailComposer";
import { PlaceholderHelp } from "@/components/admin/EventEmailTemplateForm";
import {
  previewEventEmail,
  sendEventEmail,
  sendEventEmailTest,
} from "@/app/admin/_actions/event-emails";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "confirmados",
  WAITLIST: "lista de espera",
  PENDING_PAYMENT: "pendientes de pago",
  CANCELLED: "cancelados",
};

/** Escribir un correo personalizado a los inscritos (o a uno) de un evento. */
export default async function EventEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ a?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { a: registrationId } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: { translations: { select: { locale: true, title: true } } },
  });
  if (!event) notFound();

  const [grouped, templates, single, history] = await Promise.all([
    prisma.eventRegistration.groupBy({
      by: ["status"],
      where: { eventId: id },
      _count: { _all: true },
    }),
    prisma.eventEmailTemplate.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, locale: true, subject: true, body: true },
    }),
    registrationId
      ? prisma.eventRegistration.findFirst({
          where: { id: registrationId, eventId: id },
          select: { id: true, fullName: true, email: true },
        })
      : null,
    prisma.eventEmailSend.findMany({
      where: { eventId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { sentBy: { select: { name: true, email: true } } },
    }),
  ]);

  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  const titleEs =
    event.translations.find((t) => t.locale === "es")?.title ??
    event.translations[0]?.title ??
    "(Sin título)";

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <Link
        href={`/admin/eventos/${id}/inscripciones`}
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Inscripciones de {titleEs}
      </Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.6rem] font-bold text-text">
            {single ? `Escribir a ${single.fullName}` : "Escribir a los inscritos"}
          </h1>
          <p className="max-w-[46rem] text-[0.9rem] text-text-2">
            Elige una plantilla, ajusta el texto si hace falta y escribe el motivo. Los huecos
            se rellenan con los datos de cada persona.
          </p>
        </div>
        <Link
          href="/admin/eventos/plantillas"
          className="rounded-md border border-bg3 bg-white px-4 py-2 text-[0.85rem] font-semibold text-text-2 no-underline transition-colors hover:border-river hover:text-river"
        >
          Gestionar plantillas
        </Link>
      </div>

      <EventEmailComposer
        templates={templates}
        counts={counts}
        single={single}
        from={eventMessageFrom()}
        canSend={isAdmin(session.user.role)}
        previewAction={previewEventEmail.bind(null, id)}
        testAction={sendEventEmailTest.bind(null, id)}
        sendAction={sendEventEmail.bind(null, id)}
      />

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="rounded-lg border border-bg3 bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-text-3">
            Envíos de este evento
          </h2>
          {history.length === 0 ? (
            <p className="text-[0.85rem] text-text-3">Todavía no se ha escrito a nadie.</p>
          ) : (
            <ul className="divide-y divide-bg3 text-[0.85rem]">
              {history.map((h) => (
                <li key={h.id} className="py-3">
                  <p className="font-medium text-text">{h.subject}</p>
                  <p className="text-text-3">
                    {new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" }).format(h.createdAt)}
                    {" · "}
                    {h.statuses.length > 0
                      ? h.statuses.map((s) => STATUS_LABEL[s] ?? s).join(", ")
                      : "una persona"}
                    {" · "}
                    {h.sent} de {h.recipients} enviados
                    {h.failed > 0 && <span className="font-semibold text-alert"> · {h.failed} fallidos</span>}
                    {h.sentBy && ` · ${h.sentBy.name ?? h.sentBy.email}`}
                  </p>
                  {h.reason && <p className="mt-1 whitespace-pre-line text-text-2">{h.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <PlaceholderHelp />
      </div>
    </AdminShell>
  );
}
