import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventForm } from "@/components/admin/EventForm";
import { createEvent } from "@/app/admin/_actions/events";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const { error } = await searchParams;

  return (
    <AdminShell userName={session.user.name ?? session.user.email}>
      <Link
        href="/admin/eventos"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Eventos
      </Link>
      <h1 className="mb-8 font-display text-[1.8rem] font-bold text-text">
        Nuevo evento
      </h1>
      <EventForm action={createEvent} error={error} />
    </AdminShell>
  );
}
