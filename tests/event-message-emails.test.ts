import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildEventMessage,
  fillPlaceholders,
  MESSAGE_PLACEHOLDERS,
  placeholderValues,
  plainTextToHtml,
  unknownPlaceholders,
  usesPlaceholder,
} from "@/lib/event-message-emails";
import { eventMessageFrom } from "@/lib/email-config";
import { sampleEvent } from "@/lib/email-samples";

/**
 * Correos que el equipo escribe a los inscritos desde una plantilla con
 * huecos. Lo que hay que fijar: que cada hueco se rellena con los datos de la
 * persona, que una errata en un hueco se detecta antes de enviar y que nada de
 * lo escrito (por el equipo o por quien se inscribió) entra sin escapar.
 */

process.env.PUBLIC_SITE_URL = "https://valiravalley.com";

const event = {
  ...sampleEvent(),
  slug: "open-mic",
  startsAt: new Date("2026-12-03T17:00:00Z"),
  endsAt: new Date("2026-12-03T19:30:00Z"),
  timezone: "Europe/Andorra",
  locationType: "INPERSON" as const,
  venueName: "Sala Valira",
  venueAddress: "Av. Meritxell 1, Andorra la Vella",
  translations: [
    { locale: "es", title: "Open Mic: negocios al desnudo" },
    { locale: "en", title: "Open Mic: business laid bare" },
  ],
};

const person = { id: "cmabcdefgh12345678", fullName: "Marta Puig Soler", company: null };

describe("huecos", () => {
  it("detecta los que no existen", () => {
    assert.deepEqual(unknownPlaceholders("Hola {{nombe}}", "{{ evento }} {{motivo}}"), ["nombe"]);
    assert.deepEqual(unknownPlaceholders("{{nombre}} {{fecha}}"), []);
  });

  it("sabe si se usa {{motivo}}", () => {
    assert.equal(usesPlaceholder("motivo", "a", "b {{ motivo }}"), true);
    assert.equal(usesPlaceholder("motivo", "{{nombre}}"), false);
  });

  it("rellena todos con datos de la persona y del evento", () => {
    const v = placeholderValues(event, person, "es", "  Cambiamos de sala.  ");
    assert.equal(v.nombre, "Marta");
    assert.equal(v.nombre_completo, "Marta Puig Soler");
    assert.equal(v.empresa, "");
    assert.equal(v.evento, "Open Mic: negocios al desnudo");
    assert.equal(v.fecha, "jueves, 3 de diciembre de 2026");
    assert.equal(v.hora, "18:00 – 20:30");
    assert.equal(v.lugar, "Sala Valira, Av. Meritxell 1, Andorra la Vella");
    assert.equal(v.enlace_evento, "https://valiravalley.com/es/eventos/open-mic");
    assert.equal(v.referencia, "VV-12345678");
    assert.equal(v.motivo, "Cambiamos de sala.");
    for (const key of Object.keys(MESSAGE_PLACEHOLDERS)) assert.ok(key in v, key);
  });

  it("formatea en el idioma de la plantilla", () => {
    const v = placeholderValues(event, person, "en", "");
    assert.equal(v.evento, "Open Mic: business laid bare");
    assert.match(v.fecha, /December 3, 2026/);
  });

  it("deja tal cual lo que no es un hueco", () => {
    const v = placeholderValues(event, person, "es", "");
    assert.equal(fillPlaceholders("{{nombre}} {{otro}} {sueltas}", v), "Marta {{otro}} {sueltas}");
  });
});

describe("plainTextToHtml", () => {
  it("párrafos, saltos de línea y enlaces, todo escapado", () => {
    const html = plainTextToHtml("Hola <b>Marta</b>\nqué tal\n\n\nMás en https://valiravalley.com/es.");
    assert.equal(
      html,
      '<p>Hola &lt;b&gt;Marta&lt;/b&gt;<br>qué tal</p>\n<p>Más en <a href="https://valiravalley.com/es">https://valiravalley.com/es</a>.</p>',
    );
  });
});

describe("buildEventMessage", () => {
  const message = buildEventMessage({
    event,
    registration: { ...person, fullName: "<script>x</script> Puig" },
    locale: "es",
    subject: "{{evento}}: {{motivo}}",
    body: "Hola, {{nombre}}:\n\n{{motivo}}\n\nTu referencia es {{referencia}}.",
    reason: "Cambio de sala\ny de hora",
  });

  it("personaliza asunto y cuerpo", () => {
    assert.equal(message.subject, "Open Mic: negocios al desnudo: Cambio de sala y de hora");
    assert.match(message.text, /VV-12345678/);
    assert.match(message.html, /Cambio de sala<br>y de hora/);
  });

  it("escapa lo que escribió quien se inscribió", () => {
    assert.ok(!message.html.includes("<script>x"));
    assert.ok(message.html.includes("&lt;script&gt;x&lt;/script&gt;"));
  });

  it("no deja huecos ni undefined", () => {
    assert.ok(!/\{\{|undefined/.test(message.html));
    assert.ok(!/\{\{|undefined/.test(message.text));
  });
});

describe("eventMessageFrom", () => {
  it("por defecto sale de hola@valiravalley.com", () => {
    assert.equal(eventMessageFrom({}), "Valira Valley <hola@valiravalley.com>");
  });
  it("respeta EVENT_MAIL_FROM y descarta un valor no válido", () => {
    assert.equal(eventMessageFrom({ EVENT_MAIL_FROM: "Eventos <eventos@valiravalley.com>" }), "Eventos <eventos@valiravalley.com>");
    assert.equal(eventMessageFrom({ EVENT_MAIL_FROM: "no-es-correo" }), "Valira Valley <hola@valiravalley.com>");
  });
});
