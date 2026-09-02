import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "@/lib/markdown";
import { parseFaq, parseFaqText, faqToText } from "@/lib/faq";
import { parseRelatedLinks } from "@/lib/related-links";
import { canonicalTagSlug, canonicalTagName } from "@/lib/tag-taxonomy";
import { pillarFromTags } from "@/lib/pillar-cover";
import { slugify } from "@/lib/slug";
import { registrationGate } from "@/lib/event-registration";

/**
 * Cubre la lógica del pipeline editorial. Todos los casos de aquí salen de
 * fallos reales que aparecieron importando el paquete de 22 piezas, no de
 * suposiciones sobre lo que podría romperse.
 */

describe("markdown", () => {
  it("envuelve cada tabla en un contenedor con scroll propio", () => {
    // 15 de las 20 piezas llevan tabla. Sin el envoltorio, en 390px la tabla
    // desbordaba la página entera en vez de desplazarse dentro de su caja.
    const html = renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |");
    assert.ok(html.includes('<div class="vv-scroll-x"><table'));
    assert.ok(html.includes("</table></div>"));
  });

  it("no toca el texto que no lleva tabla", () => {
    assert.ok(!renderMarkdown("Hola **mundo**").includes("vv-scroll-x"));
  });

  it("conserva los saltos de línea del texto plano", () => {
    // marked va con breaks:true a propósito: las show notes se escribían como
    // texto plano y al pasarlas por markdown no debían perder sus saltos.
    assert.ok(renderMarkdown("una\ndos").includes("<br>"));
  });
});

describe("FAQ", () => {
  it("va y vuelve del formato de texto sin perder nada", () => {
    const texto = "¿Primera?\nSu respuesta.\n\n¿Segunda?\nOtra respuesta.";
    const entradas = parseFaqText(texto);
    assert.equal(entradas?.length, 2);
    assert.deepEqual(entradas![0], {
      pregunta: "¿Primera?",
      respuesta: "Su respuesta.",
    });
    assert.deepEqual(parseFaqText(faqToText(entradas)), entradas);
  });

  it("une las respuestas de varias líneas", () => {
    assert.equal(
      parseFaqText("¿P?\nlínea uno\nlínea dos")![0].respuesta,
      "línea uno línea dos",
    );
  });

  it("descarta bloques sin respuesta", () => {
    assert.equal(parseFaqText("¿Solo pregunta?"), null);
  });

  it("filtra lo que no tenga forma de par en el JSON de la base", () => {
    assert.deepEqual(
      parseFaq([{ pregunta: "¿P?", respuesta: "R" }, { pregunta: "" }, 42]),
      [{ pregunta: "¿P?", respuesta: "R" }],
    );
    assert.equal(parseFaq("no es una lista"), null);
  });
});

describe("enlaces internos", () => {
  it("solo acepta rutas del propio sitio", () => {
    assert.deepEqual(
      parseRelatedLinks([
        { texto: "Interno", destino: "/blog/x" },
        { texto: "Externo", destino: "https://ejemplo.com" },
        { texto: "Protocolo relativo", destino: "//ejemplo.com" },
      ]),
      [{ texto: "Interno", destino: "/blog/x" }],
    );
  });

  it("deduplica por destino", () => {
    const links = parseRelatedLinks([
      { texto: "Uno", destino: "/blog/x" },
      { texto: "Otro texto, mismo destino", destino: "/blog/x" },
    ]);
    assert.equal(links?.length, 1);
  });
});

describe("taxonomía de etiquetas", () => {
  it("funde las variantes que nombran lo mismo", () => {
    // 20 piezas generaban 57 etiquetas, 35 de ellas con una sola pieza.
    for (const v of ["ia", "ia-aplicada", "ia-en-la-empresa"]) {
      assert.equal(canonicalTagSlug(v), "inteligencia-artificial");
    }
    for (const v of ["salarios", "precios", "inflacion", "ipc", "carburantes"]) {
      assert.equal(canonicalTagSlug(v), "costes");
    }
  });

  it("deja pasar lo que no está en el mapa", () => {
    assert.equal(canonicalTagSlug("una-etiqueta-nueva"), "una-etiqueta-nueva");
  });

  it("da nombre visible a las canónicas y respeta el original si no lo tiene", () => {
    assert.equal(
      canonicalTagName("inteligencia-artificial", "IA"),
      "Inteligencia artificial",
    );
    assert.equal(canonicalTagName("una-nueva", "Una Nueva"), "Una Nueva");
  });
});

describe("portada por temática", () => {
  it("resuelve el pilar por el primer tag que casa", () => {
    assert.equal(
      pillarFromTags([{ slug: "otro" }, { slug: "fiscalidad" }]),
      "ECONOMY",
    );
    assert.equal(pillarFromTags([{ slug: "ia" }]), "TECH");
  });

  it("devuelve null si ninguno casa", () => {
    // Mejor un contorno que una imagen de temática equivocada.
    assert.equal(pillarFromTags([{ slug: "sin-pilar" }]), null);
  });
});

describe("slug", () => {
  it("pliega acentos y eñes a ASCII", () => {
    assert.equal(
      slugify("Añó Económico & Fiscalidad"),
      "ano-economico-fiscalidad",
    );
  });

  it("no deja guiones sueltos en los extremos", () => {
    assert.equal(slugify("  ¡Hola!  "), "hola");
  });
});

describe("inscripción a eventos", () => {
  const base = {
    status: "PUBLISHED" as const,
    startsAt: new Date("2026-12-01T10:00:00Z"),
    registrationOpensAt: null,
    registrationClosesAt: null,
  };
  const ahora = new Date("2026-11-01T00:00:00Z");

  it("abre cuando el evento está publicado y en plazo", () => {
    assert.deepEqual(registrationGate(base, ahora), { open: true });
  });

  it("cierra con el motivo correcto en cada caso", () => {
    assert.deepEqual(registrationGate({ ...base, status: "DRAFT" }, ahora), {
      open: false,
      reason: "not_published",
    });
    assert.deepEqual(registrationGate(base, new Date("2026-12-02T00:00:00Z")), {
      open: false,
      reason: "event_passed",
    });
    assert.deepEqual(
      registrationGate(
        { ...base, registrationOpensAt: new Date("2026-11-15T00:00:00Z") },
        ahora,
      ),
      { open: false, reason: "not_open_yet" },
    );
    assert.deepEqual(
      registrationGate(
        { ...base, registrationClosesAt: new Date("2026-10-01T00:00:00Z") },
        ahora,
      ),
      { open: false, reason: "closed" },
    );
  });
});
