"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

const trim = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length === 0 ? null : s;
};

const createSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

const updateSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  password: z.string().min(8).nullable(),
});

function parseRole(v: FormDataEntryValue | null): UserRole {
  const s = trim(v);
  if (s && s in UserRole) return s as UserRole;
  return UserRole.EDITOR;
}

async function countAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: UserRole.ADMIN } });
}

export async function createUser(formData: FormData) {
  await requireAdmin();

  const parsed = createSchema.safeParse({
    email: trim(formData.get("email")) ?? "",
    name: trim(formData.get("name")),
    role: parseRole(formData.get("role")),
    password: trim(formData.get("password")) ?? "",
  });
  if (!parsed.success) {
    redirect(
      `/admin/usuarios/nuevo?error=${encodeURIComponent(parsed.error.issues[0]?.code ?? "invalid")}`,
    );
  }
  const data = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) redirect("/admin/usuarios/nuevo?error=email_taken");

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      passwordHash,
    },
  });

  revalidatePath("/admin/usuarios");
  redirect(`/admin/usuarios/${user.id}?saved=1`);
}

export async function updateUser(id: string, formData: FormData) {
  const session = await requireAdmin();

  const parsed = updateSchema.safeParse({
    email: trim(formData.get("email")) ?? "",
    name: trim(formData.get("name")),
    role: parseRole(formData.get("role")),
    password: trim(formData.get("password")),
  });
  if (!parsed.success) {
    redirect(
      `/admin/usuarios/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.code ?? "invalid")}`,
    );
  }
  const data = parsed.data;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/admin/usuarios?error=not_found");

  // Email collisions with another user.
  if (data.email !== target.email) {
    const collision = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (collision) redirect(`/admin/usuarios/${id}?error=email_taken`);
  }

  // Safeguards.
  const isSelf = session.user.id === id;
  if (isSelf && data.role !== target.role) {
    redirect(`/admin/usuarios/${id}?error=cant_change_own_role`);
  }
  if (
    target.role === UserRole.ADMIN &&
    data.role !== UserRole.ADMIN &&
    (await countAdmins()) <= 1
  ) {
    redirect(`/admin/usuarios/${id}?error=last_admin`);
  }

  const update: {
    email: string;
    name: string | null;
    role: UserRole;
    passwordHash?: string;
  } = {
    email: data.email,
    name: data.name,
    role: data.role,
  };
  if (data.password) {
    update.passwordHash = await bcrypt.hash(data.password, 10);
  }

  await prisma.user.update({ where: { id }, data: update });

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  redirect(`/admin/usuarios/${id}?saved=1`);
}

export async function deleteUser(id: string) {
  const session = await requireAdmin();

  if (session.user.id === id) {
    redirect("/admin/usuarios?error=cant_delete_self");
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/admin/usuarios?error=not_found");

  if (target.role === UserRole.ADMIN && (await countAdmins()) <= 1) {
    redirect(`/admin/usuarios/${id}?error=last_admin`);
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}
