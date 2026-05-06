"use client";

import { useRef, useState } from "react";

type Props = {
  /** Form field name posted with the surrounding form. */
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
  /** Hidden by default in tab-switching forms (PostForm uses display:none). */
  hidden?: boolean;
};

type UploadState = "idle" | "uploading" | "error";

/**
 * Markdown textarea + minimal toolbar. The "Insert image" button uploads
 * the chosen file to /api/admin/uploads and inserts a markdown image tag
 * at the cursor position. Drag-and-drop a file onto the textarea works
 * the same way.
 */
export function MarkdownEditor({
  name,
  label,
  defaultValue,
  rows = 12,
  hidden,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  function insertAtCursor(snippet: string) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    const next = `${before}${snippet}${after}`;
    ta.value = next;
    // Re-position cursor right after the inserted snippet.
    const pos = start + snippet.length;
    ta.setSelectionRange(pos, pos);
    ta.focus();
    // React doesn't know we mutated .value imperatively, so dispatch an event
    // to keep any listeners (and form state in the future) in sync.
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function uploadAndInsert(file: File) {
    setUpload("uploading");
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
        setUpload("error");
        setError(data?.error ?? `http_${res.status}`);
        return;
      }
      const altGuess = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      insertAtCursor(`\n\n![${altGuess}](${data.url})\n\n`);
      setUpload("idle");
    } catch (e) {
      setUpload("error");
      setError(e instanceof Error ? e.message : "network");
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 text-[0.78rem] font-medium text-text-2 ${hidden ? "hidden" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAndInsert(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={upload === "uploading"}
            className="rounded-md border border-bg3 bg-white px-3 py-1 text-[0.78rem] font-semibold text-text-2 transition-colors hover:border-river hover:text-river disabled:cursor-not-allowed disabled:opacity-60"
          >
            {upload === "uploading" ? "Subiendo…" : "📎 Insertar imagen"}
          </button>
        </div>
      </div>

      <textarea
        ref={ref}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        onDragOver={(e) => {
          if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          const file = e.dataTransfer?.files?.[0];
          if (file && file.type.startsWith("image/")) {
            e.preventDefault();
            void uploadAndInsert(file);
          }
        }}
        className="rounded-md border border-bg3 bg-bg px-3 py-2 font-mono text-[0.88rem] text-text outline-none transition-colors focus:border-river"
      />

      <span className="text-[0.74rem] font-normal text-text-3">
        Markdown: <code>**negrita**</code>, <code>[texto](url)</code>,{" "}
        <code>![alt](url)</code>. También puedes arrastrar una imagen al cuadro.
      </span>
      {upload === "error" && error && (
        <span className="text-[0.78rem] text-red-700">
          No se pudo subir: {error}
        </span>
      )}
    </div>
  );
}
