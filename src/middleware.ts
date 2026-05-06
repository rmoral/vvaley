import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The /admin tree is single-locale and not handled by next-intl.
  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Already-localised paths render directly via app/[locale]/* —
  // setRequestLocale() in those layouts reads the locale from `params`,
  // so next-intl's "set locale" rewrite is redundant here. Skipping it
  // avoids Next 15 turning that no-op rewrite into a loopback self-fetch
  // (EPROTO behind a TLS-terminating proxy, ECONNRESET locally).
  const hasLocalePrefix = routing.locales.some(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocalePrefix) {
    return NextResponse.next();
  }

  // Unprefixed path: redirect to the default locale. We build the URL
  // from the Host header rather than request.nextUrl, because Next 15's
  // middleware sets request.nextUrl.host to Node's internal bind address
  // (localhost:PORT) instead of the public host that Apache preserves.
  // Falling back to nextUrl for purely local requests where Host is
  // missing keeps `pnpm dev` happy.
  const path =
    pathname === "/"
      ? `/${routing.defaultLocale}`
      : `/${routing.defaultLocale}${pathname}`;
  const search = request.nextUrl.search;

  const headerHost = request.headers.get("host");
  if (headerHost) {
    const isLocal =
      headerHost.startsWith("localhost") ||
      headerHost.startsWith("127.") ||
      headerHost === "::1";
    const proto =
      request.headers.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
    return NextResponse.redirect(
      `${proto}://${headerHost}${path}${search}`,
      307,
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Skip Next internals, the auth API, and any file with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
