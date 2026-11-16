import es from "@/messages/es.json";
import ca from "@/messages/ca.json";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import { routing, type AppLocale } from "@/i18n/routing";

// Textos de los correos públicos, del namespace «emails» de src/messages.
// Se leen aquí y no con next-intl porque los correos salen fuera de una
// petición (webhooks, server actions, scripts). Si a un idioma le falta una
// clave, se usa la de castellano, igual que en la web.

type EmailMessages = typeof es.emails;
type Section = keyof EmailMessages;

const ALL: Record<AppLocale, { emails?: Partial<EmailMessages> }> = { es, ca, en, fr };

export function asEmailLocale(value: string | null | undefined): AppLocale {
  return (routing.locales as readonly string[]).includes(value ?? "")
    ? (value as AppLocale)
    : routing.defaultLocale;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? vars[key] : match,
  );
}

/**
 * Traductor de una sección: `t("subject_confirmed", { title })`.
 * Clave inexistente en el idioma → castellano.
 */
export function emailCopy<S extends Section>(locale: AppLocale, section: S) {
  const base = es.emails[section] as Record<string, string>;
  const local = (ALL[locale]?.emails?.[section] ?? {}) as Record<string, string>;
  return (key: keyof EmailMessages[S] & string, vars: Record<string, string> = {}) =>
    interpolate(local[key] ?? base[key] ?? key, vars);
}
