import localFont from "next/font/local";

// Tipografías del sistema Cota, servidas desde el repo y no desde Google
// Fonts: con next/font/google cada `pnpm build` las descargaba y, cuando
// Google respondía raro, el build fallaba sin que hubiera cambiado nada.
//
// Son las versiones variables (eje wght) del subconjunto latin, sacadas de
// los paquetes @fontsource-variable/fraunces y
// @fontsource-variable/plus-jakarta-sans 5.3.0. Licencia SIL OFL 1.1 (los
// OFL-*.txt de esta carpeta). Para actualizarlas, se sustituyen los .woff2.

export const fraunces = localFont({
  src: [
    { path: "./fraunces-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "./fraunces-latin-wght-italic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const jakarta = localFont({
  src: [{ path: "./plus-jakarta-sans-latin-wght-normal.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: "Arial",
});
