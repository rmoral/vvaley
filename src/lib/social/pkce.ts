import { createHash, randomBytes } from "crypto";

/**
 * RFC 7636 PKCE helpers. Used by providers (X, TikTok) that require
 * proof-of-possession on the OAuth code exchange.
 */
export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(
    createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge };
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
