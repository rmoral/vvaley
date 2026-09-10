import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { haTerminado, proximaEdicion, formatearPrecio } from "@/lib/event-series";

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
