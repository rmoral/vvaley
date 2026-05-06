import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

export type UploadResult =
  | { ok: true; url: string; filename: string; size: number; contentType: string }
  | { ok: false; error: string };

function sanitiseFilename(name: string): string {
  // Strip path separators and characters that don't survive on filesystems.
  return name
    .replace(/[/\\]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Persist an uploaded file under public/uploads/YYYY/MM/<random>-<name> and
 * return the public URL (`/uploads/...`). Files in `public/` are served as
 * static assets by Next.js, so the URL is reachable from the browser.
 */
export async function saveUpload(file: File): Promise<UploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: `unsupported_type:${file.type}` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "too_large" };
  }
  if (file.size === 0) {
    return { ok: false, error: "empty" };
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");

  const ext = extname(file.name) || EXT_BY_TYPE[file.type] || "";
  const baseName = sanitiseFilename(file.name.replace(ext, "")) || "image";
  const filename = `${randomUUID()}-${baseName}${ext}`;

  const root = join(process.cwd(), "public", "uploads", yyyy, mm);
  await mkdir(root, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(root, filename), buffer);

  return {
    ok: true,
    url: `/uploads/${yyyy}/${mm}/${filename}`,
    filename: file.name,
    size: file.size,
    contentType: file.type,
  };
}
