// Resolve the public URL of the site for use in emails and absolute links.
// Falls back through PUBLIC_SITE_URL → NEXTAUTH_URL → localhost.
export function getSiteUrl(): string {
  // Use `||` (not `??`) so an empty string in .env falls through to the
  // next candidate instead of being treated as a valid value — a common
  // .env paste-from-template pitfall that breaks `new URL(...)` callers.
  const fromEnv =
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return fromEnv.replace(/\/$/, "");
}
