import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin, requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventEmailTemplateForm } from "@/components/admin/EventEmailTemplateForm";
import {
  deleteEventEmailTemplate,
  updateEventEmailTemplate,
} from "@/app/admin/_actions/event-emails";

export default async function EditEventEmailTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { saved, error } = await searchParams;
  const template = await prisma.eventEmailTemplate.findUnique({ where: { id } });
  if (!template) notFound();

  const remove = async () => {
    "use server";
    await deleteEventEmailTemplate(id);
  };

  return (
    <AdminShell userName={session.user.name ?? session.user.email} userRole={session.user.role}>
      <Link
        href="/admin/eventos/plantillas"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Plantillas de correo
      </Link>
      <h1 className="mb-8 font-display text-[1.6rem] font-bold text-text">{template.name}</h1>
      <EventEmailTemplateForm
        template={template}
        action={updateEventEmailTemplate.bind(null, id)}
        deleteAction={isAdmin(session.user.role) ? remove : undefined}
        saved={Boolean(saved)}
        error={error}
      />
    </AdminShell>
  );
}
