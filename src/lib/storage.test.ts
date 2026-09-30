import { describe, expect, it } from "vitest";
import { emptyData, newMonthConfig, sanitize } from "./storage";

describe("sanitize", () => {
  it("rechaza datos que no tienen forma de AppData", () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize("hola")).toBeNull();
    expect(sanitize({})).toBeNull();
    expect(sanitize({ months: [] })).toBeNull();
  });

  it("conserva una copia válida", () => {
    const data = emptyData();
    data.months["2026-09"] = {
      ...newMonthConfig("R2", 12),
      days: { 3: { guardia: { mode: "24", customHours: 17 } }, 5: { type: "vac" } },
      extras: [{ id: "a", hours: 8, type: "sdf", fromCarry: true }],
    };
    data.lastYear = "R2";
    expect(sanitize(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it("descarta meses, días y extras mal formados", () => {
    const result = sanitize({
      months: {
        "no-es-un-mes": {},
        "2026-13": {},
        "2026-09": {
          year: "R9",
          irpfPct: "mucho",
          days: { 0: {}, 40: {}, 3: { type: "inventado", guardia: { mode: "99" } }, 4: { type: "esp" } },
          extras: [
            { hours: "8", type: "lab" },
            { hours: 100, type: "sdf" },
            { hours: 4, type: "otro" },
          ],
        },
      },
    });
    expect(Object.keys(result!.months)).toEqual(["2026-09"]);
    const month = result!.months["2026-09"];
    expect(month.year).toBe("R1");
    expect(month.irpfPct).toBeNull();
    expect(month.days).toEqual({ 3: {}, 4: { type: "esp" } });
    expect(month.extras).toHaveLength(1);
    expect(month.extras[0].hours).toBe(24); // acotado al máximo
  });
});
