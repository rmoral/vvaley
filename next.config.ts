import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    // Servido desde una t3.small: WebP recorta bastante el peso y el
    // conjunto reducido de anchos limita cuántas variantes hay que
    // generar la primera vez que se pide cada imagen. La caché larga
    // evita repetir ese trabajo en cada despliegue de contenido.
    formats: ["image/webp"],
    deviceSizes: [640, 1080, 1920],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  // Piezas retiradas que llegaron a estar publicadas e indexadas. Un 301 hacia
  // la que se queda conserva el enlace y el posicionamiento; un 404 los tira.
  // La lista es corta a propósito: si crece, toca sacarla a la base de datos.
  async redirects() {
    const retiradas: [string, string][] = [
      // Contaba el mismo IPC avanzado de agosto de 2026 que
      // ipc-andorra-agosto-2026, publicada un día antes.
      ["inflacion-andorra-ipc-avanzado", "ipc-andorra-agosto-2026"],
    ];
    return retiradas.map(([de, a]) => ({
      // :locale y no un patrón fijo: localePrefix es "always", así que todas
      // las URL del sitio llevan idioma delante.
      source: `/:locale/noticias/${de}`,
      destination: `/:locale/noticias/${a}`,
      permanent: true,
    }));
  },
};

export default withNextIntl(nextConfig);
