import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
};

/** Loads the current session and bounces to /admin/login if there isn't one. */
export async function requireSession(): Promise<{ user: SessionUser }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
      name: session.user.name,
      role: (session.user.role as UserRole) ?? UserRole.EDITOR,
    },
  };
}

/** Same as requireSession but additionally enforces the ADMIN role. */
export async function requireAdmin(): Promise<{ user: SessionUser }> {
  const session = await requireSession();
  if (session.user.role !== UserRole.ADMIN) {
    redirect("/admin");
  }
  return session;
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === UserRole.ADMIN;
}
