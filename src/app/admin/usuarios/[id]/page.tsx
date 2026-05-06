import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { UserForm } from "@/components/admin/UserForm";
import { updateUser, deleteUser } from "@/app/admin/_actions/users";

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { user: current } = await requireAdmin();
  const { id } = await params;
  const { saved, error } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const update = updateUser.bind(null, id);
  const remove = async () => {
    "use server";
    await deleteUser(id);
  };

  return (
    <AdminShell userName={current.name ?? current.email} userRole={current.role}>
      <Link
        href="/admin/usuarios"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Usuarios
      </Link>
      <h1 className="mb-8 font-display text-[1.8rem] font-bold text-text">
        {user.name ?? user.email}
      </h1>
      <UserForm
        user={user}
        currentUserId={current.id}
        action={update}
        deleteAction={remove}
        saved={Boolean(saved)}
        error={error}
      />
    </AdminShell>
  );
}
