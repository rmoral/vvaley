"use client";

import { useState } from "react";
import {
  PostStatus,
  type Post,
  type PostTag,
  type PostTranslation,
  type Tag,
} from "@prisma/client";
import { routing, type AppLocale } from "@/i18n/routing";
import { tagsToString } from "@/lib/tags";
import { ImageUploader } from "./ImageUploader";
import { MarkdownEditor } from "./MarkdownEditor";
import { faqToText } from "@/lib/faq";

const localeLabel: Record<AppLocale, string> = {
  es: "Español",
  ca: "Català",
  en: "English",
  fr: "Français",
};

const statusLabel: Record<PostStatus, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programado",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

type Props = {
  post?:
    | (Post & {
        translations: PostTranslation[];
        tags: (PostTag & { tag: Tag })[];
      })
    | null;
  action: (formData: FormData) => Promise<void>;
  deleteAction?: (formData: FormData) => Promise<void>;
  saved?: boolean;
  error?: string;
};

export function PostForm({ post, action, deleteAction, saved, error }: Props) {
  const [activeLocale, setActiveLocale] = useState<AppLocale>(routing.defaultLocale);

  const translationFor = (loc: AppLocale) =>
    post?.translations.find((t) => t.locale === loc) ?? null;

  const publishedAtValue = post?.publishedAt
    ? new Date(post.publishedAt).toISOString().slice(0, 16)
    : "";

  return (
    <form action={action} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card title="Contenido por idioma">
          <div className="mb-4 flex flex-wrap gap-1 border-b border-bg3">
            {routing.locales.map((loc) => {
              const tr = translationFor(loc);
              const filled = !!tr?.title;
              return (
                <button
                  type="button"
                  key={loc}
                  onClick={() => setActiveLocale(loc)}
                  className={`-mb-px border-b-2 px-3 py-2 text-[0.82rem] transition-colors ${
                    activeLocale === loc
                      ? "border-river text-river"
                      : "border-transparent text-text-3 hover:text-text"
                  }`}
                >
                  {localeLabel[loc]}
                  <span
                    className={`ml-2 inline-block h-1.5 w-1.5 rounded-full ${filled ? "bg-river" : "bg-bg3"}`}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>

          {routing.locales.map((loc) => {
            const tr = translationFor(loc);
            const isActive = activeLocale === loc;
            return (
              <div key={loc} className={isActive ? "flex flex-col gap-4" : "hidden"}>
                <Field
                  label="Título"
                  name={`title_${loc}`}
                  defaultValue={tr?.title ?? ""}
                  required={loc === routing.defaultLocale}
                  help={
                    loc === routing.defaultLocale
                      ? "El idioma por defecto es obligatorio. Los demás se completan según se traduzcan."
                      : undefined
                  }
                />
                <Field
                  label="Resumen"
                  name={`summary_${loc}`}
                  defaultValue={tr?.summary ?? ""}
                />
                <MarkdownEditor
                  label="Cuerpo (Markdown)"
                  name={`body_${loc}`}
                  rows={16}
                  defaultValue={tr?.body ?? ""}
                  hidden={!isActive}
                />

                <Field
                  label="Alt de la portada"
                  name={`coverImageAlt_${loc}`}
                  defaultValue={tr?.coverImageAlt ?? ""}
                  help="Qué se ve en la imagen. Lo lee quien no puede verla."
                />

                <details className="rounded-md border border-bg3 bg-bg2 px-3 py-2">
                  <summary className="cursor-pointer text-[0.78rem] font-medium text-text-2">
                    SEO y preguntas frecuentes
                  </summary>
                  <div className="mt-4 flex flex-col gap-4">
                    <Field
                      label="Título SEO"
                      name={`seoTitle_${loc}`}
                      defaultValue={tr?.seoTitle ?? ""}
                      help="El que sale en Google, máximo 60 caracteres. En blanco usa el título."
                    />
                    <Field
                      label="Meta description"
                      name={`metaDescription_${loc}`}
                      defaultValue={tr?.metaDescription ?? ""}
                      help="Entre 140 y 158 caracteres. En blanco usa el resumen."
                    />
                    <SeoTextarea
                      label="Preguntas frecuentes"
                      name={`faq_${loc}`}
                      rows={10}
                      defaultValue={faqToText(tr?.faq)}
                      help="Un bloque por pregunta, separados por una línea en blanco. La primera línea es la pregunta y el resto, la respuesta."
                    />
                  </div>
                </details>
              </div>
            );
          })}
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Publicación">
          <Select
            label="Estado"
            name="status"
            defaultValue={post?.status ?? PostStatus.DRAFT}
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
          <Field
            label="Slug (URL)"
            name="slug"
            defaultValue={post?.slug ?? ""}
            placeholder="se-genera-desde-el-titulo"
          />
          <ImageUploader
            label="Portada"
            name="coverImageUrl"
            defaultValue={post?.coverImageUrl ?? ""}
            help="Sube una imagen o pega una URL externa."
          />
          <Field
            label="Etiquetas"
            name="tags"
            defaultValue={tagsToString(post?.tags.map((t) => t.tag) ?? [])}
            placeholder="ia, andorra, startups"
            help="Lista separada por comas. Se crean automáticamente."
          />
        </Card>

        <Card title="Acciones">
          {error === "missing_title" && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.78rem] text-red-700">
              Necesitas al menos un título en cualquier idioma.
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-river px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
          >
            {post ? "Guardar cambios" : "Crear post"}
          </button>
          {saved && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[0.78rem] text-green-700">
              Cambios guardados.
            </div>
          )}
          {post && deleteAction && (
            <details className="text-[0.8rem]">
              <summary className="cursor-pointer text-text-3 hover:text-text">
                Eliminar post
              </summary>
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

// Textarea de los campos SEO. No usa MarkdownEditor porque aquí no hay
// markdown: es texto plano con bloques separados por línea en blanco.
function SeoTextarea({
  label,
  name,
  rows = 8,
  defaultValue,
  help,
}: {
  label: string;
  name: string;
  rows?: number;
  defaultValue?: string;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
      {label}
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.9rem] leading-[1.5] text-text outline-none transition-colors focus:border-river"
      />
      {help && <span className="text-[0.74rem] font-normal text-text-3">{help}</span>}
    </label>
  );
}
