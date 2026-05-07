import { notFound } from "next/navigation";
import Link from "next/link";
import { SocialPublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { PublicationForm } from "@/components/admin/PublicationForm";
import { PROVIDER_LABELS } from "@/lib/social/registry";
import {
  publishNow,
  deletePublication,
} from "@/app/admin/_actions/social";

const statusClass: Record<SocialPublicationStatus, string> = {
  DRAFT: "bg-bg2 text-text-2",
  SCHEDULED: "bg-amber-50 text-amber-700",
  PUBLISHING: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-[rgba(46,139,143,0.1)] text-river",
  FAILED: "bg-red-50 text-red-700",
};

export default async function PublicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; published?: string; error?: string }>;
}) {
  const { user } = await requireSession();
  const { id } = await params;
  const { saved, published, error } = await searchParams;

  const publication = await prisma.socialPublication.findUnique({
    where: { id },
    include: { targets: { include: { account: true } } },
  });
  if (!publication) notFound();

  const accounts = await prisma.socialAccount.findMany({
    where: { isActive: true },
    orderBy: { provider: "asc" },
  });

  const remove = async () => {
    "use server";
    await deletePublication(id);
  };
  const publish = async () => {
    "use server";
    await publishNow(id);
  };

  // No editing for already-sent publications.
  const isPublished = publication.status === SocialPublicationStatus.PUBLISHED;

  return (
    <AdminShell userName={user.name ?? user.email} userRole={user.role}>
      <Link
        href="/admin/social/publicaciones"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Publicaciones
      </Link>
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[1.6rem] font-bold text-text">
          Publicación
        </h1>
        <span
          className={`inline-block rounded-md px-2 py-0.5 text-[0.78rem] font-semibold ${statusClass[publication.status]}`}
        >
          {publication.status}
        </span>
      </header>

      {saved && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[0.85rem] text-green-700">
          Borrador guardado.
        </div>
      )}
      {published && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[0.85rem] text-green-700">
          Publicación procesada.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.85rem] text-red-700">
          {error === "already_published"
            ? "Esta publicación ya se publicó."
            : `Error: ${error}`}
        </div>
      )}

      <PublicationForm
        accounts={accounts}
        readOnly
        initial={{
          body: publication.body,
          sourceUrl: publication.sourceUrl,
          mediaUrls: publication.mediaUrls,
          accountIds: publication.targets.map((t) => t.accountId),
        }}
        action={async () => {
          "use server";
          // No-op: edits aren't supported in this minimal first version.
          // The form is read-only when reaching this page.
        }}
      />

      <section className="mt-8 rounded-lg border border-bg3 bg-white p-5">
        <h2 className="mb-4 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-text-3">
          Estado por destino
        </h2>
        <ul className="flex flex-col gap-2 text-[0.85rem]">
          {publication.targets.map((t) => (
            <li
              key={t.accountId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-bg3 bg-bg2 px-3 py-2"
            >
              <span className="font-medium text-text">
                {PROVIDER_LABELS[t.account.provider]}
                <span className="ml-2 text-[0.78rem] text-text-3">
                  · {t.account.displayName}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span
                  className={`inline-block rounded-md px-2 py-0.5 text-[0.74rem] font-semibold ${statusClass[t.status]}`}
                >
                  {t.status}
                </span>
                {t.externalUrl && (
                  <a
                    href={t.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.78rem] font-semibold text-river no-underline hover:text-text"
                  >
                    Ver post ↗
                  </a>
                )}
              </span>
              {t.lastError && (
                <p className="w-full text-[0.78rem] text-red-700">
                  {t.lastError}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        {!isPublished && (
          <form action={publish}>
            <button
              type="submit"
              className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
            >
              Publicar ahora
            </button>
          </form>
        )}
        {!isPublished && (
          <details className="text-[0.8rem]">
            <summary className="cursor-pointer text-text-3 hover:text-text">
              Eliminar
            </summary>
            <form action={remove} className="mt-2">
              <button
                type="submit"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.82rem] font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-100"
              >
                Eliminar definitivamente
              </button>
            </form>
          </details>
        )}
      </div>
    </AdminShell>
  );
}
