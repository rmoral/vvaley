import type { ContactTopic } from "@prisma/client";
import { getSiteUrl } from "@/lib/site-url";
import { renderEmail, type EmailDetail } from "@/lib/email-layout";

// Aviso interno de un mensaje del formulario /contacto, con la plantilla
// común. Solo en castellano: lo lee el equipo, como el admin.

export const CONTACT_TOPIC_LABEL: Record<ContactTopic, string> = {
  SERVICES: "Servicios para empresas",
  GUEST: "Propuesta de invitado",
  SPONSOR: "Patrocinio",
  PRESS: "Prensa",
  OTHER: "Otro",
};

const LOCALE_NAME: Record<string, string> = {
  es: "Castellano",
  ca: "Catalán",
  en: "Inglés",
  fr: "Francés",
};

export type ContactNoticeInput = {
  topic: ContactTopic;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  message: string;
  locale?: string | null;
};

export function buildContactNotice(input: ContactNoticeInput) {
  const topic = CONTACT_TOPIC_LABEL[input.topic];
  const subject = `[Contacto] ${topic} — ${input.name}`;

  const details: EmailDetail[] = [
    { label: "Tema", value: topic },
    { label: "Nombre", value: input.name },
    { label: "Email", value: input.email, href: `mailto:${input.email}` },
  ];
  if (input.company) details.push({ label: "Empresa", value: input.company });
  if (input.phone) details.push({ label: "Teléfono", value: input.phone, href: `tel:${input.phone.replace(/[^\d+]/g, "")}` });
  if (input.locale) details.push({ label: "Idioma", value: LOCALE_NAME[input.locale] ?? input.locale });

  const { html, text } = renderEmail({
    lang: "es",
    subject,
    preheader: input.message.slice(0, 120),
    headerTag: "Aviso interno",
    eyebrow: "Nuevo mensaje de contacto",
    title: input.name,
    // Cada línea del mensaje, un párrafo: el texto se escapa en la plantilla.
    paragraphs: input.message
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean),
    details,
    cta: { label: "Ver en el admin", url: `${getSiteUrl()}/admin/contacto` },
    afterCta: ["Para contestar, responde directamente a la dirección de su email."],
    footer: {
      sign: "Valira Valley",
      note: "Aviso automático del formulario de contacto de la web.",
    },
  });
  return { subject, html, text };
}
