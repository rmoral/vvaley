import { z } from "zod";

/**
 * Validación de las rutas de recurso que guarda el back-office: portadas,
 * fotos de invitado, audio de episodio, adjuntos de publicación.
 *
 * Por qué no sirve z.string().url(). El subidor de /api/admin/uploads devuelve
 * rutas relativas al sitio —"/uploads/2026/09/foto.jpg"— y el importador de
 * contenido escribe las portadas como "/covers/piezas/x.jpg". `.url()` exige
 * esquema, así que rechazaba exactamente lo que produce la propia aplicación:
 * subir una imagen desde el panel y darle a guardar fallaba siempre, en
 * entradas, noticias, episodios, invitados y publicaciones. Las únicas portadas
 * que llegaron a la base de datos las escribió el importador, que va directo a
 * Prisma y no pasa por aquí. Por eso el fallo pudo estar meses sin verse: el
 * sitio tenía imágenes, pero ninguna se había subido desde el panel.
 *
 * Se acepta ruta absoluta del propio sitio y http(s) absoluto, para cuando la
 * imagen esté alojada fuera. Se rechaza "//host", que es protocolo relativo y
 * saca al visitante del sitio sin parecerlo, y cualquier otro esquema
 * —javascript:, data:— porque estos valores acaban en un href o en un src.
 */
export function esRutaDeRecurso(valor: string): boolean {
  if (valor.startsWith("//")) return false;
  if (valor.startsWith("/")) return true;
  try {
    const u = new URL(valor);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Campo opcional de recurso: acepta vacío, ruta del sitio o http(s). */
export const assetUrl = z
  .string()
  .refine(esRutaDeRecurso, {
    message: "Debe ser una ruta del sitio (/uploads/…) o una URL http(s)",
  })
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));
