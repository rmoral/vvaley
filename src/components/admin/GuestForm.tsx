import type { Guest } from "@prisma/client";

type Props = {
  guest?: Guest | null;
  action: (formData: FormData) => Promise<void>;
  deleteAction?: (formData: FormData) => Promise<void>;
  saved?: boolean;
};

export function GuestForm({ guest, action, deleteAction, saved }: Props) {
  return (
    <form action={action} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card title="Identidad">
          <Field label="Nombre completo *" name="fullName" defaultValue={guest?.fullName ?? ""} required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cargo" name="role" defaultValue={guest?.role ?? ""} />
            <Field label="Empresa" name="company" defaultValue={guest?.company ?? ""} />
          </div>
          <Field
            label="Titular / Headline"
            name="headline"
            defaultValue={guest?.headline ?? ""}
            help="Una frase que resume el perfil. Aparece bajo el nombre."
          />
          <Field
            label="Slug (URL)"
            name="slug"
            defaultValue={guest?.slug ?? ""}
            placeholder="se-genera-desde-el-nombre"
          />
        </Card>

        <Card title="Bio">
          <Textarea
            label="Biografía"
            name="bio"
            rows={8}
            defaultValue={guest?.bio ?? ""}
          />
        </Card>

        <Card title="Contacto y redes">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" name="email" type="email" defaultValue={guest?.email ?? ""} />
            <Field label="Web" name="website" type="url" defaultValue={guest?.website ?? ""} placeholder="https://" />
            <Field label="LinkedIn" name="linkedin" defaultValue={guest?.linkedin ?? ""} />
            <Field label="X / Twitter" name="twitter" defaultValue={guest?.twitter ?? ""} />
            <Field label="Instagram" name="instagram" defaultValue={guest?.instagram ?? ""} />
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Foto">
          <Field
            label="URL de la foto"
            name="photoUrl"
            type="url"
            defaultValue={guest?.photoUrl ?? ""}
            placeholder="https://"
            help="De momento se gestiona por URL. La subida con S3 se añadirá en una próxima iteración."
          />
        </Card>

        <Card title="Acciones">
          <button
            type="submit"
            className="w-full rounded-md bg-river px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
          >
            {guest ? "Guardar cambios" : "Crear invitado"}
          </button>
          {saved && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[0.78rem] text-green-700">
              Cambios guardados.
            </div>
          )}
          {guest && deleteAction && (
            <details className="text-[0.8rem]">
              <summary className="cursor-pointer text-text-3 hover:text-text">
                Eliminar invitado
              </summary>
              <p className="mt-2 text-text-3">
                Al eliminar, se desvincula de los episodios pero los episodios
                no se borran.
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
