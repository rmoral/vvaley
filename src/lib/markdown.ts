import { Marked } from "marked";

const marked = new Marked({
  gfm: true,
  breaks: true,
  async: false,
});

export function renderMarkdown(input: string): string {
  if (!input) return "";
  return wrapTables(marked.parse(input) as string);
}

// Las tablas de markdown salen con el ancho que pida su contenido, y en el
// detalle la medida de lectura es de 768px: una tabla de cuatro columnas
// desborda la página entera en móvil. Cada una va dentro de su propio
// contenedor con scroll horizontal, que es lo único que debe desplazarse.
//
// Sustitución de cadena y no un renderer de marked a propósito: markdown no
// puede anidar tablas, así que el emparejamiento es trivial y no depende de
// la API del renderer, que ha cambiado entre versiones mayores de marked.
function wrapTables(html: string): string {
  if (!html.includes("<table")) return html;
  return html
    .replace(/<table/g, '<div class="vv-scroll-x"><table')
    .replace(/<\/table>/g, "</table></div>");
}
