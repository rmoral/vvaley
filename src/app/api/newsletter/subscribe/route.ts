import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { buildConfirmEmail } from "@/lib/newsletter-emails";
import { routing, type AppLocale } from "@/i18n/routing";

const schema = z.object({
  email: z.string().email().max(180),
  name: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  locale: z.string().optional(),
  source: z.string().max(60).optional(),
});

function asLocale(value: string | undefined): AppLocale {
  return (routing.locales as readonly string[]).includes(value ?? "")
    ? (value as AppLocale)
    : routing.defaultLocale;
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const locale = asLocale(parsed.data.locale);
  const name = parsed.data.name?.trim() || null;
  const source = parsed.data.source?.trim() || null;

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });

  // Already confirmed → no-op, success.
  if (existing && existing.status === "CONFIRMED") {
    return NextResponse.json({ ok: true, status: "already_confirmed" });
  }

  const confirmToken = randomToken();
  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email },
    update: {
      name,
      locale,
      source: source ?? existing?.source ?? null,
      status: "PENDING",
      confirmToken,
      unsubscribedAt: null,
    },
    create: {
      email,
      name,
      locale,
      status: "PENDING",
      confirmToken,
      source,
    },
  });

  const confirmUrl = `${getSiteUrl()}/api/newsletter/confirm?token=${subscriber.confirmToken}`;
  const mail = buildConfirmEmail(locale, confirmUrl);

  await sendEmail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  return NextResponse.json({ ok: true, status: "pending" });
}
