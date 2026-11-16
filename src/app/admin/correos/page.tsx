import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdmin, requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { routing } from "@/i18n/routing";
import { asEmailLocale } from "@/lib/email-copy";
import { allEmailSamples } from "@/lib/email-samples";
import { emailPreviewEvent } from "@/lib/email-preview";
import { eventTitleFor } from "@/lib/event-registration-emails";
import { sendAllEmailSamples } from "@/app/admin/_actions/emails";

export const dynamic = "force-dynamic";

const LOCALE_LABEL: Record<string, string> = {
  es: "Español",
  ca: "Català",
  en: "English",
  fr: "Français",
};

const REASON_HINT: Record<string, string> = {
  not_configured: "faltan las variables SMTP_* en el .env o el servicio no se ha reiniciado",
  smtp_config: "las variables SMTP_* están incompletas o mal (el log dice cuál)",
  dry_run: "el servidor no está en modo producción y solo imprime los correos",
  no_admin_email: "tu usuario de admin no tiene email",
  smtp_EAUTH: "el servidor de correo rechaza el usuario o la contraseña",
};

/**
 * Todos los correos de la web con datos de ejemplo, tal como los verá quien
 * los recibe. Cada uno se pinta en un iframe aislado (sandbox sin scripts).
 */
export default async function EmailsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; sent?: string; reason?: string }>;
}) {
  const session = await requireSession();
  const { locale: rawLocale, sent, reason } = await searchParams;
  const locale = asEmailLocale(rawLocale);

  const event = await emailPreviewEvent(prisma);
  const samples = allEmailSamples(locale, event ?? undefined);
  const admin = isAdmin(session.user.role);

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.6rem] font-bold text-text">Correos</h1>
          <p className="max-w-[46rem] text-[0.9rem] text-text-2">
            Todos los correos que envía la web, con datos de ejemplo.{" "}
            {event
              ? `Los de eventos usan «${eventTitleFor(event, locale)}».`
              : "Los de eventos usan un evento de ejemplo."}{" "}
            Los internos (avisos al equipo, invitación a grabar) van siempre en castellano.
          </p>
        </div>
        <nav className="flex gap-2 text-[0.8rem]" aria-label="Idioma de los correos">
          {routing.locales.map((l) => (
            <Link
              key={l}
              href={`/admin/correos?locale=${l}`}
              aria-current={l === locale ? "page" : undefined}
              className={`rounded-md border px-3 py-1.5 no-underline transition-colors ${
                l === locale
                  ? "border-river bg-river text-white"
                  : "border-bg3 bg-white text-text-2 hover:border-river hover:text-river"
              }`}
            >
              {LOCALE_LABEL[l]}
            </Link>
          ))}
        </nav>
      </header>

      {admin && (
        <section className="mb-8 rounded-lg border border-bg3 bg-white p-5">
          <form action={sendAllEmailSamples} className="flex flex-wrap items-center gap-4">
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white transition-colors hover:bg-text"
            >
              Enviarme todos los correos de prueba
            </button>
            <p className="text-[0.82rem] text-text-2">
              Llegan a <strong className="text-text">{session.user.email}</strong> con
              «[Prueba]» en el asunto, en {LOCALE_LABEL[locale]}.
            </p>
          </form>
          {sent === "ok" && (
            <p className="mt-3 text-[0.8rem] font-semibold text-river">
              Enviados. Revisa tu bandeja (y la carpeta de spam).
            </p>
          )}
          {sent === "error" && (
            <p role="alert" className="mt-3 text-[0.8rem] font-semibold text-alert">
              No se han podido enviar todos.
              {reason ? (
                <>
                  {" "}Motivo: <code>{reason}</code>
                  {REASON_HINT[reason] ? ` — ${REASON_HINT[reason]}` : ""}
                </>
              ) : null}
            </p>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {samples.map((s) => (
          <section key={s.id} className="overflow-hidden rounded-lg border border-bg3 bg-white">
            <div className="border-b border-bg3 px-4 py-3">
              <h2 className="text-[0.95rem] font-semibold text-text">{s.name}</h2>
              <p className="text-[0.78rem] text-text-2">
                Para: {s.audience} · Asunto: <span className="text-text">{s.subject}</span>
              </p>
            </div>
            <iframe
              title={`Vista previa: ${s.name}`}
              srcDoc={s.html}
              sandbox=""
              className="block h-[1080px] w-full border-0 bg-bg2"
            />
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
