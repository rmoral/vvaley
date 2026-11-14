/**
 * Comprueba el SMTP (conexión, TLS y autenticación) y envía un correo de
 * prueba al propio buzón remitente, o a la dirección que se pase.
 *
 *   pnpm mail:test [correo@dominio.com]
 *
 * Lee `.env`. No imprime credenciales ni direcciones: solo el resultado o el
 * error exacto del servidor o de TLS.
 */
import nodemailer from "nodemailer";
import { addressOf, describeFailure, smtpConfig, transportOptions } from "../src/lib/email-config";

async function main() {
  const config = smtpConfig();
  if (!config) throw new Error("Faltan las variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y MAIL_FROM.");
  console.log(
    `Servidor SMTP: puerto ${config.port} (${config.port === 465 ? "TLS implícito" : "STARTTLS obligatorio"}), verificación de certificado activada.`,
  );
  const transport = nodemailer.createTransport(transportOptions(config));
  await transport.verify();
  console.log("verify(): conexión, TLS y autenticación correctas.");
  const info = await transport.sendMail({
    from: config.from,
    to: process.argv[2] ?? addressOf(config.from),
    subject: "Prueba de correo SMTP",
    text: "Correo de prueba enviado con `pnpm mail:test`. Si lo lees, el envío por SMTP funciona.",
  });
  console.log(
    `Correo de prueba enviado. Aceptados: ${info.accepted.length}, rechazados: ${info.rejected.length}. Respuesta: ${info.response}`,
  );
}

main().catch((error: unknown) => {
  console.error("La prueba de correo ha fallado.");
  console.error((error as Error)?.name === "MailConfigError" ? (error as Error).message : describeFailure(error));
  process.exit(1);
});
