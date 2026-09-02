import { describe, expect, it } from "vitest";
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
    expect(html).toContain('<div class="vv-scroll-x"><table');
    expect(html).toContain("</table></div>");
  });

  it("no toca el texto que no lleva tabla", () => {
    expect(renderMarkdown("Hola **mundo**")).not.toContain("vv-scroll-x");
  });

  it("conserva los saltos de línea del texto plano", () => {
    // marked va con breaks:true a propósito: las show notes se escribían como
    // texto plano y al pasarlas por markdown no debían perder sus saltos.
    expect(renderMarkdown("una\ndos")).toContain("<br>");
  });
});

describe("FAQ", () => {
  it("va y vuelve del formato de texto sin perder nada", () => {
    const texto = "¿Primera?\nSu respuesta.\n\n¿Segunda?\nOtra respuesta.";
    const entradas = parseFaqText(texto);
    expect(entradas).toHaveLength(2);
    expect(entradas![0]).toEqual({
      pregunta: "¿Primera?",
      respuesta: "Su respuesta.",
    });
    expect(parseFaqText(faqToText(entradas))).toEqual(entradas);
  });

  it("une las respuestas de varias líneas", () => {
    expect(parseFaqText("¿P?\nlínea uno\nlínea dos")![0].respuesta).toBe(
      "línea uno línea dos",
    );
  });

  it("descarta bloques sin respuesta", () => {
    expect(parseFaqText("¿Solo pregunta?")).toBeNull();
  });

  it("filtra lo que no tenga forma de par en el JSON de la base", () => {
    expect(parseFaq([{ pregunta: "¿P?", respuesta: "R" }, { pregunta: "" }, 42]))
      .toEqual([{ pregunta: "¿P?", respuesta: "R" }]);
    expect(parseFaq("no es una lista")).toBeNull();
  });
});

describe("enlaces internos", () => {
  it("solo acepta rutas del propio sitio", () => {
    const links = parseRelatedLinks([
      { texto: "Interno", destino: "/blog/x" },
      { texto: "Externo", destino: "https://ejemplo.com" },
      { texto: "Protocolo relativo", destino: "//ejemplo.com" },
    ]);
    expect(links).toEqual([{ texto: "Interno", destino: "/blog/x" }]);
  });

  it("deduplica por destino", () => {
    const links = parseRelatedLinks([
      { texto: "Uno", destino: "/blog/x" },
      { texto: "Otro texto, mismo destino", destino: "/blog/x" },
    ]);
    expect(links).toHaveLength(1);
  });
});

describe("taxonomía de etiquetas", () => {
  it("funde las variantes que nombran lo mismo", () => {
    // 20 piezas generaban 57 etiquetas, 35 de ellas con una sola pieza.
    for (const v of ["ia", "ia-aplicada", "ia-en-la-empresa"]) {
      expect(canonicalTagSlug(v)).toBe("inteligencia-artificial");
    }
    for (const v of ["salarios", "precios", "inflacion", "ipc", "carburantes"]) {
      expect(canonicalTagSlug(v)).toBe("costes");
    }
  });

  it("deja pasar lo que no está en el mapa", () => {
    expect(canonicalTagSlug("una-etiqueta-nueva")).toBe("una-etiqueta-nueva");
  });

  it("da nombre visible a las canónicas y respeta el original si no lo tiene", () => {
    expect(canonicalTagName("inteligencia-artificial", "IA")).toBe(
      "Inteligencia artificial",
    );
    expect(canonicalTagName("una-nueva", "Una Nueva")).toBe("Una Nueva");
  });
});

describe("portada por temática", () => {
  it("resuelve el pilar por el primer tag que casa", () => {
    expect(pillarFromTags([{ slug: "otro" }, { slug: "fiscalidad" }])).toBe(
      "ECONOMY",
    );
    expect(pillarFromTags([{ slug: "ia" }])).toBe("TECH");
  });

  it("devuelve null si ninguno casa", () => {
    // Mejor un contorno que una imagen de temática equivocada.
    expect(pillarFromTags([{ slug: "sin-pilar" }])).toBeNull();
  });
});

describe("slug", () => {
  it("pliega acentos y eñes a ASCII", () => {
    expect(slugify("Añó Económico & Fiscalidad")).toBe(
      "ano-economico-fiscalidad",
    );
  });

  it("no deja guiones sueltos en los extremos", () => {
    expect(slugify("  ¡Hola!  ")).toBe("hola");
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
    expect(registrationGate(base, ahora)).toEqual({ open: true });
  });

  it("cierra con el motivo correcto en cada caso", () => {
    expect(registrationGate({ ...base, status: "DRAFT" }, ahora)).toEqual({
      open: false,
      reason: "not_published",
    });
    expect(
      registrationGate(base, new Date("2026-12-02T00:00:00Z")),
    ).toEqual({ open: false, reason: "event_passed" });
    expect(
      registrationGate(
        { ...base, registrationOpensAt: new Date("2026-11-15T00:00:00Z") },
        ahora,
      ),
    ).toEqual({ open: false, reason: "not_open_yet" });
    expect(
      registrationGate(
        { ...base, registrationClosesAt: new Date("2026-10-01T00:00:00Z") },
        ahora,
      ),
    ).toEqual({ open: false, reason: "closed" });
  });
});
