import type { EventEmailTemplate } from "@prisma/client";
import { MESSAGE_PLACEHOLDERS } from "@/lib/event-message-emails";

const field =
  "w-full rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none focus:border-river";
const label = "flex flex-col gap-1 text-[0.78rem] font-medium text-text-2";

const errorText: Record<string, string> = {
  missing: "Faltan el nombre, el asunto o el texto.",
  unknown_placeholder:
    "Hay algún hueco que no existe (revisa que esté escrito igual que en la lista).",
};

/** Formulario de plantilla de correo a inscritos (crear y editar). */
export function EventEmailTemplateForm({
  template,
  action,
  deleteAction,
  saved,
  error,
}: {
  template?: EventEmailTemplate | null;
  action: (formData: FormData) => Promise<void>;
  deleteAction?: () => Promise<void>;
  saved?: boolean;
  error?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <form action={action} className="space-y-4 rounded-lg border border-bg3 bg-white p-5 lg:col-span-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={`${label} sm:col-span-2`}>
            Nombre de la plantilla (solo lo ve el equipo)
            <input name="name" required defaultValue={template?.name} className={field} />
          </label>
          <label className={label}>
            Idioma
            <select name="locale" defaultValue={template?.locale ?? "es"} className={field}>
              <option value="es">Español</option>
              <option value="ca">Català</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
        </div>
        <label className={label}>
          Asunto
          <input
            name="subject"
            required
            defaultValue={template?.subject}
            placeholder="{{evento}}: cambio de horario"
            className={field}
          />
        </label>
        <label className={label}>
          Texto
          <textarea
            name="body"
            required
            rows={14}
            defaultValue={template?.body}
            placeholder={"Hola, {{nombre}}:\n\nTe escribimos por {{evento}}, el {{fecha}}.\n\n{{motivo}}\n\nUn abrazo,"}
            className={`${field} font-mono text-[0.85rem]`}
          />
          <span className="text-[0.74rem] font-normal text-text-3">
            Una línea en blanco separa párrafos. Los enlaces se convierten en clicables.
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
            {errorText[error] ?? error}
          </p>
        )}
        {saved && (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[0.8rem] text-green-700">
            Plantilla guardada.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-md bg-river px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
          >
            Guardar plantilla
          </button>
        </div>
      </form>

      <aside className="space-y-5">
        <PlaceholderHelp />
        {deleteAction && (
          <form action={deleteAction} className="rounded-lg border border-bg3 bg-white p-5">
            <p className="mb-3 text-[0.8rem] text-text-2">
              Borrar la plantilla no borra el historial de envíos hechos con ella.
            </p>
            <button
              type="submit"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[0.8rem] text-red-700 transition-colors hover:border-red-400 hover:bg-red-100"
            >
              Borrar plantilla
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}

/** Lista de huecos con su significado. */
export function PlaceholderHelp() {
  return (
    <div className="rounded-lg border border-bg3 bg-white p-5">
      <h2 className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-text-3">
        Huecos
      </h2>
      <dl className="space-y-2 text-[0.8rem]">
        {Object.entries(MESSAGE_PLACEHOLDERS).map(([name, description]) => (
          <div key={name}>
            <dt>
              <code className="rounded bg-bg2 px-1 text-text">{`{{${name}}}`}</code>
            </dt>
            <dd className="text-text-3">{description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
