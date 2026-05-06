// Pluggable email sender.
//
// In production set RESEND_API_KEY and EMAIL_FROM to deliver real emails via
// Resend (https://resend.com). Without those env vars the helper logs the
// message to stdout — useful in dev or while the email provider isn't wired.
//
// Swap this implementation if you prefer Mailgun, SES or anything else: keep
// the `sendEmail` signature stable and the rest of the codebase won't change.

export type EmailAttachment = {
  filename: string;
  /** Plain string content (UTF-8). The helper encodes to base64 internally. */
  content: string;
  contentType?: string;
};

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Valira Valley <noreply@localhost>";

  if (!apiKey) {
    console.log("\n──── [email · dev mode, no RESEND_API_KEY] ────");
    console.log(`From:    ${from}`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    if (attachments && attachments.length > 0) {
      console.log(
        `Attachments: ${attachments.map((a) => `${a.filename} (${a.contentType ?? "?"})`).join(", ")}`,
      );
    }
    console.log(text ?? html);
    console.log("──────────────────────────────────────────────\n");
    return { ok: true as const, dryRun: true };
  }

  const payload: Record<string, unknown> = {
    from,
    to,
    subject,
    html,
    text,
  };

  if (attachments && attachments.length > 0) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "utf8").toString("base64"),
      content_type: a.contentType,
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email] Resend error ${res.status}: ${body}`);
    return { ok: false as const, error: `resend_${res.status}` };
  }
  return { ok: true as const, dryRun: false };
}
