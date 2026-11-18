import Link from "next/link";
import { requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventEmailTemplateForm } from "@/components/admin/EventEmailTemplateForm";
import { createEventEmailTemplate } from "@/app/admin/_actions/event-emails";

export default async function NewEventEmailTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { error } = await searchParams;
  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <Link
        href="/admin/eventos/plantillas"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Plantillas de correo
      </Link>
      <h1 className="mb-8 font-display text-[1.6rem] font-bold text-text">Nueva plantilla</h1>
      <EventEmailTemplateForm action={createEventEmailTemplate} error={error} />
    </AdminShell>
  );
}
