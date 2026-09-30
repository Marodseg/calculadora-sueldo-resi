import type { Page } from "@playwright/test";

/** Fija "hoy" en 15 de septiembre de 2026 para que los tests no dependan de la fecha real. */
export async function freezeToday(page: Page) {
  await page.clock.setFixedTime(new Date(2026, 8, 15, 12, 0, 0));
}

const guardia = (mode: "17" | "24") => ({ guardia: { mode, customHours: 17 } });

/** Datos de ejemplo: R2, enero–junio de 2026 con guardias. */
export function seedData() {
  const month = (days: Record<number, unknown>) => ({
    year: "R2",
    irpfPct: 9,
    days,
    extras: [],
    carryDismissed: false,
    updatedAt: 1,
  });
  return {
    version: 1,
    lastYear: "R2",
    months: {
      "2026-01": month({ 3: guardia("24"), 8: guardia("17"), 15: guardia("17"), 22: guardia("17") }),
      "2026-02": month({ 5: guardia("17"), 12: guardia("17"), 14: guardia("24"), 21: guardia("24") }),
      "2026-03": month({ 2: guardia("17"), 9: guardia("17"), 14: guardia("24"), 28: guardia("24") }),
      "2026-04": month({ 1: guardia("17"), 2: guardia("24"), 11: guardia("24"), 27: guardia("17") }),
      "2026-05": month({ 4: guardia("17"), 9: guardia("24"), 16: guardia("17"), 30: guardia("24") }),
      "2026-06": month({ 3: guardia("17"), 10: guardia("17"), 13: guardia("24"), 20: guardia("24") }),
    },
  };
}

export async function seed(page: Page) {
  await page.addInitScript((data) => localStorage.setItem("sueldo-resi:v1", JSON.stringify(data)), seedData());
}

/** Lee el líquido que muestra la tarjeta principal, como número. */
export async function readNeto(page: Page): Promise<number> {
  const text = (await page.locator(".hero-amount .sr-only").first().textContent()) ?? "";
  return Number(text.replace(/[^\d,-]/g, "").replace(",", "."));
}
