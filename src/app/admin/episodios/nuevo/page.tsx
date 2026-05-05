import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { EpisodeForm } from "@/components/admin/EpisodeForm";
import { createEpisode } from "@/app/admin/_actions/episodes";

export default async function NewEpisodePage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const guests = await prisma.guest.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, company: true },
  });

  return (
    <AdminShell userName={session.user.name ?? session.user.email}>
      <Link
        href="/admin/episodios"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Episodios
      </Link>
      <h1 className="mb-8 font-display text-[1.8rem] font-bold text-text">
        Nuevo episodio
      </h1>
      <EpisodeForm allGuests={guests} action={createEpisode} />
    </AdminShell>
  );
}
