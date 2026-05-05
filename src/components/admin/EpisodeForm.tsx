import { EpisodePillar, EpisodeStatus, type Episode } from "@prisma/client";

type GuestOption = { id: string; fullName: string; company: string | null };

type Props = {
  episode?: (Episode & { guests: { guestId: string }[] }) | null;
  allGuests: GuestOption[];
  action: (formData: FormData) => Promise<void>;
  deleteAction?: (formData: FormData) => Promise<void>;
  saved?: boolean;
};

const pillarLabel: Record<EpisodePillar, string> = {
  ECONOMY: "Economía",
  COMPANY: "Empresa",
  ENTREPRENEURSHIP: "Emprendimiento",
  TECH: "Tecnología & IA",
};

const statusLabel: Record<EpisodeStatus, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programado",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

export function EpisodeForm({
  episode,
  allGuests,
  action,
  deleteAction,
  saved,
}: Props) {
  const selectedGuestIds = new Set(episode?.guests.map((g) => g.guestId) ?? []);
  const publishedAtValue = episode?.publishedAt
    ? new Date(episode.publishedAt).toISOString().slice(0, 16)
    : "";
  const durationMin =
    episode?.durationSec != null ? Math.round(episode.durationSec / 60) : "";

  return (
    <form action={action} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card title="Datos del episodio">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
            <Field
              label="Número"
              name="number"
              type="number"
              defaultValue={episode?.number?.toString() ?? ""}
            />
            <Field
              label="Título *"
              name="title"
              defaultValue={episode?.title ?? ""}
              required
            />
          </div>
          <Field
            label="Subtítulo"
            name="subtitle"
            defaultValue={episode?.subtitle ?? ""}
          />
          <Field
            label="Slug (URL)"
            name="slug"
            defaultValue={episode?.slug ?? ""}
            placeholder="se-genera-desde-el-titulo"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Pilar"
              name="pillar"
              defaultValue={episode?.pillar ?? ""}
              options={[
                { value: "", label: "— Sin pilar —" },
                ...Object.entries(pillarLabel).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <Field
              label="Duración (min)"
              name="durationMin"
              type="number"
              defaultValue={String(durationMin)}
            />
          </div>
        </Card>

        <Card title="Contenido">
          <Textarea
            label="Resumen"
            name="summary"
            rows={4}
            defaultValue={episode?.summary ?? ""}
          />
          <Textarea
            label="Show notes"
            name="showNotes"
            rows={10}
            defaultValue={episode?.showNotes ?? ""}
          />
        </Card>

        <Card title="Recursos">
          <Field
            label="URL del audio (MP3)"
            name="audioUrl"
            type="url"
            defaultValue={episode?.audioUrl ?? ""}
            placeholder="https://"
          />
          <Field
            label="URL de la portada"
            name="coverImageUrl"
            type="url"
            defaultValue={episode?.coverImageUrl ?? ""}
            placeholder="https://"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Spotify"
              name="spotifyUrl"
              type="url"
              defaultValue={episode?.spotifyUrl ?? ""}
            />
            <Field
              label="Apple Podcasts"
              name="appleUrl"
              type="url"
              defaultValue={episode?.appleUrl ?? ""}
            />
            <Field
              label="YouTube"
              name="youtubeUrl"
              type="url"
              defaultValue={episode?.youtubeUrl ?? ""}
            />
          </div>
        </Card>

        <Card title="Invitados">
          {allGuests.length === 0 ? (
            <p className="text-[0.85rem] text-text-3">
              No hay invitados creados todavía. Crea uno desde la sección
              Invitados antes de asignarlo a un episodio.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {allGuests.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-2 rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.85rem]"
                >
                  <input
                    type="checkbox"
                    name="guestIds"
                    value={g.id}
                    defaultChecked={selectedGuestIds.has(g.id)}
                  />
                  <span className="text-text">
                    {g.fullName}
                    {g.company && (
                      <span className="text-text-3"> · {g.company}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Publicación">
          <Select
            label="Estado"
            name="status"
            defaultValue={episode?.status ?? EpisodeStatus.DRAFT}
            options={Object.entries(statusLabel).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Field
            label="Fecha de publicación"
            name="publishedAt"
            type="datetime-local"
            defaultValue={publishedAtValue}
            help="Si dejas en blanco y publicas, se usa la fecha de hoy."
          />
        </Card>

        <Card title="Acciones">
          <button
            type="submit"
            className="w-full rounded-md bg-river px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
          >
            {episode ? "Guardar cambios" : "Crear episodio"}
          </button>
          {saved && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[0.78rem] text-green-700">
              Cambios guardados.
            </div>
          )}
          {episode && deleteAction && (
            <details className="text-[0.8rem]">
              <summary className="cursor-pointer text-text-3 hover:text-text">
                Eliminar episodio
              </summary>
              <p className="mt-2 text-text-3">
                Se borra el episodio y se desvincula a sus invitados.
              </p>
              <button
                type="submit"
                formAction={deleteAction}
                className="mt-3 w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.82rem] font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-100"
              >
                Eliminar definitivamente
              </button>
            </details>
          )}
        </Card>
      </div>
    </form>
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
  type = "text",
  defaultValue,
  required,
  placeholder,
  help,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none transition-colors focus:border-river"
      />
      {help && <span className="text-[0.74rem] font-normal text-text-3">{help}</span>}
    </label>
  );
}

function Textarea({
  label,
  name,
  rows = 5,
  defaultValue,
}: {
  label: string;
  name: string;
  rows?: number;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
      {label}
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none transition-colors focus:border-river"
      />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none transition-colors focus:border-river"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
