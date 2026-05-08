import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const intlDate = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const intlDateTime = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function fmtDate(d: Date | null | undefined) {
  return d ? intlDate.format(d) : "—";
}
function fmtDateTime(d: Date | null | undefined) {
  return d ? intlDateTime.format(d) : "—";
}

function pctOrDash(num: number, den: number) {
  if (!den) return "—";
  return `${Math.round((num / den) * 100)}%`;
}

function pickLocaleTitle<T extends { locale: string; title: string }>(
  items: T[],
): string {
  const def =
    items.find((t) => t.locale === routing.defaultLocale) ?? items[0];
  return def?.title ?? "(sin título)";
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    confirmedSubs,
    confirmedSubs30d,
    pendingSubs,
    upcomingEventsCount,
    nextEvent,
    publishedEpisodesCount,
    nextRecording,
    latestEpisode,
    socialScheduledCount,
    socialFailedCount,
    upcomingSocial,
    proposedGuestsCount,
    draftPostsCount,
    draftNewsCount,
    latestPost,
    latestNews,
    lastCampaign,
    upcomingCampaign,
  ] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { status: "CONFIRMED" } }),
    prisma.newsletterSubscriber.count({
      where: { status: "CONFIRMED", confirmedAt: { gte: last30 } },
    }),
    prisma.newsletterSubscriber.count({ where: { status: "PENDING" } }),
    prisma.event.count({
      where: { status: "PUBLISHED", startsAt: { gte: now } },
    }),
    prisma.event.findFirst({
      where: { status: "PUBLISHED", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      include: { translations: true },
    }),
    prisma.episode.count({ where: { status: "PUBLISHED" } }),
    prisma.episode.findFirst({
      where: { status: { in: ["DRAFT", "SCHEDULED"] }, recordingAt: { gte: now } },
      orderBy: { recordingAt: "asc" },
      select: { id: true, title: true, recordingAt: true },
    }),
    prisma.episode.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: { id: true, slug: true, title: true, number: true, publishedAt: true },
    }),
    prisma.socialPublication.count({
      where: { status: "SCHEDULED" },
    }),
    prisma.socialPublicationTarget.count({ where: { status: "FAILED" } }),
    prisma.socialPublication.findMany({
      where: { status: "SCHEDULED", scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
      take: 4,
      select: { id: true, body: true, scheduledAt: true },
    }),
    prisma.guest.count({ where: { status: "PROPOSED" } }),
    prisma.post.count({ where: { status: "DRAFT" } }),
    prisma.news.count({ where: { status: "DRAFT" } }),
    prisma.post.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: { translations: { select: { locale: true, title: true } } },
    }),
    prisma.news.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: { translations: { select: { locale: true, title: true } } },
    }),
    prisma.campaign.findFirst({
      where: { status: "SENT" },
      orderBy: { sentAt: "desc" },
      select: {
        id: true,
        subject: true,
        sentAt: true,
        recipients: true,
        delivered: true,
        failed: true,
      },
    }),
    prisma.campaign.findFirst({
      where: { status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, subject: true, updatedAt: true },
    }),
  ]);

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <header className="mb-8">
        <h1 className="mb-1 font-display text-[1.8rem] font-bold text-text">
          Panel
        </h1>
        <p className="text-[0.92rem] text-text-2">
          Resumen del estado de Valira Valley a {fmtDate(now)}.
        </p>
      </header>

      {/* Headline KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Suscriptores"
          value={confirmedSubs}
          delta={confirmedSubs30d > 0 ? `+${confirmedSubs30d} en 30 días` : "Sin altas en 30 días"}
          deltaTone={confirmedSubs30d > 0 ? "good" : "muted"}
          href="/admin/newsletter?status=CONFIRMED"
        />
        <Stat
          label="Pendientes confirmación"
          value={pendingSubs}
          delta={pendingSubs > 0 ? "Doble opt-in en curso" : "Sin pendientes"}
          deltaTone={pendingSubs > 0 ? "warn" : "muted"}
          href="/admin/newsletter?status=PENDING"
        />
        <Stat
          label="Próximos eventos"
          value={upcomingEventsCount}
          delta={
            nextEvent
              ? `Próximo: ${fmtDateTime(nextEvent.startsAt)}`
              : "Sin eventos programados"
          }
          deltaTone={upcomingEventsCount > 0 ? "good" : "muted"}
          href="/admin/eventos?status=PUBLISHED"
        />
        <Stat
          label="Episodios publicados"
          value={publishedEpisodesCount}
          delta={
            latestEpisode?.publishedAt
              ? `Último: ${fmtDate(latestEpisode.publishedAt)}`
              : "Aún sin publicar"
          }
          deltaTone="muted"
          href="/admin/episodios?status=PUBLISHED"
        />
      </section>

      {/* Two column section: Upcoming + Attention */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Próximamente">
          <FeedItem
            label="Próxima grabación"
            primary={nextRecording?.title ?? "Sin grabación programada"}
            secondary={nextRecording ? fmtDateTime(nextRecording.recordingAt) : null}
            href={nextRecording ? `/admin/episodios/${nextRecording.id}` : undefined}
          />
          <FeedItem
            label="Próximo evento"
            primary={
              nextEvent
                ? pickLocaleTitle(nextEvent.translations)
                : "Sin eventos programados"
            }
            secondary={nextEvent ? fmtDateTime(nextEvent.startsAt) : null}
            href={nextEvent ? `/admin/eventos/${nextEvent.id}` : undefined}
          />
          <FeedItem
            label="Próxima campaña en borrador"
            primary={upcomingCampaign?.subject ?? "Sin borradores"}
            secondary={
              upcomingCampaign
                ? `Editado el ${fmtDate(upcomingCampaign.updatedAt)}`
                : null
            }
            href={
              upcomingCampaign
                ? `/admin/campanas/${upcomingCampaign.id}`
                : undefined
            }
          />
          {upcomingSocial.length > 0 ? (
            <div className="rounded-md border border-bg3 bg-bg p-3">
              <div className="mb-2 text-[0.74rem] uppercase tracking-[0.1em] text-text-3">
                {socialScheduledCount} publicaciones sociales programadas
              </div>
              <ul className="flex flex-col gap-1.5">
                {upcomingSocial.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/social/publicaciones/${p.id}`}
                      className="flex items-baseline justify-between gap-3 text-[0.85rem] text-text no-underline hover:text-river"
                    >
                      <span className="line-clamp-1 flex-1">
                        {p.body.split("\n")[0] || "(sin texto)"}
                      </span>
                      <span className="shrink-0 text-[0.74rem] text-text-3">
                        {fmtDateTime(p.scheduledAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <FeedItem
              label="Cola social"
              primary="No hay publicaciones programadas"
              secondary={null}
              href="/admin/social/publicaciones"
            />
          )}
        </Card>

        <Card title="Requiere atención">
          <AlertRow
            count={proposedGuestsCount}
            zeroLabel="Invitados propuestos: ninguno pendiente"
            label="invitados en estado PROPUESTO"
            href="/admin/invitados?status=PROPOSED"
          />
          <AlertRow
            count={pendingSubs}
            zeroLabel="Doble opt-in: nadie pendiente"
            label="suscriptores pendientes de confirmar"
            href="/admin/newsletter?status=PENDING"
          />
          <AlertRow
            count={socialFailedCount}
            zeroLabel="Cola social: sin fallos"
            label="targets sociales en FAILED"
            href="/admin/social/publicaciones"
            tone={socialFailedCount > 0 ? "bad" : "muted"}
          />
          <AlertRow
            count={draftPostsCount}
            zeroLabel="Blog: sin borradores"
            label="posts en borrador"
            href="/admin/blog?status=DRAFT"
          />
          <AlertRow
            count={draftNewsCount}
            zeroLabel="Noticias: sin borradores"
            label="noticias en borrador"
            href="/admin/noticias?status=DRAFT"
          />
        </Card>
      </section>

      {/* Last campaign + recents row */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Última campaña enviada">
          {lastCampaign ? (
            <Link
              href={`/admin/campanas/${lastCampaign.id}`}
              className="flex flex-col gap-3 no-underline"
            >
              <div className="font-display text-[1.05rem] font-bold leading-tight text-text">
                {lastCampaign.subject}
              </div>
              <div className="text-[0.78rem] text-text-3">
                Enviada el {fmtDateTime(lastCampaign.sentAt)}
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-bg3 pt-3 text-center">
                <Mini label="Destinatarios" value={lastCampaign.recipients} />
                <Mini
                  label="Entregadas"
                  value={lastCampaign.delivered}
                  hint={pctOrDash(lastCampaign.delivered, lastCampaign.recipients)}
                  tone="good"
                />
                <Mini
                  label="Fallidas"
                  value={lastCampaign.failed}
                  hint={pctOrDash(lastCampaign.failed, lastCampaign.recipients)}
                  tone={lastCampaign.failed > 0 ? "bad" : "muted"}
                />
              </div>
            </Link>
          ) : (
            <p className="text-[0.88rem] text-text-3">
              Aún no se ha enviado ninguna campaña.
            </p>
          )}
        </Card>

        <Card title="Último post">
          {latestPost ? (
            <RecentLink
              title={pickLocaleTitle(latestPost.translations)}
              meta={`Publicado el ${fmtDate(latestPost.publishedAt)}`}
              href={`/admin/blog/${latestPost.id}`}
            />
          ) : (
            <p className="text-[0.88rem] text-text-3">Sin posts publicados.</p>
          )}
        </Card>

        <Card title="Última noticia">
          {latestNews ? (
            <RecentLink
              title={pickLocaleTitle(latestNews.translations)}
              meta={`Publicada el ${fmtDate(latestNews.publishedAt)}`}
              href={`/admin/noticias/${latestNews.id}`}
            />
          ) : (
            <p className="text-[0.88rem] text-text-3">Sin noticias publicadas.</p>
          )}
        </Card>
      </section>

      {/* Quick actions */}
      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Quick
          title="Añadir invitado"
          desc="Crea la ficha de un nuevo invitado del podcast."
          href="/admin/invitados/nuevo"
        />
        <Quick
          title="Crear episodio"
          desc="Empieza un nuevo episodio en estado borrador."
          href="/admin/episodios/nuevo"
        />
        <Quick
          title="Escribir post"
          desc="Redacta un nuevo artículo del blog."
          href="/admin/blog/nuevo"
        />
        <Quick
          title="Programar publicación"
          desc="Crea una publicación social en borrador o programada."
          href="/admin/social/publicaciones/nueva"
        />
      </section>
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  delta,
  deltaTone = "muted",
  href,
}: {
  label: string;
  value: number;
  delta?: string;
  deltaTone?: "good" | "warn" | "bad" | "muted";
  href?: string;
}) {
  const toneClass =
    deltaTone === "good"
      ? "text-emerald-600"
      : deltaTone === "warn"
        ? "text-amber-600"
        : deltaTone === "bad"
          ? "text-red-600"
          : "text-text-3";
  const inner = (
    <>
      <div className="text-[0.74rem] uppercase tracking-[0.1em] text-text-3">
        {label}
      </div>
      <div className="mt-2 font-display text-[2rem] font-black leading-none text-river">
        {value}
      </div>
      {delta && <div className={`mt-2 text-[0.78rem] ${toneClass}`}>{delta}</div>}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-lg border border-bg3 bg-white p-5 no-underline transition-colors hover:border-river"
    >
      {inner}
    </Link>
  ) : (
    <div className="rounded-lg border border-bg3 bg-white p-5">{inner}</div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-bg3 bg-white p-5">
      <h2 className="mb-4 text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-text-3">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function FeedItem({
  label,
  primary,
  secondary,
  href,
}: {
  label: string;
  primary: string;
  secondary?: string | null;
  href?: string;
}) {
  const inner = (
    <>
      <div className="text-[0.72rem] uppercase tracking-[0.1em] text-text-3">
        {label}
      </div>
      <div className="mt-1 line-clamp-2 text-[0.92rem] font-medium text-text">
        {primary}
      </div>
      {secondary && (
        <div className="mt-0.5 text-[0.78rem] text-text-3">{secondary}</div>
      )}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-md border border-bg3 bg-bg p-3 no-underline transition-colors hover:border-river hover:text-river"
    >
      {inner}
    </Link>
  ) : (
    <div className="rounded-md border border-bg3 bg-bg p-3">{inner}</div>
  );
}

function AlertRow({
  count,
  label,
  zeroLabel,
  href,
  tone = "warn",
}: {
  count: number;
  label: string;
  zeroLabel: string;
  href: string;
  tone?: "warn" | "bad" | "muted";
}) {
  const isZero = count === 0;
  const toneClass = isZero
    ? "text-text-3"
    : tone === "bad"
      ? "text-red-600"
      : tone === "warn"
        ? "text-amber-600"
        : "text-text-3";
  return (
    <Link
      href={href}
      className="flex items-baseline justify-between gap-3 rounded-md px-1 py-1 text-[0.88rem] no-underline transition-colors hover:bg-bg"
    >
      <span className="text-text-2">{isZero ? zeroLabel : label}</span>
      {!isZero && (
        <span className={`shrink-0 font-display text-[1rem] font-bold ${toneClass}`}>
          {count}
        </span>
      )}
    </Link>
  );
}

function Mini({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "good" | "bad" | "muted";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600"
      : tone === "bad"
        ? "text-red-600"
        : "text-text";
  return (
    <div>
      <div className={`font-display text-[1.2rem] font-bold ${toneClass}`}>
        {value}
      </div>
      <div className="text-[0.7rem] uppercase tracking-[0.08em] text-text-3">
        {label}
      </div>
      {hint && <div className="text-[0.7rem] text-text-3">{hint}</div>}
    </div>
  );
}

function RecentLink({
  title,
  meta,
  href,
}: {
  title: string;
  meta: string;
  href: string;
}) {
  return (
    <Link href={href} className="block no-underline">
      <div className="line-clamp-3 font-display text-[1rem] font-bold leading-tight text-text">
        {title}
      </div>
      <div className="mt-2 text-[0.78rem] text-text-3">{meta}</div>
    </Link>
  );
}

function Quick({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-bg3 bg-white p-5 no-underline transition-colors hover:border-river"
    >
      <div className="text-[0.74rem] uppercase tracking-[0.1em] text-river">
        Acción rápida
      </div>
      <div className="mt-1 font-display text-[1.05rem] font-bold text-text">
        {title}
      </div>
      <div className="mt-1 text-[0.82rem] text-text-3">{desc}</div>
    </Link>
  );
}
