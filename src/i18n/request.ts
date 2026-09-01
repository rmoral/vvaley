import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { routing, type AppLocale } from "./routing";

function isAppLocale(value: string | undefined): value is AppLocale {
  return !!value && (routing.locales as readonly string[]).includes(value);
}

type Messages = AbstractIntlMessages;

/**
 * Deep-merge `fallback` under `primary`: every key the primary locale is
 * missing is filled in from the default locale instead of blowing up at
 * render time. Lets us ship copy in Spanish first and translate the rest
 * incrementally without leaving ca/en/fr with broken pages.
 */
function mergeMessages(fallback: Messages, primary: Messages): Messages {
  const out: Messages = { ...fallback };
  for (const [key, value] of Object.entries(primary)) {
    const base = out[key];
    if (
      base &&
      typeof base === "object" &&
      !Array.isArray(base) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      out[key] = mergeMessages(base as Messages, value as Messages);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: AppLocale = isAppLocale(requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`../messages/${locale}.json`))
    .default as Messages;

  if (locale === routing.defaultLocale) {
    return { locale, messages };
  }

  const fallback = (await import(`../messages/${routing.defaultLocale}.json`))
    .default as Messages;

  return { locale, messages: mergeMessages(fallback, messages) };
});
