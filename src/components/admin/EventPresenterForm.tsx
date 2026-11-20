import type { EventPresenter, EventPresenterTranslation } from "@prisma/client";
import { ImageUploader } from "./ImageUploader";

const field =
  "w-full rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none focus:border-river";
const label = "flex flex-col gap-1 text-[0.78rem] font-medium text-text-2";

const LOCALES = [
  { code: "es", name: "Castellano" },
  { code: "ca", name: "Català" },
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
] as const;

/** Alta o edición de una empresa que presenta en el evento. */
export function EventPresenterForm({
  presenter,
  action,
  deleteAction,
  submitLabel,
}: {
  presenter?: EventPresenter & { translations: EventPresenterTranslation[] };
  action: (formData: FormData) => Promise<void>;
  deleteAction?: () => Promise<void>;
  submitLabel: string;
}) {
  const description = (locale: string) =>
    presenter?.translations.find((t) => t.locale === locale)?.description ?? "";

  return (
    <div className="rounded-lg border border-bg3 bg-white p-5" id={presenter ? `p-${presenter.id}` : "nuevo"}>
      <form action={action} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <label className={`${label} sm:col-span-3`}>
              Nombre de la empresa o proyecto
              <input name="name" required defaultValue={presenter?.name} className={field} />
            </label>
            <label className={label}>
              Orden
              <input
                name="position"
                type="number"
                defaultValue={presenter?.position ?? 0}
                className={field}
              />
            </label>
          </div>
          <label className={label}>
            Enlace del logo
            <input
              name="url"
              defaultValue={presenter?.url ?? ""}
              placeholder="https://empresa.com, empresa.com o @perfil_de_instagram"
              className={field}
            />
            <span className="text-[0.74rem] font-normal text-text-3">
              Web, Instagram, LinkedIn… lo que os den. «@algo» se entiende como un perfil de Instagram.
            </span>
          </label>
          <fieldset className="space-y-3">
            <legend className="text-[0.78rem] font-medium text-text-2">
              Descripción breve (una o dos frases). Si falta un idioma, se muestra la de castellano.
            </legend>
            {LOCALES.map((l) => (
              <label key={l.code} className={label}>
                {l.name}
                <textarea
                  name={`description_${l.code}`}
                  rows={2}
                  maxLength={600}
                  defaultValue={description(l.code)}
                  className={field}
                />
              </label>
            ))}
          </fieldset>
        </div>
        <div className="space-y-4">
          <ImageUploader
            name="logoUrl"
            label="Logo"
            defaultValue={presenter?.logoUrl}
            help="Mejor PNG o SVG con fondo transparente. Si no hay logo, se muestran las iniciales."
          />
          <button
            type="submit"
            className="w-full rounded-md bg-river px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
          >
            {submitLabel}
          </button>
        </div>
      </form>
      {deleteAction && (
        <form action={deleteAction} className="mt-4 border-t border-bg3 pt-4 text-right">
          <button
            type="submit"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[0.8rem] text-red-700 transition-colors hover:border-red-400 hover:bg-red-100"
          >
            Quitar de la sección
          </button>
        </form>
      )}
    </div>
  );
}
