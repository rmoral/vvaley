import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { GuestForm } from "@/components/admin/GuestForm";
import { createGuest } from "@/app/admin/_actions/guests";

export default async function NewGuestPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <Link
        href="/admin/invitados"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Invitados
      </Link>
      <h1 className="mb-8 font-display text-[1.8rem] font-bold text-text">
        Nuevo invitado
      </h1>
      <GuestForm action={createGuest} />
    </AdminShell>
  );
}
