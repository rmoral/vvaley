import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The /admin tree is single-locale and not handled by next-intl.
  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Skip the intl middleware when the URL already carries a locale prefix.
  // Otherwise next-intl issues an internal rewrite to the same URL, which
  // Next.js 15 resolves via a loopback self-fetch — and that breaks behind
  // a TLS-terminating proxy (EPROTO) or just deadlocks on itself
  // (ECONNRESET on http://localhost:PORT/<locale>). The page tree at
  // app/[locale]/* receives `params.locale` directly, so setRequestLocale()
  // in the layouts has everything it needs.
  const hasLocalePrefix = routing.locales.some(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocalePrefix) {
    return NextResponse.next();
  }

  // Unprefixed paths still go through next-intl: "/" → 307 to /es,
  // unknown paths → not-found via the [locale] segment.
  return intlMiddleware(request);
}

export const config = {
  // Skip Next internals, the auth API, and any file with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
