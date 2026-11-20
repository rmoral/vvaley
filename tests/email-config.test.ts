import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addressOf,
  describeFailure,
  eventMessageFrom,
  isSenderDomain,
  MailConfigError,
  mailFrom,
  redact,
  smtpConfig,
  transportOptions,
} from "@/lib/email-config";

// Dominio de envío de ejemplo: así los casos prueban también MAIL_FROM_DOMAIN.
const base = {
  SMTP_HOST: "mail.example.com",
  SMTP_PORT: "465",
  SMTP_USER: "hola@example.com",
  SMTP_PASS: "secreto",
  MAIL_FROM: "Valira Valley <hola@example.com>",
  MAIL_FROM_DOMAIN: "example.com",
};

describe("configuración SMTP", () => {
  it("sin variables SMTP no hay configuración", () => {
    assert.equal(smtpConfig({}), null);
    assert.equal(smtpConfig({ MAIL_FROM: base.MAIL_FROM, MAIL_FROM_DOMAIN: "example.com" }), null);
  });

  it("lee una configuración completa", () => {
    assert.deepEqual(smtpConfig({ ...base, MAIL_REPLY_TO: "socios@example.com" }), {
      host: "mail.example.com",
      port: 465,
      user: "hola@example.com",
      pass: "secreto",
      from: "Valira Valley <hola@example.com>",
      replyTo: "socios@example.com",
    });
  });

  it("una configuración a medias es un error que nombra la variable, no su valor", () => {
    assert.throws(
      () => smtpConfig({ ...base, SMTP_PASS: "", MAIL_FROM: "no-es-un-correo", SMTP_PORT: "25" }),
      (e: unknown) => {
        assert.ok(e instanceof MailConfigError);
        assert.match(e.message, /SMTP_PASS: no está definida \(vale también SMTP_PASSWORD\)/);
        assert.match(e.message, /SMTP_PORT: debe ser 465/);
        assert.match(e.message, /MAIL_FROM: debe ser/);
        assert.doesNotMatch(e.message, /no-es-un-correo/);
        return true;
      },
    );
  });

  it("465 usa TLS implícito y 587 exige STARTTLS; el certificado siempre se verifica", () => {
    const tls465 = transportOptions(smtpConfig(base)!);
    assert.equal(tls465.secure, true);
    assert.equal(tls465.requireTLS, false);
    const tls587 = transportOptions(smtpConfig({ ...base, SMTP_PORT: "587" })!);
    assert.equal(tls587.secure, false);
    assert.equal(tls587.requireTLS, true);
    for (const o of [tls465, tls587]) {
      assert.deepEqual(o.tls, { rejectUnauthorized: true, minVersion: "TLSv1.2", servername: "mail.example.com" });
    }
  });

  it("el registro de fallos no lleva direcciones de correo", () => {
    assert.equal(addressOf("Valira Valley <hola@example.com>"), "hola@example.com");
    assert.equal(redact("550 <ana@cliente.com> rechazado"), "550 <[correo]> rechazado");
    const failure = describeFailure(Object.assign(new Error("RCPT ana@cliente.com denegado"), { code: "EENVELOPE", responseCode: 550 }));
    assert.equal(failure.code, "EENVELOPE");
    assert.equal(failure.responseCode, 550);
    assert.equal(failure.detail, "RCPT [correo] denegado");
  });

  it("el remitente es MAIL_FROM, o EMAIL_FROM (nombre anterior), o el de por defecto", () => {
    assert.equal(mailFrom({ MAIL_FROM: "A <a@example.com>", EMAIL_FROM: "B <b@example.com>" }), "A <a@example.com>");
    assert.equal(mailFrom({ EMAIL_FROM: "B <b@example.com>" }), "B <b@example.com>");
    assert.equal(mailFrom({}), "Valira Valley <noreply@valiravalley.com>");
    const { MAIL_FROM, ...rest } = base;
    assert.equal(smtpConfig({ ...rest, EMAIL_FROM: MAIL_FROM })?.from, MAIL_FROM);
  });
});

describe("Amazon SES", () => {
  const ses = {
    SMTP_HOST: "email-smtp.eu-west-1.amazonaws.com",
    SMTP_PORT: "587",
    SMTP_USER: "AKIAEXAMPLEUSER",
    SMTP_PASSWORD: "contraseña-smtp",
    MAIL_FROM: "noreply@valiravalley.com",
    MAIL_FROM_NAME: "Valira Valley",
  };

  it("lee la configuración de SES con SMTP_PASSWORD y MAIL_FROM_NAME", () => {
    const config = smtpConfig(ses)!;
    assert.equal(config.host, "email-smtp.eu-west-1.amazonaws.com");
    assert.equal(config.port, 587);
    assert.equal(config.pass, "contraseña-smtp");
    assert.equal(config.from, "Valira Valley <noreply@valiravalley.com>");
    assert.equal(transportOptions(config).requireTLS, true);
  });

  it("SMTP_PASS manda sobre SMTP_PASSWORD", () => {
    assert.equal(smtpConfig({ ...ses, SMTP_PASS: "la-buena" })!.pass, "la-buena");
  });

  it("MAIL_FROM_NAME no pisa un nombre que ya venga en MAIL_FROM", () => {
    assert.equal(mailFrom({ MAIL_FROM: "Eventos <hola@valiravalley.com>", MAIL_FROM_NAME: "Otro" }), "Eventos <hola@valiravalley.com>");
    assert.equal(mailFrom({ MAIL_FROM: "hola@valiravalley.com", MAIL_FROM_NAME: 'Valira "VV" <x>' }), "Valira VV x <hola@valiravalley.com>");
  });

  it("un remitente fuera de @valiravalley.com es un error de configuración", () => {
    assert.throws(
      () => smtpConfig({ ...ses, MAIL_FROM: "Valira <valira@gmail.com>" }),
      (e: unknown) => {
        assert.ok(e instanceof MailConfigError);
        assert.match(e.message, /MAIL_FROM: el remitente debe ser una dirección @valiravalley\.com/);
        assert.doesNotMatch(e.message, /gmail/);
        return true;
      },
    );
    assert.equal(isSenderDomain("Valira <hola@valiravalley.com>", {}), true);
    assert.equal(isSenderDomain("hola@valiravalley.com.evil.com", {}), false);
    assert.equal(isSenderDomain("hola@VALIRAVALLEY.com", {}), true);
  });

  it("EVENT_MAIL_FROM de otro dominio se ignora y se usa hola@", () => {
    assert.equal(eventMessageFrom({ EVENT_MAIL_FROM: "Eventos <eventos@valiravalley.com>" }), "Eventos <eventos@valiravalley.com>");
    assert.equal(eventMessageFrom({ EVENT_MAIL_FROM: "hola@gmail.com" }), "Valira Valley <hola@valiravalley.com>");
  });
});
