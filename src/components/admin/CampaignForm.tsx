"use client";

import { useState } from "react";
import { CampaignStatus, type Campaign } from "@prisma/client";
import { routing } from "@/i18n/routing";
import { MarkdownEditor } from "./MarkdownEditor";

type Props = {
  campaign?: Campaign | null;
  /** Number of CONFIRMED subscribers per locale, used to show the audience size. */
  audienceCounts: { all: number; perLocale: Record<string, number> };
  action: (formData: FormData) => Promise<void>;
  sendAction?: (formData: FormData) => Promise<void>;
  deleteAction?: (formData: FormData) => Promise<void>;
  saved?: boolean;
  sent?: boolean;
  error?: string;
};

const errorMessages: Record<string, string> = {
  already_sent: "Esta campaña ya se envió y no puede modificarse.",
  not_found: "La campaña no existe.",
  no_subscribers: "No hay suscriptores confirmados para esta audiencia.",
};

const localeLabel: Record<string, string> = {
  es: "Español",
  ca: "Català",
  en: "English",
  fr: "Français",
};

export function CampaignForm({
  campaign,
  audienceCounts,
  action,
  sendAction,
  deleteAction,
  saved,
  sent,
  error,
}: Props) {
  const [audienceLocale, setAudienceLocale] = useState(
    campaign?.audienceLocale ?? "",
  );

  const audienceSize =
    audienceLocale === ""
      ? audienceCounts.all
      : (audienceCounts.perLocale[audienceLocale] ?? 0);

  const isDraft = !campaign || campaign.status === CampaignStatus.DRAFT;

  return (
    <form action={action} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card title="Mensaje">
          <Field
            label="Asunto *"
            name="subject"
            defaultValue={campaign?.subject ?? ""}
            required
            disabled={!isDraft}
          />
          <Field
            label="Preheader (preview que aparece en la bandeja)"
            name="preheader"
            defaultValue={campaign?.preheader ?? ""}
            disabled={!isDraft}
            help="Aparece bajo el asunto en la mayoría de clientes. 80–110 caracteres ideal."
          />
          <MarkdownEditor
            label="Cuerpo (Markdown)"
            name="bodyMarkdown"
            rows={18}
            defaultValue={campaign?.bodyMarkdown ?? ""}
          />
          <p className="text-[0.74rem] text-text-3">
            Placeholders disponibles:{" "}
            <code className="rounded bg-bg2 px-1">{"{{name}}"}</code>,{" "}
            <code className="rounded bg-bg2 px-1">{"{{email}}"}</code>,{" "}
            <code className="rounded bg-bg2 px-1">{"{{unsubscribe_url}}"}</code>.
            El enlace de baja se añade siempre al pie del email.
          </p>
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Audiencia">
          <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
            Idioma
            <select
              name="audienceLocale"
              value={audienceLocale}
              onChange={(e) => setAudienceLocale(e.target.value)}
              disabled={!isDraft}
              className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none focus:border-river disabled:opacity-60"
            >
              <option value="">Todos los idiomas</option>
              {routing.locales.map((loc) => (
                <option key={loc} value={loc}>
                  {localeLabel[loc] ?? loc}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-md bg-bg2 px-3 py-2 text-[0.85rem] text-text-2">
            <strong className="text-text">{audienceSize}</strong>{" "}
            {audienceSize === 1 ? "suscriptor" : "suscriptores"} confirmados.
          </div>
          <label className="flex items-start gap-2 text-[0.82rem] text-text-2">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked={campaign?.isPublic ?? true}
              className="mt-1 h-4 w-4 accent-river"
            />
            <span>
              Publicar en el archivo público una vez enviada.
              <span className="block text-[0.74rem] text-text-3">
                Desmarca para campañas internas.
              </span>
            </span>
          </label>
        </Card>

        <Card title="Estado">
          {campaign ? (
            <>
              <StatusPill status={campaign.status} />
              {campaign.sentAt && (
                <div className="text-[0.82rem] text-text-3">
                  Enviada el{" "}
                  {new Intl.DateTimeFormat("es", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(campaign.sentAt)}
                </div>
              )}
              {campaign.recipients > 0 && (
                <div className="text-[0.82rem] text-text-3">
                  Enviadas: {campaign.delivered} / {campaign.recipients}
                  {campaign.failed > 0 && ` · ${campaign.failed} fallidas`}
                </div>
              )}
            </>
          ) : (
            <div className="text-[0.82rem] text-text-3">
              Se guardará como borrador. Podrás enviarla cuando estés listo.
            </div>
          )}
        </Card>

        <Card title="Acciones">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.78rem] text-red-700">
              {errorMessages[error] ?? `Error: ${error}`}
            </div>
          )}
          {saved && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[0.78rem] text-green-700">
              Cambios guardados.
            </div>
          )}
          {sent && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[0.78rem] text-green-700">
              Campaña enviada.
            </div>
          )}
          {isDraft && (
            <button
              type="submit"
              className="w-full rounded-md bg-river px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
            >
              {campaign ? "Guardar borrador" : "Crear borrador"}
            </button>
          )}
          {campaign && isDraft && sendAction && (
            <details className="text-[0.8rem]">
              <summary className="cursor-pointer text-river hover:text-text">
                Enviar a {audienceSize}{" "}
                {audienceSize === 1 ? "suscriptor" : "suscriptores"}
              </summary>
              <p className="mt-2 text-text-3">
                Esta acción es definitiva: se enviarán los emails uno a uno.
                Asegúrate de haber revisado el contenido.
              </p>
              <button
                type="submit"
                formAction={sendAction}
                disabled={audienceSize === 0}
                className="mt-3 w-full rounded-md bg-river px-3 py-2 text-[0.85rem] font-semibold text-white transition-colors hover:bg-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirmar envío a {audienceSize}{" "}
                {audienceSize === 1 ? "persona" : "personas"}
              </button>
            </details>
          )}
          {campaign && deleteAction && isDraft && (
            <details className="text-[0.8rem]">
              <summary className="cursor-pointer text-text-3 hover:text-text">
                Eliminar borrador
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

function StatusPill({ status }: { status: CampaignStatus }) {
  const labels: Record<CampaignStatus, string> = {
    DRAFT: "Borrador",
    SENDING: "Enviando…",
    SENT: "Enviada",
    FAILED: "Con errores",
  };
  const cls: Record<CampaignStatus, string> = {
    DRAFT: "bg-bg2 text-text-2",
    SENDING: "bg-amber-50 text-amber-700",
    SENT: "bg-[rgba(39,117,119,0.1)] text-river",
    FAILED: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-block w-fit rounded-md px-2 py-0.5 text-[0.78rem] font-semibold ${cls[status]}`}
    >
      {labels[status]}
    </span>
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
  required,
  disabled,
  help,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
      {label}
      <input
        name={name}
        type="text"
        required={required}
        disabled={disabled}
        defaultValue={defaultValue}
        className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none transition-colors focus:border-river disabled:opacity-60"
      />
      {help && (
        <span className="text-[0.74rem] font-normal text-text-3">{help}</span>
      )}
    </label>
  );
}
