import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { freezeToday, seed } from "./helpers";

const TABS = ["Mes", "Nómina", "Año", "Historial", "Info"];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`accesibilidad (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    test.beforeEach(async ({ page }) => {
      await freezeToday(page);
      await seed(page);
    });

    for (const tab of TABS) {
      test(`pestaña ${tab} sin violaciones WCAG A/AA`, async ({ page }) => {
        await page.goto("./");
        await page.getByRole("button", { name: tab, exact: true }).click();
        await page.waitForTimeout(500); // fin de la transición entre pestañas

        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const summary = results.violations.map((v) => `${v.id}: ${v.nodes.length} nodo(s) — ${v.help}`);
        expect(summary, summary.join("\n")).toEqual([]);
      });
    }

    test("panel de día sin violaciones", async ({ page }) => {
      await page.goto("./");
      await page.getByRole("button", { name: /^Día 2,/ }).click();
      await page.waitForTimeout(600);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.length} nodo(s) — ${v.help}`);
      expect(summary, summary.join("\n")).toEqual([]);
    });
  });
}
