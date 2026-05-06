import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { UserForm } from "@/components/admin/UserForm";
import { createUser } from "@/app/admin/_actions/users";

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user: current } = await requireAdmin();
  const { error } = await searchParams;

  return (
    <AdminShell userName={current.name ?? current.email} userRole={current.role}>
      <Link
        href="/admin/usuarios"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Usuarios
      </Link>
      <h1 className="mb-8 font-display text-[1.8rem] font-bold text-text">
        Nuevo usuario
      </h1>
      <UserForm
        action={createUser}
        currentUserId={current.id}
        error={error}
      />
    </AdminShell>
  );
}
