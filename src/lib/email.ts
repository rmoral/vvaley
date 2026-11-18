// Email sending.
//
// Transactional email (newsletter confirmation, event registration, contact
// notifications, calendar invites) goes out over our own SMTP server with
// Nodemailer — the same setup every Level Five site uses: SMTP_HOST,
// SMTP_PORT (465 or 587), SMTP_USER, SMTP_PASS and MAIL_FROM.
//
// Bulk newsletter campaigns are the one exception: they go through Resend
// (RESEND_API_KEY) via `sendCampaignEmail`, so a large send never touches the
// reputation or rate limits of the transactional mailbox.
//
// Neither function throws: both return `{ ok: false, error }` so callers can
// count failures or carry on (the submission is already stored).

import { randomUUID } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import {
  addressOf,
  describeFailure,
  mailFrom,
  smtpConfig,
  transportOptions,
  type SmtpConfig,
} from "@/lib/email-config";

export type EmailAttachment = {
  filename: string;
  /** Plain string content (UTF-8). */
  content: string;
  contentType?: string;
};

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  /** Remitente distinto de MAIL_FROM (p. ej. hola@ para los correos a inscritos). */
  from?: string;
  /** Responder a; por defecto MAIL_REPLY_TO. */
  replyTo?: string;
};

type SendResult =
  | { ok: true; dryRun: boolean }
  | { ok: false; error: string };

let cached: { key: string; transport: Transporter } | null = null;

function transportFor(config: SmtpConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.user}`;
  if (cached?.key === key) return cached.transport;
  const transport = nodemailer.createTransport(transportOptions(config));
  cached = { key, transport };
  return transport;
}

/**
 * Without a provider: outside production the message is printed so links can
 * be copied while developing; in production nothing is printed (it would put
 * personal data in the logs) and the send counts as failed.
 */
function withoutProvider(
  missing: string,
  { to, subject, html, text, attachments, from }: SendEmailInput,
): SendResult {
  if (process.env.NODE_ENV === "production") {
    console.error(`[email] not sent, ${missing} is not configured. Subject: ${subject}`);
    return { ok: false, error: "not_configured" };
  }
  console.log(`\n──── [email · dev mode, no ${missing}] ────`);
  console.log(`From:    ${from ?? mailFrom()}`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  if (attachments && attachments.length > 0) {
    console.log(
      `Attachments: ${attachments.map((a) => `${a.filename} (${a.contentType ?? "?"})`).join(", ")}`,
    );
  }
  console.log(text ?? html);
  console.log("──────────────────────────────────────────────\n");
  return { ok: true, dryRun: true };
}

/** Transactional email, over SMTP. */
export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  let config: SmtpConfig | null;
  try {
    config = smtpConfig();
  } catch (error) {
    // Half-configured SMTP: the message names the variable, never its value.
    console.error(`[email] ${(error as Error).message}`);
    return { ok: false, error: "smtp_config" };
  }
  if (!config) return withoutProvider("SMTP", input);

  try {
    await transportFor(config).sendMail({
      from: input.from ?? config.from,
      to: input.to,
      replyTo: input.replyTo ?? config.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
      messageId: `<${randomUUID()}@${addressOf(input.from ?? config.from).split("@")[1]}>`,
    });
  } catch (error) {
    // Nodemailer errors carry the recipients; log only the technical part.
    const failure = describeFailure(error);
    console.error(`[email] SMTP error ${JSON.stringify(failure)}`);
    return { ok: false, error: `smtp_${failure.code ?? failure.responseCode ?? "error"}` };
  }
  return { ok: true, dryRun: false };
}

/** Bulk newsletter campaigns only, through Resend. */
export async function sendCampaignEmail(input: SendEmailInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return withoutProvider("RESEND_API_KEY", input);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    console.error(`[email] Resend error ${res.status}`);
    return { ok: false, error: `resend_${res.status}` };
  }
  return { ok: true, dryRun: false };
}
