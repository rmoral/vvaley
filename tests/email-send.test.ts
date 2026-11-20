import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sendEmail } from "@/lib/email";

/**
 * El envío nunca rompe la petición de quien usa la web: un fallo del servidor
 * de correo se devuelve como código, se registra sin direcciones ni contenido
 * y la petición sigue. Se prueba contra un puerto local cerrado (sin red).
 */

const env = {
  SMTP_HOST: "localhost",
  SMTP_PORT: "587",
  SMTP_USER: "usuario-smtp",
  SMTP_PASS: "secreto",
  MAIL_FROM: "Valira Valley <noreply@valiravalley.com>",
};

async function withEnv<T>(vars: Record<string, string>, fn: () => Promise<T>) {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.assign(process.env, vars);
  const logs: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void logs.push(args.map(String).join(" "));
  try {
    return { result: await fn(), logs };
  } finally {
    console.error = original;
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe("sendEmail", () => {
  it("si el servidor no responde, devuelve el fallo sin lanzar ni registrar direcciones", async () => {
    const { result, logs } = await withEnv(env, () =>
      sendEmail({ to: "ana@cliente.com", replyTo: "visitante@gmail.com", subject: "Hola", html: "<p>x</p>" }),
    );
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.error : "", /^smtp_/);
    const log = logs.join("\n");
    assert.match(log, /\[email\] SMTP error/);
    assert.doesNotMatch(log, /ana@cliente\.com|visitante@gmail\.com|secreto|usuario-smtp/);
  });

  it("un From fuera del dominio de envío no sale", async () => {
    const { result } = await withEnv(env, () =>
      sendEmail({ to: "ana@cliente.com", from: "Otro <otro@gmail.com>", subject: "Hola", html: "<p>x</p>" }),
    );
    assert.deepEqual(result, { ok: false, error: "from_domain" });
  });
});
