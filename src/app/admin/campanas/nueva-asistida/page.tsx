import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { AdminShell } from "@/components/admin/AdminShell";
import { composeCampaignFromContent } from "@/app/admin/_actions/campaigns";
import { defaultSubject } from "@/lib/campaign-builder";
import { routing, type AppLocale } from "@/i18n/routing";

const localeLabel: Record<AppLocale, string> = {
  es: "Español",
  ca: "Català",
  en: "English",
  fr: "Français",
};

const errorBanner: Record<string, string> = {
  empty_pick: "Selecciona al menos un episodio, post o noticia.",
};

export default async function ComposeFromContentPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; error?: string }>;
}) {
  const { user } = await requireSession();
  const { locale: localeQuery, error } = await searchParams;

  const locale: AppLocale =
    localeQuery && (routing.locales as readonly string[]).includes(localeQuery)
      ? (localeQuery as AppLocale)
      : routing.defaultLocale;

  // Pull a generous window of recently published content the editor can
  // pick from. Translations are filtered to the chosen audience locale,
  // with a default-locale fallback so untranslated rows still surface.
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [latestEpisode, posts, news] = await Promise.all([
    prisma.episode.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        subtitle: true,
        summary: true,
        publishedAt: true,
      },
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: since } },
      orderBy: { publishedAt: "desc" },
      take: 30,
      select: {
        id: true,
        slug: true,
        publishedAt: true,
        translations: {
          select: { locale: true, title: true, summary: true },
        },
      },
    }),
    prisma.news.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: since } },
      orderBy: { publishedAt: "desc" },
      take: 30,
      select: {
        id: true,
        slug: true,
        publishedAt: true,
        translations: {
          select: { locale: true, title: true, summary: true },
        },
      },
    }),
  ]);

  const pickTr = (
    translations: { locale: string; title: string; summary: string | null }[],
  ) =>
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === routing.defaultLocale) ??
    translations[0] ??
    null;

  return (
    <AdminShell userName={user.name ?? user.email} userRole={user.role}>
      <Link
        href="/admin/campanas"
        className="mb-4 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline hover:text-text"
      >
        ← Campañas
      </Link>
      <header className="mb-6">
        <h1 className="font-display text-[1.8rem] font-bold text-text">
          Nueva campaña desde contenido
        </h1>
        <p className="text-[0.92rem] text-text-2">
          Elige el contenido publicado de los últimos 90 días, cambia el idioma
          si quieres usar las traducciones, y generaremos un borrador en
          Markdown que podrás afinar antes de enviar.
        </p>
      </header>

      {/* Locale picker is a plain GET so changing it just refreshes the
          server-rendered list with the right translations. */}
      <form method="get" className="mb-6 flex flex-wrap items-center gap-3">
        <label className="text-[0.82rem] font-medium text-text-2">
          Idioma del contenido
        </label>
        <select
          name="locale"
          defaultValue={locale}
          className="rounded-md border border-bg3 bg-white px-3 py-2 text-[0.88rem] text-text outline-none focus:border-river"
        >
          {routing.locales.map((loc) => (
            <option key={loc} value={loc}>
              {localeLabel[loc]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-bg3 bg-white px-3 py-2 text-[0.82rem] text-text-2 transition-colors hover:border-river hover:text-river"
        >
          Aplicar
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.82rem] text-red-700">
          {errorBanner[error] ?? `Error: ${error}`}
        </div>
      )}

      <form
        action={composeCampaignFromContent}
        className="grid grid-cols-1 gap-5 lg:grid-cols-3"
      >
        <input type="hidden" name="locale" value={locale} />

        <div className="space-y-5 lg:col-span-2">
          <Card title="Episodio destacado (opcional)">
            {latestEpisode ? (
              <label className="flex items-start gap-3 rounded-md border border-bg3 bg-bg p-3">
                <input
                  type="checkbox"
                  name="episodeId"
                  value={latestEpisode.id}
                  className="mt-1 h-4 w-4 accent-river"
                />
                <div className="flex-1">
                  <div className="font-medium text-text">
                    {latestEpisode.title}
                  </div>
                  {latestEpisode.subtitle && (
                    <div className="mt-0.5 text-[0.85rem] text-text-2">
                      {latestEpisode.subtitle}
                    </div>
                  )}
                  {latestEpisode.publishedAt && (
                    <div className="mt-1 text-[0.74rem] uppercase tracking-[0.08em] text-text-3">
                      {new Intl.DateTimeFormat("es", {
                        dateStyle: "medium",
                      }).format(latestEpisode.publishedAt)}
                    </div>
                  )}
                </div>
              </label>
            ) : (
              <p className="text-[0.85rem] text-text-3">
                Aún no hay ningún episodio publicado para destacar.
              </p>
            )}
          </Card>

          <Card title={`Posts del blog · últimos 90 días (${posts.length})`}>
            {posts.length === 0 ? (
              <p className="text-[0.85rem] text-text-3">
                Sin posts publicados en este rango.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {posts.map((p) => {
                  const tr = pickTr(p.translations);
                  return (
                    <li key={p.id}>
                      <label className="flex items-start gap-3 rounded-md border border-bg3 bg-bg p-3 hover:border-river-2">
                        <input
                          type="checkbox"
                          name="postIds"
                          value={p.id}
                          className="mt-1 h-4 w-4 accent-river"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-text">
                            {tr?.title ?? p.slug}
                          </div>
                          {tr?.summary && (
                            <div className="mt-0.5 text-[0.85rem] text-text-2 line-clamp-2">
                              {tr.summary}
                            </div>
                          )}
                          {p.publishedAt && (
                            <div className="mt-1 text-[0.74rem] uppercase tracking-[0.08em] text-text-3">
                              {new Intl.DateTimeFormat("es", {
                                dateStyle: "medium",
                              }).format(p.publishedAt)}
                            </div>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title={`Noticias · últimos 90 días (${news.length})`}>
            {news.length === 0 ? (
              <p className="text-[0.85rem] text-text-3">
                Sin noticias publicadas en este rango.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {news.map((n) => {
                  const tr = pickTr(n.translations);
                  return (
                    <li key={n.id}>
                      <label className="flex items-start gap-3 rounded-md border border-bg3 bg-bg p-3 hover:border-river-2">
                        <input
                          type="checkbox"
                          name="newsIds"
                          value={n.id}
                          className="mt-1 h-4 w-4 accent-river"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-text">
                            {tr?.title ?? n.slug}
                          </div>
                          {tr?.summary && (
                            <div className="mt-0.5 text-[0.85rem] text-text-2 line-clamp-2">
                              {tr.summary}
                            </div>
                          )}
                          {n.publishedAt && (
                            <div className="mt-1 text-[0.74rem] uppercase tracking-[0.08em] text-text-3">
                              {new Intl.DateTimeFormat("es", {
                                dateStyle: "medium",
                              }).format(n.publishedAt)}
                            </div>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Detalles del envío">
            <Field
              label="Asunto"
              name="subject"
              defaultValue={defaultSubject(locale)}
              help="Lo verá el suscriptor en la bandeja. Puedes cambiarlo después."
            />
            <Field
              label="Preheader"
              name="preheader"
              placeholder="Texto corto que aparece bajo el asunto."
            />
            <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
              Intro (Markdown · opcional)
              <textarea
                name="intro"
                rows={4}
                placeholder="Una o dos frases para abrir el email antes del bloque de contenido."
                className="rounded-md border border-bg3 bg-bg px-3 py-2 font-mono text-[0.85rem] text-text outline-none focus:border-river"
              />
            </label>
            <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
              Audiencia (idioma)
              <select
                name="audienceLocale"
                defaultValue=""
                className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.88rem] text-text outline-none focus:border-river"
              >
                <option value="">Todos los idiomas</option>
                {routing.locales.map((loc) => (
                  <option key={loc} value={loc}>
                    {localeLabel[loc]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-2 text-[0.82rem] text-text-2">
              <input
                type="checkbox"
                name="isPublic"
                defaultChecked
                className="mt-1 h-4 w-4 accent-river"
              />
              <span>Publicar en el archivo público una vez enviada.</span>
            </label>
          </Card>

          <Card title="Generar">
            <p className="text-[0.82rem] text-text-3">
              Crearemos un borrador en <code className="rounded bg-bg2 px-1">DRAFT</code>{" "}
              y te llevaremos al editor habitual para que lo revises y envíes.
            </p>
            <button
              type="submit"
              className="w-full rounded-md bg-river px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
            >
              Generar borrador
            </button>
          </Card>
        </div>
      </form>
    </AdminShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-bg3 bg-white p-5">
      <h2 className="mb-4 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-text-3">
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  help,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
      {label}
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none focus:border-river"
      />
      {help && (
        <span className="text-[0.74rem] font-normal text-text-3">{help}</span>
      )}
    </label>
  );
}
