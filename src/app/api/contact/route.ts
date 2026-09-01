import { NextResponse } from "next/server";
import { ContactTopic } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { routing, type AppLocale } from "@/i18n/routing";

export const runtime = "nodejs";

const schema = z.object({
  topic: z.nativeEnum(ContactTopic).default(ContactTopic.OTHER),
  name: z.string().min(2).max(140),
  email: z.string().email().max(180),
  company: z
    .string()
    .max(140)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: z
    .string()
    .max(60)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: z.string().min(10).max(5000),
  locale: z.string().optional(),
  /// Honeypot: real users never see this field, bots fill everything in.
  website: z.string().max(0).optional().or(z.literal("")),
});

function asLocale(value: string | undefined): AppLocale {
  return (routing.locales as readonly string[]).includes(value ?? "")
    ? (value as AppLocale)
    : routing.defaultLocale;
}

const topicLabel: Record<ContactTopic, string> = {
  SERVICES: "Servicios para empresas",
  GUEST: "Propuesta de invitado",
  SPONSOR: "Patrocinio",
  PRESS: "Prensa",
  OTHER: "Otro",
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const data = parsed.data;

  // Honeypot tripped — pretend everything went fine so the bot doesn't
  // retry, but drop the submission.
  if (data.website) {
    return NextResponse.json({ ok: true });
  }

  const request = await prisma.contactRequest.create({
    data: {
      topic: data.topic,
      name: data.name,
      email: data.email.toLowerCase(),
      company: data.company ?? null,
      phone: data.phone ?? null,
      message: data.message,
      locale: asLocale(data.locale),
    },
    select: { id: true },
  });

  // Notify the team. Best-effort: the record is already persisted, so a
  // mail outage never loses a lead.
  const notify = process.env.CONTACT_NOTIFY_EMAIL;
  if (notify) {
    const adminUrl = `${getSiteUrl()}/admin/contacto`;
    const lines = [
      `Tema: ${topicLabel[data.topic]}`,
      `Nombre: ${data.name}`,
      `Email: ${data.email}`,
      data.company ? `Empresa: ${data.company}` : null,
      data.phone ? `Teléfono: ${data.phone}` : null,
      "",
      data.message,
      "",
      `Ver en el backoffice: ${adminUrl}`,
    ].filter(Boolean) as string[];

    await sendEmail({
      to: notify,
      subject: `[Contacto] ${topicLabel[data.topic]} — ${data.name}`,
      text: lines.join("\n"),
      html: lines
        .map((l) => (l ? `<p>${escapeHtml(l)}</p>` : "<br/>"))
        .join(""),
    }).catch(() => {
      // Swallow: the submission is stored either way.
    });
  }

  return NextResponse.json({ ok: true, id: request.id });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
