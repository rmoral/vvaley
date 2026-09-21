import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  haTerminado,
  proximaEdicion,
  formatearPrecio,
  LANDINGS,
  SERIES_VALUES,
  seriesForPath,
} from "@/lib/event-series";

/**
 * Lógica de la landing del meetup: qué edición se pinta y cómo se enseña el
 * precio. Son las dos decisiones que, si fallan, dejan la página mintiendo a
 * quien la abre.
 */

const ed = (inicio: string, fin?: string) => ({
  startsAt: new Date(inicio),
  endsAt: fin ? new Date(fin) : null,
});

describe("vigencia de una edición", () => {
  it("sigue vigente durante el propio evento", () => {
    // El meetup va de 19:00 a 22:00 y es justo entonces cuando alguien de
    // camino abre la landing en el móvil buscando la dirección. A las 19:01 la
    // edición no puede haber desaparecido de la página.
    const meetup = ed("2026-10-21T19:00:00Z", "2026-10-21T22:00:00Z");
    assert.equal(haTerminado(meetup, new Date("2026-10-21T19:01:00Z")), false);
    assert.equal(haTerminado(meetup, new Date("2026-10-21T21:59:00Z")), false);
  });

  it("termina cuando pasa la hora de fin", () => {
    const meetup = ed("2026-10-21T19:00:00Z", "2026-10-21T22:00:00Z");
    assert.equal(haTerminado(meetup, new Date("2026-10-21T22:01:00Z")), true);
  });

  it("sin hora de fin asume cuatro horas", () => {
    // Rellenar la hora de fin se olvida. Sin margen por defecto, una edición
    // sin endsAt desaparecería de la landing a la hora de empezar.
    const sinFin = ed("2026-10-21T19:00:00Z");
    assert.equal(haTerminado(sinFin, new Date("2026-10-21T22:30:00Z")), false);
    assert.equal(haTerminado(sinFin, new Date("2026-10-21T23:30:00Z")), true);
  });
});

describe("elección de la edición", () => {
  const ahora = new Date("2026-10-21T20:00:00Z");

  it("coge la primera que no haya terminado, no la primera de la lista", () => {
    const ediciones = [
      ed("2026-09-16T19:00:00Z", "2026-09-16T22:00:00Z"), // pasada
      ed("2026-10-21T19:00:00Z", "2026-10-21T22:00:00Z"), // en curso
      ed("2026-11-18T19:00:00Z", "2026-11-18T22:00:00Z"), // futura
    ];
    assert.deepEqual(proximaEdicion(ediciones, ahora), ediciones[1]);
  });

  it("salta a la siguiente en cuanto la anterior acaba", () => {
    const ediciones = [
      ed("2026-10-21T19:00:00Z", "2026-10-21T22:00:00Z"),
      ed("2026-11-18T19:00:00Z", "2026-11-18T22:00:00Z"),
    ];
    const despues = new Date("2026-10-22T09:00:00Z");
    assert.deepEqual(proximaEdicion(ediciones, despues), ediciones[1]);
  });

  it("devuelve null cuando no queda ninguna", () => {
    // Es el estado del mes de preparación: la landing existe antes que la
    // primera edición y tiene que seguir sirviendo para recoger emails.
    assert.equal(proximaEdicion([], ahora), null);
    assert.equal(
      proximaEdicion([ed("2026-09-16T19:00:00Z", "2026-09-16T22:00:00Z")], ahora),
      null,
    );
  });
});

describe("precio", () => {
  it("quita los decimales cuando el importe es redondo", () => {
    assert.equal(formatearPrecio(2000, "es")?.replace(/ /g, " "), "20 €");
  });

  it("los conserva cuando no lo es", () => {
    assert.equal(formatearPrecio(1250, "es")?.replace(/ /g, " "), "12,50 €");
  });

  it("distingue sin precio de gratis", () => {
    // Una edición cuyo precio aún no se ha decidido no puede anunciarse como
    // gratuita: null significa "no publicar precio", y la página enseña
    // "por confirmar".
    assert.equal(formatearPrecio(null, "es"), null);
    assert.equal(formatearPrecio(undefined, "es"), null);
    assert.equal(formatearPrecio(0, "es")?.replace(/ /g, " "), "0 €");
  });
});

describe("registro de landings", () => {
  // La plantilla vive en SeriesLanding y cada serie con página es una entrada
  // en LANDINGS. Estos tests atan los cabos que un despiste rompería en
  // silencio: una serie registrada sin ruta en disco daría 404; un bloque de
  // textos con una clave menos reventaría al pintar solo en un idioma.

  it("toda landing pertenece a una serie conocida", () => {
    for (const series of Object.keys(LANDINGS)) {
      assert.ok(SERIES_VALUES.includes(series), `${series} no está en SERIES`);
    }
  });

  it("toda landing tiene su página en disco", () => {
    for (const [series, l] of Object.entries(LANDINGS) as [string, { path: string }][]) {
      const fichero = `src/app/(public)/[locale]/(content)${l.path}/page.tsx`;
      assert.ok(existsSync(fichero), `${series}: falta ${fichero}`);
    }
  });

  it("resuelve la serie a partir de la ruta", () => {
    assert.equal(seriesForPath("/meetup"), "meetup");
    assert.equal(seriesForPath("/cafe-ia"), "cafe-ia");
    assert.equal(seriesForPath("/no-existe"), null);
  });

  it("cada bloque de textos tiene las mismas claves en los cuatro idiomas", () => {
    const es = JSON.parse(readFileSync("src/messages/es.json", "utf8"));
    for (const l of Object.values(LANDINGS) as { ns: string }[]) {
      const claves = Object.keys(es[l.ns] ?? {}).sort();
      assert.ok(claves.length > 0, `es.json no tiene el bloque ${l.ns}`);
      for (const loc of ["ca", "en", "fr"]) {
        const m = JSON.parse(readFileSync(`src/messages/${loc}.json`, "utf8"));
        assert.deepEqual(
          Object.keys(m[l.ns] ?? {}).sort(),
          claves,
          `${loc}.json: el bloque ${l.ns} no coincide con es.json`,
        );
      }
    }
  });

  it("las dos series comparten exactamente las claves que usa la plantilla", () => {
    // SeriesLanding lee las mismas claves para cualquier serie. Si a un bloque
    // le falta una, esa landing revienta al pintar y la otra no: el fallo se
    // vería solo en una página.
    const es = JSON.parse(readFileSync("src/messages/es.json", "utf8"));
    const bloques = (Object.values(LANDINGS) as { ns: string }[]).map((l) =>
      Object.keys(es[l.ns]).sort(),
    );
    for (const b of bloques.slice(1)) assert.deepEqual(b, bloques[0]);
  });
});
