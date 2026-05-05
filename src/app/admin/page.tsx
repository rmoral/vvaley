import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const [guestCount, episodeCount, publishedCount, draftCount] =
    await Promise.all([
      prisma.guest.count(),
      prisma.episode.count(),
      prisma.episode.count({ where: { status: "PUBLISHED" } }),
      prisma.episode.count({ where: { status: "DRAFT" } }),
    ]);

  return (
    <AdminShell userName={session.user.name ?? session.user.email}>
      <header className="mb-10">
        <h1 className="mb-2 font-display text-[1.8rem] font-bold text-text">
          Panel
        </h1>
        <p className="text-[0.92rem] text-text-2">
          Bienvenido al backoffice de Valira Valley.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card label="Invitados" value={guestCount} href="/admin/invitados" />
        <Card label="Episodios" value={episodeCount} href="/admin/episodios" />
        <Card label="Publicados" value={publishedCount} href="/admin/episodios?status=PUBLISHED" />
        <Card label="Borradores" value={draftCount} href="/admin/episodios?status=DRAFT" />
      </div>

      <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/admin/invitados/nuevo"
          className="rounded-lg border border-bg3 bg-white p-6 no-underline transition-colors hover:border-river"
        >
          <div className="text-[0.76rem] uppercase tracking-[0.1em] text-river">
            Acción rápida
          </div>
          <div className="mt-1 font-display text-[1.1rem] font-bold text-text">
            Añadir invitado
          </div>
          <div className="mt-1 text-[0.85rem] text-text-3">
            Crea la ficha de un nuevo invitado del podcast.
          </div>
        </Link>
        <Link
          href="/admin/episodios/nuevo"
          className="rounded-lg border border-bg3 bg-white p-6 no-underline transition-colors hover:border-river"
        >
          <div className="text-[0.76rem] uppercase tracking-[0.1em] text-river">
            Acción rápida
          </div>
          <div className="mt-1 font-display text-[1.1rem] font-bold text-text">
            Crear episodio
          </div>
          <div className="mt-1 text-[0.85rem] text-text-3">
            Empieza un nuevo episodio en estado borrador.
          </div>
        </Link>
      </section>
    </AdminShell>
  );
}

function Card({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-bg3 bg-white p-5 no-underline transition-colors hover:border-river"
    >
      <div className="text-[0.74rem] uppercase tracking-[0.1em] text-text-3">
        {label}
      </div>
      <div className="mt-2 font-display text-[2rem] font-black leading-none text-river">
        {value}
      </div>
    </Link>
  );
}
