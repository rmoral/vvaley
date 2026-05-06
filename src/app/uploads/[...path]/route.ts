import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = join(process.cwd(), "public", "uploads");

const CONTENT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/**
 * Serve files saved to public/uploads/ at runtime. We need a real route
 * handler because `next start` snapshots public/ at boot and doesn't
 * pick up files added later (which is exactly what /api/admin/uploads
 * does).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  if (!Array.isArray(path) || path.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const target = normalize(join(ROOT, ...path));
  // Defence in depth: refuse traversal outside ROOT.
  if (!target.startsWith(ROOT + sep) && target !== ROOT) {
    return new Response("Forbidden", { status: 403 });
  }

  let file: Buffer;
  try {
    file = await readFile(target);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = (target.match(/\.[^.\\/]+$/)?.[0] ?? "").toLowerCase();
  const type = CONTENT_TYPE[ext] ?? "application/octet-stream";

  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
