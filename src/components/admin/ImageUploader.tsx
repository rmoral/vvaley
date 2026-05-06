"use client";

import { useState, useRef } from "react";

type Props = {
  /** Form field name posted with the surrounding form. */
  name: string;
  label: string;
  defaultValue?: string | null;
  help?: string;
};

type State = "idle" | "uploading" | "error";

/**
 * Drop-in replacement for a plain URL input. Shows a preview, lets you
 * upload a new file (which posts to /api/admin/uploads and writes the
 * returned URL into a hidden input under `name`) and keeps the URL
 * editable as a fallback when you want to point at an external host.
 */
export function ImageUploader({ name, label, defaultValue, help }: Props) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onPickFile(file: File) {
    setState("uploading");
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; url?: string; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.url) {
        setState("error");
        setError(data?.error ?? `http_${res.status}`);
        return;
      }
      setUrl(data.url);
      setState("idle");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "network");
    }
  }

  return (
    <div className="flex flex-col gap-2 text-[0.78rem] font-medium text-text-2">
      <span>{label}</span>

      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="max-h-48 w-full rounded-md border border-bg3 bg-bg2 object-contain"
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPickFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={state === "uploading"}
          className="rounded-md border border-bg3 bg-white px-3 py-1.5 text-[0.82rem] font-semibold text-text-2 transition-colors hover:border-river hover:text-river disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "uploading"
            ? "Subiendo…"
            : url
              ? "Reemplazar imagen"
              : "Subir imagen"}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="rounded-md border border-bg3 bg-white px-3 py-1.5 text-[0.82rem] text-text-3 hover:border-red-300 hover:text-red-700"
          >
            Quitar
          </button>
        )}
      </div>

      <input
        type="url"
        name={name}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="rounded-md border border-bg3 bg-bg px-3 py-2 font-mono text-[0.82rem] text-text outline-none transition-colors focus:border-river"
      />

      {help && <span className="text-[0.74rem] font-normal text-text-3">{help}</span>}
      {state === "error" && error && (
        <span className="text-[0.78rem] text-red-700">
          No se pudo subir: {error}
        </span>
      )}
    </div>
  );
}
