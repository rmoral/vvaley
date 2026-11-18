"use client";

import { useState } from "react";

/** Copia un enlace al portapapeles; si el navegador no deja, lo muestra. */
export function CopyLinkButton({ url, label }: { url: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("manual");
    }
  }

  if (state === "manual") {
    return (
      <input
        readOnly
        autoFocus
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={label}
        className="w-64 rounded-md border border-bg3 bg-bg px-2 py-1 text-[0.72rem] text-text"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={url}
      className="rounded-md border border-bg3 bg-white px-2 py-1 text-text-2 transition-colors hover:border-river hover:text-river"
    >
      {state === "copied" ? "¡Copiado!" : label}
    </button>
  );
}
