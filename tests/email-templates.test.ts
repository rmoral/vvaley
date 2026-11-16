import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderEmail, escapeHtml } from "@/lib/email-layout";
import { emailCopy } from "@/lib/email-copy";
import {
  buildPaidTeamNotice,
  buildRegistrationEmail,
  formatEventWhen,
  registrationReference,
} from "@/lib/event-registration-emails";
import { buildConfirmEmail } from "@/lib/newsletter-emails";
import { renderCampaign } from "@/lib/campaign-emails";
import { allEmailSamples, sampleEvent, sampleRegistration } from "@/lib/email-samples";
import { routing } from "@/i18n/routing";
import esMsgs from "@/messages/es.json";
import caMsgs from "@/messages/ca.json";
import enMsgs from "@/messages/en.json";
import frMsgs from "@/messages/fr.json";

/**
 * Plantilla común de los correos (dirección «A · Cabecera tinta»). Lo que no
 * se ve a simple vista y conviene fijar: que nada de lo que escribe un
 * visitante entra en el HTML sin escapar, que todo enlace es absoluto, que
 * cada idioma tiene su texto y que ningún hueco sale como «undefined».
 */

process.env.PUBLIC_SITE_URL = "https://valiravalley.com";

const event = {
  ...sampleEvent(),
  startsAt: new Date("2026-12-03T17:00:00Z"),
  endsAt: new Date("2026-12-03T19:30:00Z"),
  translations: [
    { locale: "es", title: "Open Mic: negocios al desnudo" },
    { locale: "en", title: "Open Mic: business laid bare" },
  ],
};

describe("renderEmail", () => {
  it("escapa todo el texto", () => {
    const { html } = renderEmail({
      lang: "es",
      subject: "<b>asunto</b>",
      headerTag: "Eventos",
      title: '<script>alert("x")</script>',
      paragraphs: ["Hola & <img src=x onerror=alert(1)>"],
      details: [{ label: "Nombre", value: "<i>Ana</i>" }],
      footer: { sign: "Firma", note: "Nota" },
    });
    assert.ok(!html.includes("<script>alert"));
    assert.ok(!html.includes("<img src=x"));
    assert.ok(!html.includes("<i>Ana</i>"));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes("Hola &amp;"));
  });

  it("descarta enlaces con esquemas peligrosos", () => {
    const { html } = renderEmail({
      lang: "es",
      subject: "s",
      headerTag: "t",
      title: "t",
      details: [{ label: "x", value: "clic", href: "javascript:alert(1)" }],
      cta: { label: "Botón", url: "javascript:alert(1)" },
      footer: { sign: "f", note: "n" },
    });
    assert.ok(!html.includes("javascript:"));
  });

  it("logo PNG y enlace a la web con URL absoluta", () => {
    const { html } = renderEmail({
      lang: "es",
      subject: "s",
      headerTag: "t",
      title: "t",
      footer: { sign: "f", note: "n" },
    });
    assert.ok(html.includes('src="https://valiravalley.com/email/logo-invert@2x.png"'));
    assert.ok(html.includes('href="https://valiravalley.com"'));
    assert.ok(!html.includes(".svg"));
  });

  it("escapeHtml cubre las comillas", () => {
    assert.equal(escapeHtml(`"'<>&`), "&quot;&#39;&lt;&gt;&amp;");
  });
});

describe("correos de inscripción", () => {
  it("pagada: título, fecha y hora en la zona del evento, importe y referencia", () => {
    const reg = { ...sampleRegistration("es"), id: "cmabcdefgh12345678", fullName: "Ana López" };
    const mail = buildRegistrationEmail({
      locale: "es",
      event,
      registration: reg,
      kind: "confirmed",
      paid: { cents: 3000, currency: "EUR" },
    });
    assert.equal(mail.subject, "Inscripción confirmada: Open Mic: negocios al desnudo");
    assert.ok(mail.html.includes("Jueves, 3 de diciembre de 2026"));
    assert.ok(mail.html.includes("18:00 – 20:30"), "hora de Andorra, no UTC");
    assert.ok(mail.html.includes("30,00"));
    assert.ok(mail.html.includes(registrationReference(reg.id)));
    assert.ok(mail.html.includes("Hola, Ana:"));
    assert.ok(mail.text.includes("Importe pagado: 30,00"));
    assert.ok(mail.html.includes("https://valiravalley.com/es/eventos/evento-de-ejemplo"));
  });

  it("lista de espera: asunto propio, sin importe ni «¿No puedes venir?»", () => {
    const mail = buildRegistrationEmail({
      locale: "es",
      event,
      registration: sampleRegistration("es"),
      kind: "waitlist",
    });
    assert.ok(mail.subject.startsWith("Lista de espera:"));
    assert.ok(!mail.html.includes("Importe pagado"));
    assert.ok(!mail.html.includes("No puedes venir"));
  });

  it("usa el título traducido y cae a castellano si falta", () => {
    const en = buildRegistrationEmail({ locale: "en", event, registration: sampleRegistration("en"), kind: "confirmed" });
    const fr = buildRegistrationEmail({ locale: "fr", event, registration: sampleRegistration("fr"), kind: "confirmed" });
    assert.ok(en.subject.includes("Open Mic: business laid bare"));
    assert.ok(fr.subject.includes("Open Mic: negocios al desnudo"));
  });

  it("formatEventWhen sin hora de fin da solo el inicio", () => {
    const { hours } = formatEventWhen({ ...event, endsAt: null }, "es");
    assert.equal(hours, "18:00");
  });

  it("aviso al equipo: avisa si la inscripción no estaba confirmada", () => {
    const ok = buildPaidTeamNotice({ event, registration: sampleRegistration("es"), paid: { cents: 3000, currency: "EUR" } });
    const raro = buildPaidTeamNotice({
      event,
      registration: { ...sampleRegistration("es"), status: "CANCELLED" },
      paid: { cents: 3000, currency: "EUR" },
    });
    assert.ok(!ok.html.includes("revisa si hay que reactivarla"));
    assert.ok(raro.html.includes("revisa si hay que reactivarla"));
    assert.ok(ok.html.includes("/admin/eventos/sample-event/inscripciones"));
  });
});

describe("newsletter y campañas", () => {
  it("confirmación con botón y enlace de respaldo", () => {
    const url = "https://valiravalley.com/api/newsletter/confirm?token=abc";
    const mail = buildConfirmEmail("ca", url);
    assert.equal(mail.subject, "Confirma la teva subscripció a Valira Valley");
    assert.ok(mail.html.split(url).length >= 3, "botón + enlace de respaldo");
  });

  it("campaña: cuerpo Markdown, nombre y baja en el idioma del suscriptor", () => {
    const mail = renderCampaign(
      { subject: "Hola {{name}}", preheader: null, bodyMarkdown: "Texto **fuerte**" },
      { email: "a@b.c", name: "Ana", locale: "en", confirmToken: "tok" },
    );
    assert.equal(mail.subject, "Hola Ana");
    assert.ok(mail.html.includes("<strong>fuerte</strong>"));
    assert.ok(mail.html.includes("/api/newsletter/unsubscribe?token=tok"));
    assert.ok(mail.html.includes(">Unsubscribe<"));
    assert.ok(mail.text.includes("Unsubscribe: https://valiravalley.com/api/newsletter/unsubscribe?token=tok"));
  });
});

describe("textos e integridad", () => {
  it("cada idioma tiene todas las claves de los correos", () => {
    // Las que faltan caerían a castellano; aquí se exige que no falte ninguna.
    const byLocale = { es: esMsgs, ca: caMsgs, en: enMsgs, fr: frMsgs } as Record<
      string,
      { emails?: Record<string, Record<string, string>> }
    >;
    for (const locale of routing.locales) {
      for (const [section, keys] of Object.entries(esMsgs.emails)) {
        for (const key of Object.keys(keys)) {
          assert.ok(byLocale[locale].emails?.[section]?.[key], `${locale}: falta emails.${section}.${key}`);
        }
      }
    }
    assert.equal(emailCopy("ca", "registration")("cta"), "Veure l'esdeveniment");
  });

  it("ningún correo de ejemplo deja huecos sin rellenar", () => {
    for (const locale of routing.locales) {
      for (const s of allEmailSamples(locale)) {
        assert.ok(!/undefined|null|NaN|\{\w+\}/.test(s.html.replace(/\{[^}]*;[^}]*\}/g, "")), `${locale}/${s.id}`);
        assert.ok(s.subject.length > 0);
      }
    }
  });
});
