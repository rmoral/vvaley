"use client";

import { useState } from "react";
import {
  EventLocationType,
  EventStatus,
  type Event,
  type EventTranslation,
} from "@prisma/client";
import { routing, type AppLocale } from "@/i18n/routing";

const localeLabel: Record<AppLocale, string> = {
  es: "Español",
  ca: "Català",
  en: "English",
  fr: "Français",
};

const statusLabel: Record<EventStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  CANCELLED: "Cancelado",
  COMPLETED: "Finalizado",
};

const locationLabel: Record<EventLocationType, string> = {
  INPERSON: "Presencial",
  ONLINE: "Online",
  HYBRID: "Híbrido",
};

type Props = {
  event?: (Event & { translations: EventTranslation[] }) | null;
  action: (formData: FormData) => Promise<void>;
  deleteAction?: (formData: FormData) => Promise<void>;
  saved?: boolean;
  error?: string;
};

const toLocalInput = (d: Date | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 16) : "";

export function EventForm({
  event,
  action,
  deleteAction,
  saved,
  error,
}: Props) {
  const [activeLocale, setActiveLocale] = useState<AppLocale>(
    routing.defaultLocale,
  );
  const [locationType, setLocationType] = useState<EventLocationType>(
    event?.locationType ?? EventLocationType.INPERSON,
  );

  const translationFor = (loc: AppLocale) =>
    event?.translations.find((t) => t.locale === loc) ?? null;

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
              <div
                key={loc}
                className={isActive ? "flex flex-col gap-4" : "hidden"}
              >
                <Field
                  label="Título"
                  name={`title_${loc}`}
                  defaultValue={tr?.title ?? ""}
                  required={loc === routing.defaultLocale}
                />
                <Field
                  label="Resumen corto"
                  name={`summary_${loc}`}
                  defaultValue={tr?.summary ?? ""}
                />
                <Textarea
                  label="Descripción (Markdown)"
                  name={`description_${loc}`}
                  rows={12}
                  defaultValue={tr?.description ?? ""}
                />
              </div>
            );
          })}
        </Card>

        <Card title="Cuándo">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Inicio *"
              name="startsAt"
              type="datetime-local"
              defaultValue={toLocalInput(event?.startsAt)}
              required
            />
            <Field
              label="Fin"
              name="endsAt"
              type="datetime-local"
              defaultValue={toLocalInput(event?.endsAt)}
            />
          </div>
          <Field
            label="Zona horaria (IANA)"
            name="timezone"
            defaultValue={event?.timezone ?? "Europe/Andorra"}
            help="Por ejemplo: Europe/Andorra, Europe/Madrid, UTC."
          />
        </Card>

        <Card title="Dónde">
          <Select
            label="Tipo de evento"
            name="locationType"
            defaultValue={locationType}
            onChange={(v) => setLocationType(v as EventLocationType)}
            options={Object.entries(locationLabel).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          {(locationType === "INPERSON" || locationType === "HYBRID") && (
            <>
              <Field
                label="Sede / venue"
                name="venueName"
                defaultValue={event?.venueName ?? ""}
                placeholder="Caldea, Andorra la Vella…"
              />
              <Field
                label="Dirección"
                name="venueAddress"
                defaultValue={event?.venueAddress ?? ""}
              />
            </>
          )}
          {(locationType === "ONLINE" || locationType === "HYBRID") && (
            <Field
              label="URL de conexión"
              name="onlineUrl"
              type="url"
              defaultValue={event?.onlineUrl ?? ""}
              placeholder="https://"
              help="La URL se muestra a los inscritos confirmados después de registrarse."
            />
          )}
        </Card>

        <Card title="Inscripciones">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Aforo"
              name="capacity"
              type="number"
              defaultValue={event?.capacity?.toString() ?? ""}
              help="Vacío = sin límite."
            />
            <Field
              label="Apertura"
              name="registrationOpensAt"
              type="datetime-local"
              defaultValue={toLocalInput(event?.registrationOpensAt)}
            />
            <Field
              label="Cierre"
              name="registrationClosesAt"
              type="datetime-local"
              defaultValue={toLocalInput(event?.registrationClosesAt)}
            />
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Publicación">
          <Select
            label="Estado"
            name="status"
            defaultValue={event?.status ?? EventStatus.DRAFT}
            options={Object.entries(statusLabel).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Field
            label="Slug (URL)"
            name="slug"
            defaultValue={event?.slug ?? ""}
            placeholder="se-genera-desde-el-titulo"
          />
          <Field
            label="URL de la portada"
            name="coverImageUrl"
            type="url"
            defaultValue={event?.coverImageUrl ?? ""}
            placeholder="https://"
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
            {event ? "Guardar cambios" : "Crear evento"}
          </button>
          {saved && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[0.78rem] text-green-700">
              Cambios guardados.
            </div>
          )}
          {event && deleteAction && (
            <details className="text-[0.8rem]">
              <summary className="cursor-pointer text-text-3 hover:text-text">
                Eliminar evento
              </summary>
              <p className="mt-2 text-text-3">
                Borra el evento y todas sus inscripciones.
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
      {help && (
        <span className="text-[0.74rem] font-normal text-text-3">{help}</span>
      )}
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
        className="rounded-md border border-bg3 bg-bg px-3 py-2 font-mono text-[0.88rem] text-text outline-none transition-colors focus:border-river"
      />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
  onChange,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
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
