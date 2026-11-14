// Configuración del correo por SMTP (patrón común de los sitios de Level Five).
// Módulo puro: no importa Nodemailer ni `server-only`, para poder probarlo en unitarias.
//
//   SMTP_HOST   nombre del servidor (con certificado válido para ese nombre)
//   SMTP_PORT   465 (TLS implícito) o 587 (STARTTLS obligatorio)
//   SMTP_USER   buzón de envío
//   SMTP_PASS   contraseña del buzón
//   MAIL_FROM   "correo@dominio" o "Nombre <correo@dominio>" (se acepta EMAIL_FROM, el nombre anterior)
//   MAIL_REPLY_TO  opcional

export type SmtpConfig = {
  host: string;
  port: 465 | 587;
  user: string;
  pass: string;
  from: string;
  replyTo?: string;
};

type Env = Record<string, string | undefined>;

const ADDRESS = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Dirección de un buzón escrito como "correo@dominio" o "Nombre <correo@dominio>". */
export const addressOf = (mailbox: string) => (mailbox.match(/<([^>]+)>\s*$/)?.[1] ?? mailbox).trim();

const DEFAULT_FROM = "Valira Valley <noreply@valiravalley.com>";

/** Remitente: MAIL_FROM (nombre común del grupo), EMAIL_FROM (nombre anterior) o el de por defecto. */
export const mailFrom = (env: Env = process.env) => env.MAIL_FROM?.trim() || env.EMAIL_FROM?.trim() || DEFAULT_FROM;

/** Los mensajes nombran la variable y el problema, nunca su valor. */
export class MailConfigError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Configuración de correo incompleta o no válida:\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    this.name = "MailConfigError";
    this.issues = issues;
  }
}

/**
 * Lee la configuración SMTP del entorno. Devuelve `null` si no hay ninguna variable SMTP
 * (correo sin configurar) y lanza `MailConfigError` si está a medias o no es válida.
 */
export function smtpConfig(env: Env = process.env): SmtpConfig | null {
  const get = (name: string) => env[name]?.trim() ?? "";
  const names = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"] as const;
  if (names.every((n) => !get(n))) return null;

  const issues: string[] = [];
  for (const n of names) if (!get(n)) issues.push(`${n}: no está definida`);
  const from = mailFrom(env);

  const port = Number(get("SMTP_PORT"));
  if (get("SMTP_PORT") && port !== 465 && port !== 587) {
    issues.push("SMTP_PORT: debe ser 465 (TLS implícito) o 587 (STARTTLS)");
  }
  if (!ADDRESS.test(addressOf(from))) {
    issues.push("MAIL_FROM: debe ser una dirección de correo o «Nombre <correo@dominio>»");
  }
  if (get("MAIL_REPLY_TO") && !ADDRESS.test(addressOf(get("MAIL_REPLY_TO")))) {
    issues.push("MAIL_REPLY_TO: no es una dirección de correo válida");
  }
  if (issues.length) throw new MailConfigError(issues);

  return {
    host: get("SMTP_HOST"),
    port: port as 465 | 587,
    user: get("SMTP_USER"),
    // La contraseña no se recorta: puede empezar o acabar en espacio.
    pass: env.SMTP_PASS ?? "",
    from,
    replyTo: get("MAIL_REPLY_TO") || undefined,
  };
}

const TIMEOUT_MS = 10_000;

/** Opciones del transporte de Nodemailer: TLS siempre, certificado verificado. */
export function transportOptions(config: SmtpConfig) {
  const implicitTls = config.port === 465;
  return {
    host: config.host,
    port: config.port,
    secure: implicitTls, // 465: TLS desde el primer byte
    requireTLS: !implicitTls, // 587: STARTTLS obligatorio; sin él no se envía nada
    auth: { user: config.user, pass: config.pass },
    // La verificación del certificado no se desactiva nunca.
    tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" as const, servername: config.host },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  };
}

/** Sustituye cualquier dirección de correo por «[correo]» y acota la longitud. */
export const redact = (value: unknown, max = 240) =>
  typeof value === "string" ? value.replace(/[^\s<>"'(),;:]+@[^\s<>"'(),;:]+/g, "[correo]").slice(0, max) : undefined;

/** Datos técnicos de un fallo de envío, sin direcciones, nombres ni contenido. */
export function describeFailure(error: unknown) {
  const e = (error ?? {}) as {
    name?: unknown;
    code?: unknown;
    command?: unknown;
    responseCode?: unknown;
    message?: unknown;
  };
  return {
    error: typeof e.name === "string" ? e.name : "Error",
    code: typeof e.code === "string" ? e.code : undefined,
    command: typeof e.command === "string" ? e.command : undefined,
    responseCode: typeof e.responseCode === "number" ? e.responseCode : undefined,
    detail: redact(e.message, 400),
  };
}
