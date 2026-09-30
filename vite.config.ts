import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Rutas relativas: la app funciona bajo cualquier subruta (p. ej. GitHub Pages).
  base: "./",
  plugins: [
    react(),
    VitePWA({
      // "prompt": la app avisa cuando hay versión nueva y el usuario decide cuándo actualizar.
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Sueldo Resi · Calculadora MIR",
        short_name: "Sueldo Resi",
        description: "Calcula tu nómina de residente (MIR) en el SAS: guardias, cotizaciones e IRPF, mes a mes.",
        lang: "es",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0f766e",
        background_color: "#f3f5f2",
        categories: ["finance", "productivity"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Solo el subconjunto latino de las fuentes (cubre el español); tampoco se precachea la imagen para compartir.
        globIgnores: ["**/*-{cyrillic,cyrillic-ext,greek,vietnamese,latin-ext}-*.woff2", "og.png"],
        navigateFallback: "index.html",
      },
    }),
  ],
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
