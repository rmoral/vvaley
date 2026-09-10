import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assetUrl, esRutaDeRecurso } from "@/lib/asset-url";

/**
 * El fallo que arregla esto no se veía desde el código: el subidor del panel
 * devuelve rutas relativas ("/uploads/2026/09/foto.jpg") y las acciones las
 * validaban con z.string().url(), que exige esquema. Subir una imagen y
 * guardar fallaba siempre, en entradas, noticias, episodios e invitados.
 *
 * Pudo estar meses sin detectarse porque el sitio sí tenía portadas: las había
 * escrito el importador de contenido, que va directo a Prisma.
 */

describe("rutas de recurso", () => {
  it("acepta lo que devuelve el subidor del panel", () => {
    // Es literalmente el formato de saveUpload(): /uploads/AAAA/MM/fichero.
    assert.ok(esRutaDeRecurso("/uploads/2026/09/foto.jpg"));
    assert.ok(esRutaDeRecurso("/covers/piezas/ipc-andorra-agosto-2026.jpg"));
  });

  it("acepta imágenes alojadas fuera", () => {
    assert.ok(esRutaDeRecurso("https://cdn.ejemplo.com/a.jpg"));
    assert.ok(esRutaDeRecurso("http://ejemplo.com/a.jpg"));
  });

  it("rechaza el protocolo relativo", () => {
    // "//host/a.jpg" saca al visitante del sitio sin parecer que lo hace.
    assert.equal(esRutaDeRecurso("//evil.example/a.jpg"), false);
  });

  it("rechaza esquemas que no son http", () => {
    // Estos valores acaban en un href o en un src.
    assert.equal(esRutaDeRecurso("javascript:alert(1)"), false);
    assert.equal(esRutaDeRecurso("data:image/png;base64,AAA"), false);
    assert.equal(esRutaDeRecurso("no-es-una-ruta"), false);
  });

  it("trata el vacío como ausencia, no como error", () => {
    assert.equal(assetUrl.parse(""), null);
    assert.equal(assetUrl.parse(null), null);
  });

  it("deja pasar la ruta del subidor por el esquema completo", () => {
    assert.equal(
      assetUrl.parse("/uploads/2026/09/foto.jpg"),
      "/uploads/2026/09/foto.jpg",
    );
  });
});

describe("acciones del back-office", () => {
  const DIR = "src/app/admin/_actions";

  it("ningún campo de recurso subible sigue validándose con .url()", () => {
    // Si alguien añade un campo de imagen nuevo copiando el patrón viejo,
    // esto falla antes de que llegue a producción.
    const SUBIBLES = [
      "coverImageUrl",
      "photoUrl",
      "audioUrl",
      "recordingUrl",
    ];
    const malos: string[] = [];
    for (const f of readdirSync(DIR).filter((f) => f.endsWith(".ts"))) {
      const src = readFileSync(path.join(DIR, f), "utf8");
      for (const campo of SUBIBLES) {
        // El campo y lo que le sigue hasta la coma de cierre del miembro.
        const m = src.match(new RegExp(`\\b${campo}:\\s*z[\\s\\S]{0,200}?\\n\\s*\\w+:`));
        if (m && m[0].includes(".url()")) malos.push(`${f}:${campo}`);
      }
    }
    assert.deepEqual(malos, []);
  });
});
