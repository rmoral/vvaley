import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { EpisodeForm } from "@/components/admin/EpisodeForm";
import {
  updateEpisode,
  deleteEpisode,
  resendEpisodeInvites,
} from "@/app/admin/_actions/episodes";

export default async function EditEpisodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const { saved } = await searchParams;

  const [episode, guests] = await Promise.all([
    prisma.episode.findUnique({
      where: { id },
      include: { guests: { orderBy: { position: "asc" } } },
    }),
    prisma.guest.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, company: true },
    }),
  ]);
  if (!episode) notFound();

  const update = updateEpisode.bind(null, id);
  const remove = async () => {
    "use server";
    await deleteEpisode(id);
  };
  const resend = async () => {
    "use server";
    await resendEpisodeInvites(id);
  };

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <Link
        href="/admin/episodios"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Episodios
      </Link>
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[1.8rem] font-bold text-text">
          {episode.title}
        </h1>
        <div className="flex flex-wrap gap-4 text-[0.78rem]">
          {episode.recordingAt && (
            <>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href={`/api/admin/episodes/${episode.id}/calendar.ics`}
                className="font-semibold text-river no-underline hover:text-text"
              >
                Descargar .ics ↓
              </a>
              <form action={resend} className="inline">
                <button
                  type="submit"
                  className="text-[0.78rem] font-semibold text-river no-underline hover:text-text"
                >
                  Reenviar invitación a invitados ↻
                </button>
              </form>
            </>
          )}
          {episode.status === "PUBLISHED" && (
            <Link
              href={`/podcast/${episode.slug}`}
              target="_blank"
              className="font-semibold text-river no-underline hover:text-text"
            >
              Ver en la web ↗
            </Link>
          )}
        </div>
      </header>
      <EpisodeForm
        episode={episode}
        allGuests={guests}
        action={update}
        deleteAction={remove}
        saved={Boolean(saved)}
      />
    </AdminShell>
  );
}
