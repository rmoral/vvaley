"use client";

import { useState } from "react";
import type { SocialAccount } from "@prisma/client";
import { ImageUploader } from "./ImageUploader";

type Props = {
  accounts: SocialAccount[];
  initial?: {
    body: string;
    sourceUrl: string | null;
    mediaUrls: string[];
    accountIds: string[];
    scheduledAt?: Date | null;
  };
  /** Disable everything except the publish button (already-saved publication). */
  readOnly?: boolean;
  action: (formData: FormData) => Promise<void>;
};

const toLocalInput = (d: Date | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 16) : "";

export function PublicationForm({ accounts, initial, readOnly, action }: Props) {
  const [body, setBody] = useState(initial?.body ?? "");

  return (
    <form action={action} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card title="Mensaje">
          <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
            Texto
            <textarea
              name="body"
              rows={10}
              required
              disabled={readOnly}
              defaultValue={initial?.body ?? ""}
              onChange={(e) => setBody(e.target.value)}
              className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.95rem] leading-[1.6] text-text outline-none focus:border-river disabled:opacity-60"
              placeholder="Escribe la publicación tal cual aparecerá en la red social…"
            />
            <span className="text-[0.74rem] text-text-3">
              {body.length} caracteres
            </span>
          </label>
          <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
            URL de origen (opcional)
            <input
              type="url"
              name="sourceUrl"
              disabled={readOnly}
              defaultValue={initial?.sourceUrl ?? ""}
              placeholder="https://valiravalley.com/podcast/..."
              className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none focus:border-river disabled:opacity-60"
            />
            <span className="text-[0.74rem] text-text-3">
              Si la rellenas, se añade al final del cuerpo en cada plataforma.
            </span>
          </label>
        </Card>

        <Card title="Imagen (opcional)">
          {/* Usamos un único uploader; LinkedIn permite varias imágenes pero
              empezamos con una para mantener la UI sencilla. */}
          <ImageUploader
            label="Imagen adjunta"
            name="mediaUrls"
            defaultValue={initial?.mediaUrls?.[0] ?? ""}
            help="Sube una imagen y se enviará junto al post."
          />
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Cuentas destino">
          {accounts.length === 0 ? (
            <p className="text-[0.85rem] text-text-3">
              No hay cuentas conectadas. Conecta una en Redes sociales antes
              de publicar.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.85rem]"
                >
                  <input
                    type="checkbox"
                    name="accountIds"
                    value={a.id}
                    disabled={readOnly}
                    defaultChecked={
                      initial?.accountIds?.includes(a.id) ?? !readOnly
                    }
                  />
                  <span className="text-text">
                    {a.displayName}
                    <span className="ml-2 text-[0.74rem] uppercase text-text-3">
                      {a.provider}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </Card>

        <Card title="Programación">
          <label className="flex flex-col gap-1 text-[0.78rem] font-medium text-text-2">
            Fecha y hora de envío (opcional)
            <input
              type="datetime-local"
              name="scheduledAt"
              defaultValue={toLocalInput(initial?.scheduledAt)}
              disabled={readOnly}
              className="rounded-md border border-bg3 bg-bg px-3 py-2 text-[0.92rem] text-text outline-none focus:border-river disabled:opacity-60"
            />
            <span className="text-[0.74rem] text-text-3">
              Si la rellenas, la publicación pasa a <strong>Programada</strong> y
              el worker la envía cuando llegue la hora. Si la dejas en blanco,
              se queda como borrador y la envías a mano con &quot;Publicar
              ahora&quot;.
            </span>
          </label>
        </Card>

        <Card title="Acciones">
          {!readOnly && (
            <button
              type="submit"
              className="w-full rounded-md bg-river px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-0.5 hover:bg-text"
            >
              Guardar
            </button>
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
