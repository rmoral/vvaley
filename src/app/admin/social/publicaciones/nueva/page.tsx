import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { PublicationForm } from "@/components/admin/PublicationForm";
import { createPublication } from "@/app/admin/_actions/social";

export default async function NewPublicationPage() {
  const { user } = await requireSession();

  const accounts = await prisma.socialAccount.findMany({
    where: { isActive: true },
    orderBy: { provider: "asc" },
  });

  return (
    <AdminShell userName={user.name ?? user.email} userRole={user.role}>
      <Link
        href="/admin/social/publicaciones"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Publicaciones
      </Link>
      <h1 className="mb-8 font-display text-[1.8rem] font-bold text-text">
        Nueva publicación
      </h1>
      <PublicationForm accounts={accounts} action={createPublication} />
    </AdminShell>
  );
}
