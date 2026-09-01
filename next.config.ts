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
};

export default withNextIntl(nextConfig);
