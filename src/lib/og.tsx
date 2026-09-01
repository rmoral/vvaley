import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSiteUrl } from "@/lib/site-url";

// Composición única de las imágenes Open Graph, según la tanda 3.
//
// Todas las rutas opengraph-image.tsx del sitio llaman aquí: una sola
// definición de lienzo, anillos, escalera tipográfica y pie. Si cambia la
// marca, cambia en un sitio.
//
// Notas de satori (el motor de next/og), que no es un navegador:
//   · No soporta repeating-radial-gradient, así que los anillos de la
//     portada son cuatro <div> con borderRadius 9999. Mismo efecto.
//   · Todo contenedor con más de un hijo necesita display:"flex" explícito.
//   · No interpola ejes variables: las fuentes van en instancia estática.

// Next analiza `size`, `contentType` y `revalidate` de forma estática en cada
// opengraph-image.tsx, y no acepta valores importados: en las rutas van como
// literales. Aquí solo queda el tamaño, que sí se usa en tiempo de ejecución.
const OG_SIZE = { width: 1200, height: 630 };

const INK = "#0d1f21";
const TEXT = "#142e30";
const TEXT_2 = "#3a5557";
const RIVER = "#2e8b8f";
const RIVER_2 = "#5badb0";
const PAPER = "#f4f8f8";

let fontCache: { display: Buffer; sans: Buffer } | null = null;

async function fonts() {
  // Se leen una vez por proceso: en una t3.small, releer 135 kB en cada
  // rastreo de LinkedIn es gasto puro.
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "public/fonts/og");
  const [display, sans] = await Promise.all([
    readFile(path.join(dir, "Fraunces-Black.ttf")),
    readFile(path.join(dir, "PlusJakartaSans-SemiBold.ttf")),
  ]);
  fontCache = { display, sans };
  return fontCache;
}

// El titular en FR y CA es hasta un 25% más largo que en ES: el cuerpo se
// elige por longitud para que nunca pase de tres líneas.
function titleSize(t: string) {
  if (t.length <= 40) return 76;
  if (t.length <= 80) return 62;
  if (t.length <= 130) return 52;
  return 44;
}

function ring(d: number, right: number, top: number, color: string) {
  return {
    position: "absolute" as const,
    width: d,
    height: d,
    right,
    top,
    borderRadius: 9999,
    border: `1px solid ${color}`,
  };
}

export async function ogImage({
  eyebrow,
  title,
  invert = false,
}: {
  /** Antetítulo: tipo + cota, o nombre de sección. */
  eyebrow: string;
  title: string;
  /** Estrato invertido: solo /servicios y /contacto, igual que en la web. */
  invert?: boolean;
}) {
  const { display, sans } = await fonts();

  const bg = invert ? INK : PAPER;
  const fg = invert ? "#ffffff" : TEXT;
  const accent = invert ? RIVER_2 : RIVER;
  const muted = invert ? "#a8c3c4" : TEXT_2;
  const ringColor = invert ? "rgba(91,173,176,0.22)" : "rgba(46,139,143,0.28)";

  const domain = getSiteUrl().replace(/^https?:\/\//, "").replace(/\/$/, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: bg,
          position: "relative",
        }}
      >
        <div style={ring(1040, -180, -200, ringColor)} />
        <div style={ring(800, -60, -80, ringColor)} />
        <div style={ring(560, 60, 40, ringColor)} />
        <div style={ring(320, 180, 160, ringColor)} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "68px 72px",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Jakarta",
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {eyebrow}
          </div>

          <div
            style={{
              display: "flex",
              fontFamily: "Fraunces",
              fontSize: titleSize(title),
              lineHeight: 1.05,
              letterSpacing: -1,
              color: fg,
              maxWidth: 700,
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Fraunces",
                fontSize: 30,
                letterSpacing: 1.5,
                color: fg,
              }}
            >
              VALIRA&nbsp;<span style={{ color: accent }}>·</span>&nbsp;VALLEY
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Jakarta",
                fontSize: 20,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: muted,
              }}
            >
              {domain}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Fraunces", data: display, weight: 900, style: "normal" },
        { name: "Jakarta", data: sans, weight: 600, style: "normal" },
      ],
      headers: {
        // Además del revalidate de Next: Apache y los CDN de las redes
        // sociales también deben quedarse la imagen.
        "cache-control": "public, max-age=604800, immutable",
      },
    },
  );
}
