import Link from "next/link";
import { signOut } from "@/auth";

const navItems = [
  { href: "/admin", label: "Inicio", exact: true },
  { href: "/admin/invitados", label: "Invitados" },
  { href: "/admin/episodios", label: "Episodios" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/newsletter", label: "Newsletter" },
];

export function AdminShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName?: string | null;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-shrink-0 flex-col gap-2 border-r border-bg3 bg-white px-5 py-8 md:flex">
        <Link
          href="/admin"
          className="mb-6 font-display text-[1.05rem] font-black text-text no-underline"
        >
          VALIRA<em className="text-river not-italic"> · </em>VALLEY
          <div className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-text-3">
            Backoffice
          </div>
        </Link>

        <nav className="flex flex-col gap-1">
          {navItems.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="rounded-md px-3 py-2 text-[0.85rem] font-medium text-text-2 no-underline transition-colors hover:bg-bg2 hover:text-river"
            >
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6 text-[0.78rem] text-text-3">
          {userName && <div className="mb-2 font-medium text-text-2">{userName}</div>}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-bg3 bg-bg2 px-3 py-1.5 text-[0.78rem] text-text-2 transition-colors hover:border-river hover:text-river"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-6 py-10 md:px-12">{children}</main>
    </div>
  );
}
