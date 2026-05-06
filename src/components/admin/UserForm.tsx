import { UserRole, type User } from "@prisma/client";

const roleLabel: Record<UserRole, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
};

const errorMessages: Record<string, string> = {
  email_taken: "Ese email ya está en uso por otro usuario.",
  cant_change_own_role: "No puedes cambiar tu propio rol.",
  cant_delete_self: "No puedes eliminarte a ti mismo.",
  last_admin: "No puedes degradar o eliminar al último administrador.",
  not_found: "El usuario no existe.",
  invalid: "Revisa los datos del formulario.",
  too_small: "La contraseña debe tener al menos 8 caracteres.",
  invalid_string: "El email no es válido.",
};

type Props = {
  user?: User | null;
  /** Current session user's id, used to disable self-mutation in the UI. */
  currentUserId: string;
  action: (formData: FormData) => Promise<void>;
  deleteAction?: (formData: FormData) => Promise<void>;
  saved?: boolean;
  error?: string;
};

export function UserForm({
  user,
  currentUserId,
  action,
  deleteAction,
  saved,
  error,
}: Props) {
  const isSelf = user?.id === currentUserId;

  return (
    <form action={action} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card title="Identidad">
          <Field
            label="Email *"
            name="email"
            type="email"
            defaultValue={user?.email ?? ""}
            required
            help="Lo usará para iniciar sesión en /admin."
          />
          <Field
            label="Nombre"
            name="name"
            defaultValue={user?.name ?? ""}
          />
        </Card>

        <Card title="Acceso">
          <Select
            label="Rol *"
            name="role"
            defaultValue={user?.role ?? UserRole.EDITOR}
            disabled={isSelf}
            options={Object.entries(roleLabel).map(([value, label]) => ({
              value,
              label,
            }))}
            help={
              isSelf
                ? "No puedes cambiar tu propio rol."
                : "ADMIN puede gestionar usuarios. EDITOR puede gestionar el contenido pero no la lista de usuarios."
            }
          />
          <Field
            label={user ? "Nueva contraseña (opcional)" : "Contraseña *"}
            name="password"
            type="password"
            required={!user}
            placeholder={user ? "Dejar en blanco para no cambiarla" : ""}
            help="Mínimo 8 caracteres."
          />
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Acciones">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.78rem] text-red-700">
              {errorMessages[error] ?? `Error: ${error}`}
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-river px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
          >
            {user ? "Guardar cambios" : "Crear usuario"}
          </button>
          {saved && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[0.78rem] text-green-700">
              Cambios guardados.
            </div>
          )}
          {user && deleteAction && !isSelf && (
            <details className="text-[0.8rem]">
              <summary className="cursor-pointer text-text-3 hover:text-text">
                Eliminar usuario
              </summary>
              <p className="mt-2 text-text-3">
                Pierde el acceso al instante. Sus posts/episodios siguen
                existiendo, pero su autoría queda como &quot;sin autor&quot;.
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
          {isSelf && (
            <p className="text-[0.78rem] text-text-3">
              Estás editando tu propia cuenta. No puedes cambiar tu rol ni
              eliminarte a ti mismo.
            </p>
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
        autoComplete={type === "password" ? "new-password" : undefined}
        className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none transition-colors focus:border-river"
      />
      {help && (
        <span className="text-[0.74rem] font-normal text-text-3">{help}</span>
      )}
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  disabled,
  options,
  help,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  disabled?: boolean;
  options: { value: string; label: string }[];
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none transition-colors focus:border-river disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && (
        <span className="text-[0.74rem] font-normal text-text-3">{help}</span>
      )}
    </label>
  );
}
