import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  initials,
  normalizePresenterUrl,
  presenterLinkLabel,
  shareLinks,
  withUtm,
} from "@/lib/event-presenters";

/**
 * Sección «Presentan» y botones de compartir del evento. Lo que hay que
 * fijar: que el enlace que escribe el equipo acaba en una URL pública segura
 * y que cada red recibe la URL del evento con su UTM.
 */

describe("normalizePresenterUrl", () => {
  it("acepta web con y sin esquema, y @perfil como Instagram", () => {
    assert.equal(normalizePresenterUrl("https://empresa.ad/"), "https://empresa.ad/");
    assert.equal(normalizePresenterUrl("empresa.ad"), "https://empresa.ad/");
    assert.equal(normalizePresenterUrl("  www.empresa.com/es  "), "https://www.empresa.com/es");
    assert.equal(normalizePresenterUrl("@valira.valley"), "https://www.instagram.com/valira.valley");
    assert.equal(
      normalizePresenterUrl("instagram.com/empresa"),
      "https://instagram.com/empresa",
    );
  });

  it("rechaza lo que no es una web pública", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "mailto:a@b.com", "empresa", "ftp://x.com", "@"]) {
      assert.equal(normalizePresenterUrl(bad), null, bad);
    }
    assert.equal(normalizePresenterUrl(""), null);
    assert.equal(normalizePresenterUrl(null), null);
  });
});

describe("presenterLinkLabel", () => {
  it("rotula perfiles por red y webs por dominio", () => {
    assert.equal(presenterLinkLabel("https://www.instagram.com/empresa/"), "@empresa");
    assert.equal(presenterLinkLabel("https://x.com/empresa"), "@empresa");
    assert.equal(presenterLinkLabel("https://www.linkedin.com/company/empresa"), "LinkedIn");
    assert.equal(presenterLinkLabel("https://www.empresa.ad/es"), "empresa.ad");
  });
});

describe("initials", () => {
  it("dos letras", () => {
    assert.equal(initials("Bright Tech Solutions"), "BT");
    assert.equal(initials("acme"), "AC");
  });
});

describe("compartir", () => {
  const url = "https://valiravalley.com/es/eventos/cena";
  const links = shareLinks(url, "Cena networking · 3 de diciembre", "evento-cena");

  it("cada red lleva la URL del evento con su UTM", () => {
    assert.equal(
      withUtm(url, "linkedin", "evento-cena"),
      `${url}?utm_source=linkedin&utm_medium=social&utm_campaign=evento-cena`,
    );
    const inner = (href: string, param: string) => new URL(href).searchParams.get(param)!;
    assert.equal(inner(links.linkedin, "url"), withUtm(url, "linkedin", "evento-cena"));
    assert.equal(inner(links.facebook, "u"), withUtm(url, "facebook", "evento-cena"));
    assert.equal(inner(links.x, "url"), withUtm(url, "x", "evento-cena"));
    assert.equal(inner(links.x, "text"), "Cena networking · 3 de diciembre");
    assert.equal(inner(links.telegram, "url"), withUtm(url, "telegram", "evento-cena"));
    assert.equal(
      inner(links.whatsapp, "text"),
      `Cena networking · 3 de diciembre ${withUtm(url, "whatsapp", "evento-cena")}`,
    );
    assert.ok(links.email.startsWith("mailto:?subject="));
    assert.ok(decodeURIComponent(links.email).includes("utm_source=email"));
  });
});
