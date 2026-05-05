// Pluggable email sender.
//
// In production set RESEND_API_KEY and EMAIL_FROM to deliver real emails via
// Resend (https://resend.com). Without those env vars the helper logs the
// message to stdout — useful in dev or while the email provider isn't wired.
//
// Swap this implementation if you prefer Mailgun, SES or anything else: keep
// the `sendEmail` signature stable and the rest of the codebase won't change.

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Valira Valley <noreply@localhost>";

  if (!apiKey) {
    console.log("\n──── [email · dev mode, no RESEND_API_KEY] ────");
    console.log(`From:    ${from}`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text ?? html);
    console.log("──────────────────────────────────────────────\n");
    return { ok: true as const, dryRun: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email] Resend error ${res.status}: ${body}`);
    return { ok: false as const, error: `resend_${res.status}` };
  }
  return { ok: true as const, dryRun: false };
}
