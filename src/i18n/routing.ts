import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "ca", "en", "fr"],
  defaultLocale: "es",
  // "always": every locale is in the URL (/es, /ca, /en, /fr) and "/"
  // returns a clean 307 to the default locale. We avoid the internal
  // middleware rewrite that "as-needed" triggers, which breaks behind
  // a TLS-terminating proxy (Next 15 ends up self-fetching itself as
  // https on the local HTTP port → EPROTO). Trade-off: the Spanish home
  // is /es instead of /. Same SEO story as wikipedia.org → en.wikipedia.org.
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
