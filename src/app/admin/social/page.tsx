import Link from "next/link";
import { SocialProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { PROVIDERS, PROVIDER_LABELS } from "@/lib/social/registry";
import {
  startConnect,
  disconnectAccount,
  reconnectAccount,
} from "@/app/admin/_actions/social";

const errorBanner: Record<string, string> = {
  unknown_provider: "Plataforma desconocida.",
  state_mismatch: "El estado OAuth no coincide. Reintenta la conexión.",
  missing_params: "Faltan parámetros en el callback OAuth.",
  provider_not_configured:
    "Esa plataforma no tiene credenciales configuradas. Añade las variables de entorno y reinicia el servicio.",
};

export default async function SocialOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await requireSession();
  const { error } = await searchParams;

  const accounts = await prisma.socialAccount.findMany({
    orderBy: [{ isActive: "desc" }, { provider: "asc" }],
  });

  return (
    <AdminShell userName={user.name ?? user.email} userRole={user.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.8rem] font-bold text-text">
            Redes sociales
          </h1>
          <p className="text-[0.9rem] text-text-2">
            Conecta cuentas y publica desde un único sitio. La publicación
            programada y X / Instagram / TikTok llegan en próximas iteraciones.
          </p>
        </div>
        <Link
          href="/admin/social/publicaciones/nueva"
          className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-text"
        >
          + Nueva publicación
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.85rem] text-red-700">
          {errorBanner[error] ?? `Error: ${error}`}
        </div>
      )}

      <h2 className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-text-3">
        Cuentas conectadas
      </h2>
      <ul className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
        {(Object.keys(PROVIDERS) as SocialProvider[]).map((provider) => {
          const impl = PROVIDERS[provider];
          const account = accounts.find(
            (a) => a.provider === provider && a.isActive,
          );
          const inactive = accounts.find(
            (a) => a.provider === provider && !a.isActive,
          );
          return (
            <li
              key={provider}
              className="flex items-center justify-between gap-4 rounded-lg border border-bg3 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                {account?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full border border-bg3 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg2 text-[0.78rem] font-semibold uppercase text-text-3">
                    {provider.slice(0, 2)}
                  </div>
                )}
                <div>
                  <div className="font-medium text-text">
                    {PROVIDER_LABELS[provider]}
                  </div>
                  <div className="text-[0.78rem] text-text-3">
                    {account ? (
                      <>Conectado como <strong>{account.displayName}</strong></>
                    ) : impl.isAvailable ? (
                      "Sin conectar"
                    ) : (
                      "Próximamente"
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[0.78rem]">
                {account ? (
                  <form
                    action={async () => {
                      "use server";
                      await disconnectAccount(account.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-md border border-bg3 bg-white px-3 py-1.5 text-text-2 transition-colors hover:border-red-400 hover:text-red-700"
                    >
                      Desconectar
                    </button>
                  </form>
                ) : inactive ? (
                  <form
                    action={async () => {
                      "use server";
                      await reconnectAccount(inactive.id);
                    }}
                  >
                    <button
                      type="submit"
                      disabled={!impl.isAvailable}
                      className="rounded-md bg-river px-3 py-1.5 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-text disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reconectar
                    </button>
                  </form>
                ) : (
                  <form
                    action={async () => {
                      "use server";
                      await startConnect(provider);
                    }}
                  >
                    <button
                      type="submit"
                      disabled={!impl.isAvailable}
                      className="rounded-md bg-river px-3 py-1.5 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-text disabled:cursor-not-allowed disabled:opacity-60"
                      title={impl.isAvailable ? undefined : "Sin credenciales en .env"}
                    >
                      Conectar
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-text-3">
        Publicaciones recientes
      </h2>
      <p className="text-[0.85rem] text-text-2">
        <Link
          href="/admin/social/publicaciones"
          className="font-semibold text-river no-underline hover:text-text"
        >
          Ver todas →
        </Link>
      </p>
    </AdminShell>
  );
}
