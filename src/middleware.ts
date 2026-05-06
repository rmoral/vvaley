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

  // Unprefixed path: redirect to the default locale. We build the redirect
  // URL from request.nextUrl (which honours the Host header preserved by
  // Apache via ProxyPreserveHost), so the browser follows it on the public
  // domain instead of being sent to Node's internal listening address.
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/"
    ? `/${routing.defaultLocale}`
    : `/${routing.defaultLocale}${pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Skip Next internals, the auth API, and any file with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
