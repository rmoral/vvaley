import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";

export const dynamic = "force-dynamic";

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/admin",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/admin/login?error=${encodeURIComponent(err.type)}`);
    }
    throw err;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/admin");

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-xl border border-bg3 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="font-display text-[1.1rem] font-black text-text">
            VALIRA<em className="text-river not-italic"> · </em>VALLEY
          </div>
          <div className="mt-1 text-[0.7rem] uppercase tracking-[0.16em] text-text-3">
            Backoffice
          </div>
        </div>

        <h1 className="mb-6 text-center font-display text-[1.4rem] font-bold text-text">
          Acceder
        </h1>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.82rem] text-red-700">
            Credenciales no válidas. Inténtalo de nuevo.
          </div>
        )}

        <form action={loginAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none transition-colors focus:border-river"
            />
          </label>
          <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
            Contraseña
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none transition-colors focus:border-river"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-md bg-river px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
