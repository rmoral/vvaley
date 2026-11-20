"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import type { ComposeState } from "@/app/admin/_actions/event-emails";

type Action = (prev: ComposeState, formData: FormData) => Promise<ComposeState>;

export type ComposerTemplate = {
  id: string;
  name: string;
  locale: string;
  subject: string;
  body: string;
};

const field =
  "w-full rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none focus:border-river";
const label = "flex flex-col gap-1 text-[0.78rem] font-medium text-text-2";

const STATUS_OPTIONS = [
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "WAITLIST", label: "Lista de espera" },
  { value: "PENDING_PAYMENT", label: "Pendientes de pago" },
  { value: "CANCELLED", label: "Cancelados" },
] as const;

/** Qué significa cada código de fallo de envío. */
const REASON_HINT: Record<string, string> = {
  dry_run: "el servidor no está en modo producción: los correos solo se han impreso en el log",
  not_configured: "faltan las variables SMTP_* en el .env del servidor",
  smtp_config: "las variables SMTP_* están incompletas o mal (el log dice cuál)",
  smtp_EAUTH: "el servidor de correo rechaza el usuario o la contraseña",
  smtp_EENVELOPE: "el servidor de correo no acepta el remitente o el destinatario",
  from_domain: "el remitente no es una dirección @valiravalley.com (revisa EVENT_MAIL_FROM)",
  smtp_ECONNECTION: "no se puede conectar con el servidor de correo",
  smtp_ETIMEDOUT: "el servidor de correo no responde",
};

export function EventEmailComposer({
  templates,
  counts,
  unpaidCounts,
  single,
  from,
  canSend,
  previewAction,
  testAction,
  sendAction,
}: {
  templates: ComposerTemplate[];
  /** Inscripciones por estado. */
  counts: Record<string, number>;
  /** Las mismas, sin las ya pagadas: a quien va un correo con {{enlace_pago}}. */
  unpaidCounts: Record<string, number>;
  /** Si está, el correo va solo a esta persona. */
  single?: { id: string; fullName: string; email: string } | null;
  from: string;
  /** Solo ADMIN envía: los editores pueden redactar y previsualizar. */
  canSend: boolean;
  previewAction: Action;
  testAction: Action;
  sendAction: Action;
}) {
  const [templateId, setTemplateId] = useState("");
  const [locale, setLocale] = useState("es");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reason, setReason] = useState("");
  const [statuses, setStatuses] = useState<string[]>(["CONFIRMED"]);

  const [state, dispatch, pending] = useActionState<ComposeState, FormData>(
    async (prev, formData) => {
      const intent = formData.get("intent");
      if (intent === "send") return sendAction(prev, formData);
      if (intent === "test") return testAction(prev, formData);
      return previewAction(prev, formData);
    },
    {},
  );

  // Se envía a mano y no con <form action>: React 19 vacía el formulario al
  // acabar cada acción, y tras una vista previa se perdería lo escrito.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === "send") {
      const who = recipients === 1 ? "1 persona" : `${recipients} personas`;
      if (!window.confirm(`Se enviará el correo a ${who}. ¿Seguir?`)) return;
    }
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  }

  const paymentLink = /\{\{\s*enlace_pago\s*\}\}/.test(`${subject}\n${body}`);
  const shownCounts = paymentLink ? unpaidCounts : counts;
  const recipients = single ? 1 : statuses.reduce((n, s) => n + (shownCounts[s] ?? 0), 0);

  function pickTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if ((subject || body) && !window.confirm("¿Sustituir el asunto y el texto por los de la plantilla?")) {
      return;
    }
    setLocale(t.locale);
    setSubject(t.subject);
    setBody(t.body);
  }

  function toggleStatus(value: string, on: boolean) {
    setStatuses((prev) => (on ? [...prev, value] : prev.filter((s) => s !== value)));
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-bg3 bg-white p-5">
        <input type="hidden" name="templateId" value={templateId} />
        {single && <input type="hidden" name="registrationId" value={single.id} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={`${label} sm:col-span-2`}>
            Plantilla
            <select value={templateId} onChange={(e) => pickTemplate(e.target.value)} className={field}>
              <option value="">— Sin plantilla —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.locale.toUpperCase()})
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Idioma
            <select name="locale" value={locale} onChange={(e) => setLocale(e.target.value)} className={field}>
              <option value="es">Español</option>
              <option value="ca">Català</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
        </div>

        <fieldset className="rounded-md border border-bg3 px-4 py-3">
          <legend className="px-1 text-[0.78rem] font-medium text-text-2">Para</legend>
          {single ? (
            <p className="text-[0.88rem] text-text">
              {single.fullName} <span className="text-text-3">&lt;{single.email}&gt;</span>
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[0.85rem] text-text-2">
              {STATUS_OPTIONS.map((s) => (
                <label key={s.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="status"
                    value={s.value}
                    checked={statuses.includes(s.value)}
                    onChange={(e) => toggleStatus(s.value, e.target.checked)}
                  />
                  {s.label} ({shownCounts[s.value] ?? 0})
                </label>
              ))}
            </div>
          )}
          {paymentLink && (
            <p className="mt-2 text-[0.76rem] font-semibold text-river">
              Lleva enlace de pago: no se envía a quien ya ha pagado, y solo sirve a
              confirmados y pendientes de pago. Cada persona recibe el suyo.
            </p>
          )}
          <p className="mt-2 text-[0.76rem] text-text-3">
            Desde <strong className="text-text-2">{from}</strong>. Cada persona recibe su propio
            correo; nadie ve las direcciones de los demás.
          </p>
        </fieldset>

        <label className={label}>
          Asunto
          <input name="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
        </label>
        <label className={label}>
          Texto
          <textarea
            name="body"
            required
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${field} font-mono text-[0.85rem]`}
          />
        </label>
        <label className={label}>
          Motivo del correo (va en el hueco {"{{motivo}}"})
          <textarea
            name="reason"
            rows={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={field}
          />
        </label>

        {state.error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
            {state.error}
          </p>
        )}
        {state.result && <ResultNotice result={state.result} />}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            name="intent"
            value="preview"
            disabled={pending}
            className="rounded-md border border-bg3 bg-white px-4 py-2 text-[0.85rem] font-semibold text-text-2 transition-colors hover:border-river hover:text-river disabled:opacity-50"
          >
            Vista previa
          </button>
          {canSend && (
            <>
              <button
                type="submit"
                name="intent"
                value="test"
                disabled={pending}
                className="rounded-md border border-bg3 bg-white px-4 py-2 text-[0.85rem] font-semibold text-text-2 transition-colors hover:border-river hover:text-river disabled:opacity-50"
              >
                Enviarme una prueba
              </button>
              <button
                type="submit"
                name="intent"
                value="send"
                disabled={pending || recipients === 0}
                className="rounded-md bg-river px-4 py-2 text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text disabled:opacity-50"
              >
                {pending ? "Un momento…" : `Enviar a ${recipients} ${recipients === 1 ? "persona" : "personas"}`}
              </button>
            </>
          )}
        </div>
        {!canSend && (
          <p className="text-[0.76rem] text-text-3">
            Puedes redactar y ver la vista previa; enviar lo hace un administrador.
          </p>
        )}
      </form>

      <section className="rounded-lg border border-bg3 bg-white p-5">
        <h2 className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-text-3">
          Vista previa
        </h2>
        {state.preview ? (
          <>
            <p className="text-[0.8rem] text-text-3">
              Para: <span className="text-text-2">{state.preview.to}</span>
              {state.recipients != null && !single && ` · ${state.recipients} en total`}
            </p>
            <p className="mb-3 text-[0.88rem] font-semibold text-text">{state.preview.subject}</p>
            <iframe
              title="Vista previa del correo"
              srcDoc={state.preview.html}
              sandbox=""
              className="h-[46rem] w-full rounded-md border border-bg3"
            />
          </>
        ) : (
          <p className="text-[0.85rem] text-text-3">
            Pulsa «Vista previa» para ver el correo con los datos de la primera persona.
          </p>
        )}
      </section>
    </div>
  );
}

function ResultNotice({ result }: { result: NonNullable<ComposeState["result"]> }) {
  const hint = result.reason ? REASON_HINT[result.reason] : undefined;
  const ok = result.failed === 0;
  return (
    <div
      role="status"
      className={`rounded-md border px-3 py-2 text-[0.8rem] ${
        ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <p className="font-semibold">
        {result.test
          ? ok
            ? "Prueba enviada a tu correo."
            : "No se ha podido enviar la prueba."
          : `Enviados: ${result.sent}. Fallidos: ${result.failed}.`}
      </p>
      {result.reason && (
        <p className="mt-1">
          <code>{result.reason}</code>
          {hint ? ` — ${hint}` : ""}
        </p>
      )}
    </div>
  );
}
