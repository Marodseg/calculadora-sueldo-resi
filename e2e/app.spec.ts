import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { freezeToday, readNeto, seed } from "./helpers";

test.beforeEach(async ({ page }) => {
  await freezeToday(page);
});

test.describe("mes y guardias", () => {
  test("muestra el mes actual con el sueldo base y sin guardias", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByText("Septiembre de 2026")).toBeVisible();
    await expect(page.getByText("0 guardias")).toBeVisible();
    expect(await readNeto(page)).toBeGreaterThan(1000);
  });

  test("marcar una guardia sube el líquido y se conserva al recargar", async ({ page }) => {
    await page.goto("./");
    const before = await readNeto(page);

    await page.getByRole("button", { name: /^Día 2,/ }).click();
    await page.getByRole("switch", { name: "Guardia" }).click();
    await page.getByRole("button", { name: "Listo" }).click();

    await expect(page.getByText("1 guardias")).toBeVisible();
    expect(await readNeto(page)).toBeGreaterThan(before);

    await page.reload();
    await expect(page.getByText("1 guardias")).toBeVisible();
  });

  test("vacaciones desactivan la guardia de ese día", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /^Día 3,/ }).click();
    await page.getByRole("switch", { name: "Guardia" }).click();
    await page.getByRole("radio", { name: "Vacaciones" }).click();
    await expect(page.getByRole("switch", { name: "Guardia" })).toBeDisabled();
    await expect(page.getByRole("switch", { name: "Guardia" })).not.toBeChecked();
  });

  test("navega entre meses", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Mes siguiente" }).click();
    await expect(page.getByText("Octubre de 2026")).toBeVisible();
    await page.getByRole("button", { name: "Hoy" }).click();
    await expect(page.getByText("Septiembre de 2026")).toBeVisible();
  });

  test("cambiar de año de residencia actualiza las tarifas", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByText("14,07 €/h")).toBeVisible(); // R1
    await page.getByRole("button", { name: "R3", exact: true }).click();
    await expect(page.getByText("18,02 €/h")).toBeVisible();
  });
});

test.describe("festivos", () => {
  test("Jueves Santo es festivo y su guardia se paga a tarifa de festivo", async ({ page }) => {
    await page.goto("./");
    await page.locator('input[type="month"]').fill("2026-04");
    await expect(page.getByText("Abril de 2026")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Día 2,.*festivo: Jueves Santo/ })).toBeVisible();

    await page.getByRole("button", { name: /^Día 2,/ }).click();
    await expect(page.getByText("Jueves Santo").last()).toBeVisible();
    await page.getByRole("switch", { name: "Guardia" }).click();
    await page.getByRole("button", { name: "Listo" }).click();

    await page.getByRole("button", { name: "Nómina", exact: true }).click();
    // En un festivo la guardia es de 24 h (16 + 8 del Viernes Santo), todas a tarifa de fin de semana/festivo.
    await expect(page.getByText("Guardias fin de sem./festivo · 24 h")).toBeVisible();
    await expect(page.getByText("Guardias laborables")).toHaveCount(0);
  });
});

test.describe("nómina, año e historial", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
  });

  test("la pestaña Año proyecta el IRPF con los meses guardados", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Año", exact: true }).click();
    await expect(page.getByText("Líquido anual estimado")).toBeVisible();
    await expect(page.getByText(/Con \d+ meses de datos/)).toBeVisible();
    await expect(page.getByText("Retención de IRPF estimada")).toBeVisible();
    await expect(page.getByText("Cuota anual estimada")).toBeVisible();
  });

  test("la pestaña Año resume las guardias del año", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Año", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Guardias de 2026/ })).toBeVisible();
    // Los datos de ejemplo tienen 4 guardias en cada uno de los 6 meses.
    await expect(page.getByTestId("stat-guardias")).toContainText("24");
    await expect(page.getByTestId("stat-horas")).toContainText(" h");
    await expect(page.getByText("Media por mes")).toBeVisible();
    await expect(page.getByRole("group", { name: "Guardias por día de la semana" })).toBeVisible();
    await expect(page.getByRole("img", { name: /^Enero de 2026: 4 guardias/i })).toBeVisible();
    await expect(page.getByRole("img", { name: /^Julio de 2026: sin datos/i })).toBeVisible();
  });

  test("el historial lista los meses guardados y permite abrirlos", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Historial", exact: true }).click();
    await expect(page.getByText("Acumulado · 6 meses")).toBeVisible();
    await page
      .getByRole("button", { name: /marzo de 2026/i })
      .first()
      .click();
    await expect(page.getByText("Marzo de 2026").first()).toBeVisible();
  });

  test("borrar un mes del historial pide confirmación", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Historial", exact: true }).click();
    await page.getByRole("button", { name: /Borrar enero de 2026/i }).click();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("Acumulado · 6 meses")).toBeVisible();

    await page.getByRole("button", { name: /Borrar enero de 2026/i }).click();
    await page.getByRole("button", { name: "Borrar", exact: true }).click();
    await expect(page.getByText("Acumulado · 5 meses")).toBeVisible();
  });
});

test.describe("copia de seguridad", () => {
  test("exportar, borrar todo e importar recupera los datos", async ({ page }) => {
    await seed(page);
    await page.goto("./");
    await page.getByRole("button", { name: "Info", exact: true }).click();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Exportar" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^sueldo-resi-\d{4}-\d{2}-\d{2}\.json$/);
    const path = await download.path();

    await page.getByRole("button", { name: "Borrar todos los datos" }).click();
    await page.getByRole("button", { name: "Borrar todo" }).click();
    await page.getByRole("button", { name: "Historial", exact: true }).click();
    await expect(page.getByText("Aún no hay meses guardados")).toBeVisible();

    await page.getByRole("button", { name: "Info", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles(path);
    await page.getByRole("button", { name: "Historial", exact: true }).click();
    await expect(page.getByText("Acumulado · 6 meses")).toBeVisible();
  });

  test("un archivo que no es una copia válida se rechaza sin romper la app", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Info", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "malo.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"hola": "mundo"}'),
    });
    await expect(page.getByText("No se pudo leer ese archivo")).toBeVisible();
    await expect(page.getByText("Copia de seguridad")).toBeVisible();
  });
});

test.describe("compartir", () => {
  test("genera la imagen del mes y permite descargarla", async ({ page }) => {
    await seed(page);
    await page.goto("./");
    await page.locator('input[type="month"]').fill("2026-04");
    await page.getByRole("button", { name: "Nómina", exact: true }).click();
    await page.getByRole("button", { name: "Compartir resumen" }).click();

    await expect(page.getByRole("img", { name: /Vista previa del resumen/ })).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Descargar" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("sueldo-resi-2026-04.png");
  });
});

test.describe("calendario (.ics)", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
  });

  test("exporta las guardias del año en un archivo iCalendar válido", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Nómina", exact: true }).click();
    await page.getByRole("button", { name: "Al calendario" }).click();

    const status = page.getByRole("status");
    await expect(status).toContainText("24 eventos"); // 24 guardias y ninguna ausencia en los datos de ejemplo
    await page.getByRole("switch", { name: "Festivos" }).click();
    await expect(status).not.toContainText("24 eventos");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Descargar .ics" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("sueldo-resi-calendario-2026.ics");

    const ics = readFileSync(await download.path(), "utf8");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("TZID:Europe/Madrid");
    expect(ics).toContain("SUMMARY:Guardia 17 h");
    expect(ics).toContain("SUMMARY:Guardia 24 h");
    expect(ics).toContain("SUMMARY:Festivo: Jueves Santo");
    expect(ics).not.toContain("€"); // sin importes
  });

  test("con todo desactivado no hay nada que exportar", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Nómina", exact: true }).click();
    await page.getByRole("button", { name: "Al calendario" }).click();
    await page.getByRole("switch", { name: "Guardias" }).click();
    await page.getByRole("switch", { name: "Vacaciones y bajas" }).click();
    await expect(page.getByRole("status")).toContainText("No hay nada que exportar");
    await expect(page.getByRole("button", { name: "Descargar .ics" })).toBeDisabled();
  });

  test("también se puede abrir desde el calendario del mes", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /Añadir a mi calendario/ }).click();
    await expect(page.getByRole("heading", { name: "Añadir a mi calendario" })).toBeVisible();
  });
});

test.describe("PWA", () => {
  test.use({ serviceWorkers: "allow" });

  test("tiene manifest y funciona sin conexión tras la primera carga", async ({ page, context }) => {
    await page.goto("./");
    const manifest = await page.evaluate(async () => {
      const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      return (await fetch(link!.href)).json();
    });
    expect(manifest.short_name).toBe("Sueldo Resi");
    expect(manifest.display).toBe("standalone");

    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForTimeout(1000); // deja terminar el precache

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText("Líquido a percibir")).toBeVisible();
    await page.getByRole("button", { name: "Info", exact: true }).click();
    await expect(page.getByText("Copia de seguridad")).toBeVisible();
  });
});

test.describe("robustez", () => {
  test("datos corruptos en el almacenamiento no rompen la app", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("sueldo-resi:v1", "{esto no es json"));
    await page.goto("./");
    await expect(page.getByText("Líquido a percibir").first()).toBeVisible();
  });

  test("datos con formato inesperado se ignoran", async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        "sueldo-resi:v1",
        JSON.stringify({ months: { "2026-09": { year: 5, days: "x", extras: 3 } } }),
      ),
    );
    await page.goto("./");
    await expect(page.getByText("Líquido a percibir").first()).toBeVisible();
    await expect(page.getByText("0 guardias")).toBeVisible();
  });
});
