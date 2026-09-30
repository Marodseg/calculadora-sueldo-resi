import { describe, expect, it } from "vitest";
import { computeTotals } from "./calc";
import { summarizeGuardias } from "./guardiaStats";
import { newMonthConfig } from "./storage";
import type { GuardiaMode, MonthConfig } from "./types";

function month(
  days: Record<number, { mode?: GuardiaMode; type?: "vac" | "baja" | "esp" }>,
  year: "R1" | "R2" = "R1",
): MonthConfig {
  const cfg = newMonthConfig(year);
  for (const [d, o] of Object.entries(days)) {
    cfg.days[Number(d)] = {
      type: o.type,
      guardia: o.mode ? { mode: o.mode, customHours: 17 } : undefined,
    };
  }
  return cfg;
}

describe("summarizeGuardias", () => {
  it("sin datos devuelve todo a cero", () => {
    const s = summarizeGuardias({}, 2026);
    expect(s.monthsCount).toBe(0);
    expect(s.guardias).toBe(0);
    expect(s.totalHours).toBe(0);
    expect(s.busiest).toBeNull();
    expect(s.monthly).toHaveLength(12);
    expect(s.monthly.every((m) => !m.hasData)).toBe(true);
  });

  it("cuenta guardias, modos, día de la semana y horas por tarifa", () => {
    // Septiembre 2026: 1 sep = martes. Día 2 (miércoles) 17 h laborable; día 5 (sábado) 24 h.
    const saved = { "2026-09": month({ 2: { mode: "17" }, 5: { mode: "24" } }) };
    const s = summarizeGuardias(saved, 2026);

    expect(s.monthsCount).toBe(1);
    expect(s.guardias).toBe(2);
    expect(s.byMode).toEqual({ "17": 1, "24": 1, custom: 0 });
    expect(s.byWeekday).toEqual([0, 0, 1, 0, 0, 1, 0]); // miércoles y sábado
    expect(s.onWeekendOrHoliday).toBe(1); // solo el sábado

    // 17 h: 9 lab (mié) + 8 lab (jue) ; 24 h en sábado: 16 sdf + 8 sdf (domingo)
    expect(s.hours).toEqual({ lab: 17, sdf: 24, esp: 0 });
    expect(s.totalHours).toBe(41);
  });

  it("los importes coinciden con el cálculo mensual y el porcentaje es coherente", () => {
    const cfg = month({ 2: { mode: "17" }, 9: { mode: "24" }, 16: { mode: "17" } });
    const s = summarizeGuardias({ "2026-09": cfg }, 2026);
    const t = computeTotals("2026-09", cfg);
    expect(s.guardiasBruto).toBe(t.guardiasBruto);
    expect(s.brutoTotal).toBe(t.bruto);
    expect(s.guardiasShare).toBeCloseTo((t.guardiasBruto / t.bruto) * 100, 5);
    expect(s.guardiasShare).toBeGreaterThan(0);
    expect(s.guardiasShare).toBeLessThan(100);
  });

  it("agrupa varios meses, ignora otros años y detecta el mes con más guardias", () => {
    const saved = {
      "2026-03": month({ 2: { mode: "17" } }),
      "2026-04": month({ 1: { mode: "17" }, 7: { mode: "17" }, 14: { mode: "17" } }),
      "2025-12": month({ 1: { mode: "17" }, 2: { mode: "17" }, 3: { mode: "17" }, 4: { mode: "17" } }),
    };
    const s = summarizeGuardias(saved, 2026);
    expect(s.monthsCount).toBe(2);
    expect(s.guardias).toBe(4);
    expect(s.busiest).toEqual({ key: "2026-04", guardias: 3 });
    expect(s.monthly[3]).toMatchObject({ key: "2026-04", guardias: 3, hasData: true });
    expect(s.monthly[0].hasData).toBe(false);
  });

  it("cuenta vacaciones y bajas, y un festivo cuenta como fin de semana", () => {
    // Abril 2026: el 2 es Jueves Santo (festivo entre semana).
    const saved = {
      "2026-04": month({ 2: { mode: "24" }, 13: { type: "vac" }, 14: { type: "vac" }, 20: { type: "baja" } }),
    };
    const s = summarizeGuardias(saved, 2026);
    expect(s.vacDays).toBe(2);
    expect(s.bajaDays).toBe(1);
    expect(s.onWeekendOrHoliday).toBe(1);
  });

  it("incluye en las horas las arrastradas del mes anterior", () => {
    const cfg = month({ 2: { mode: "17" } });
    cfg.extras.push({ id: "x", hours: 8, type: "lab", fromCarry: true });
    const s = summarizeGuardias({ "2026-09": cfg }, 2026);
    expect(s.hours.lab).toBe(9 + 8 + 8);
    expect(s.monthly[8].hours).toBe(s.totalHours);
  });
});
