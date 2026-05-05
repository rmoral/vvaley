// Resolve the public URL of the site for use in emails and absolute links.
// Falls back through PUBLIC_SITE_URL → NEXTAUTH_URL → localhost.
export function getSiteUrl(): string {
  const fromEnv =
    process.env.PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  return fromEnv.replace(/\/$/, "");
}
