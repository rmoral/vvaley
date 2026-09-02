import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Política de permisos del back-office, verificada leyendo el código.
 *
 * Este test existe porque el fallo que arregla no se veía: seis ficheros de
 * acciones definían su propia función `requireAdmin()` que solo comprobaba que
 * hubiera sesión, sin mirar el rol. El nombre decía una cosa y el cuerpo hacía
 * otra, así que revisando por encima parecía correcto.
 *
 * La regla: crear y editar lo puede hacer cualquiera con sesión (EDITOR o
 * ADMIN); lo que borra, lo que sale del sitio o lo que toca cuentas es solo de
 * ADMIN. Si alguien añade una acción destructiva sin la guarda, esto falla.
 */

const DIR = "src/app/admin/_actions";

/** Acciones que exigen rol ADMIN. El resto, basta con sesión. */
const SOLO_ADMIN: Record<string, string[]> = {
  campaigns: ["deleteCampaign", "sendCampaign"],
  contact: ["deleteContactRequest"],
  episodes: ["deleteEpisode"],
  events: ["deleteEvent", "deleteRegistration"],
  guests: ["deleteGuest"],
  news: ["deleteNews"],
  newsletter: ["deleteSubscriber"],
  posts: ["deletePost"],
  social: [
    "startConnect",
    "disconnectAccount",
    "reconnectAccount",
    "deletePublication",
  ],
  users: ["createUser", "updateUser", "deleteUser"],
};

type Accion = { fichero: string; nombre: string; cuerpo: string };

function accionesDe(fichero: string): Accion[] {
  const src = readFileSync(path.join(DIR, `${fichero}.ts`), "utf8");
  const marcas = [...src.matchAll(/^export async function (\w+)\(/gm)];
  return marcas.map((m, i) => ({
    fichero,
    nombre: m[1],
    cuerpo: src.slice(m.index!, marcas[i + 1]?.index ?? src.length),
  }));
}

const ficheros = readdirSync(DIR)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => f.replace(/\.ts$/, ""));

describe("permisos del back-office", () => {
  it("cubre todos los ficheros de acciones", () => {
    // Si alguien añade un fichero nuevo, este test obliga a declarar su
    // política en lugar de dejarlo pasar sin revisar.
    expect(ficheros.sort()).toEqual(Object.keys(SOLO_ADMIN).sort());
  });

  it("no quedan copias locales de requireAdmin", () => {
    // La copia local era el fallo original: mismo nombre, sin comprobar rol.
    for (const f of ficheros) {
      const src = readFileSync(path.join(DIR, `${f}.ts`), "utf8");
      expect(
        /^\s*async function requireAdmin\(/m.test(src),
        `${f}.ts define su propia requireAdmin en vez de usar @/lib/auth-helpers`,
      ).toBe(false);
    }
  });

  const todas = ficheros.flatMap(accionesDe);

  it("hay acciones que verificar", () => {
    expect(todas.length).toBeGreaterThan(25);
  });

  it.each(todas)("$fichero.$nombre tiene la guarda correcta", (accion) => {
    const esperaAdmin = SOLO_ADMIN[accion.fichero].includes(accion.nombre);
    const tieneAdmin = accion.cuerpo.includes("await requireAdmin()");
    const tieneSesion = accion.cuerpo.includes("await requireSession()");

    expect(
      tieneAdmin || tieneSesion,
      `${accion.nombre} no llama a ninguna guarda`,
    ).toBe(true);

    expect(
      tieneAdmin,
      esperaAdmin
        ? `${accion.nombre} destruye o expone datos: debe exigir requireAdmin()`
        : `${accion.nombre} es de edición corriente: requireSession() basta`,
    ).toBe(esperaAdmin);
  });

  it("la guarda es lo primero que hace cada acción", () => {
    // Consultar la base antes de comprobar permisos filtra si un id existe.
    const tarde: string[] = [];
    for (const a of todas) {
      const guarda = a.cuerpo.search(/await require(Admin|Session)\(\)/);
      const consulta = a.cuerpo.search(/await prisma\./);
      if (consulta !== -1 && guarda !== -1 && consulta < guarda) {
        tarde.push(`${a.fichero}.${a.nombre}`);
      }
    }
    expect(tarde, `consultan la base antes de comprobar permisos`).toEqual([]);
  });
});
