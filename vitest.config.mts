import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // El tsconfig del proyecto usa jsx: "preserve", que es lo que necesita Next
  // pero deja el JSX sin transformar para cualquier otro lector. Los tests
  // importan funciones puras que viven en ficheros .tsx (parseFaq,
  // parseRelatedLinks), así que aquí se transforma el JSX explícitamente.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    // Mismo alias que tsconfig, para que los tests importen igual que el código.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
