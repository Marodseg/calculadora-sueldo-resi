import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: "retain-on-failure",
    // Evita que el service worker cachee entre tests; la prueba de PWA lo activa a propósito.
    serviceWorkers: "block",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    launchOptions: {
      // Permite usar un Chromium ya instalado (p. ej. en entornos sin acceso a la descarga de navegadores).
      executablePath: process.env.CHROMIUM_PATH || undefined,
    },
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
