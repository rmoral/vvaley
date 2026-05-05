import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { GuestForm } from "@/components/admin/GuestForm";
import { updateGuest, deleteGuest } from "@/app/admin/_actions/guests";

export default async function EditGuestPage({
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

  const guest = await prisma.guest.findUnique({ where: { id } });
  if (!guest) notFound();

  const update = updateGuest.bind(null, id);
  const remove = async () => {
    "use server";
    await deleteGuest(id);
  };

  return (
    <AdminShell userName={session.user.name ?? session.user.email}>
      <Link
        href="/admin/invitados"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Invitados
      </Link>
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-[1.8rem] font-bold text-text">
          {guest.fullName}
        </h1>
        <Link
          href={`/invitados/${guest.slug}`}
          target="_blank"
          className="text-[0.78rem] font-semibold text-river no-underline hover:text-text"
        >
          Ver en la web ↗
        </Link>
      </header>
      <GuestForm
        guest={guest}
        action={update}
        deleteAction={remove}
        saved={Boolean(saved)}
      />
    </AdminShell>
  );
}
