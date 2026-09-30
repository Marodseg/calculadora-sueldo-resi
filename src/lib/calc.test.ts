import { describe, expect, it } from "vitest";
import { computeTotals, deferredHours, estimateIrpf } from "./calc";
import { newMonthConfig } from "./storage";

describe("calculadora", () => {
  it("mes sin guardias en R1: sueldo base completo y base mínima de cotización", () => {
    const t = computeTotals("2026-06", newMonthConfig("R1"));
    expect(t.workedDays).toBe(30);
    expect(t.sueldoOrdinario).toBe(1379.9);
    expect(t.bruto).toBe(1379.9);
    expect(t.totalBaseCC).toBe(1989.3); // sube al mínimo del grupo 1
    expect(t.irpfAmount).toBe(0);
    expect(t.neto).toBeCloseTo(1379.9 - 1379.9 * (7 / 6) * 0.017 - 1989.3 * 0.0485, 0);
  });

  it("guardia de 17 h en viernes: 9 h laborables + 8 h fin de semana", () => {
    const cfg = newMonthConfig("R1");
    cfg.days[2] = { guardia: { mode: "17", customHours: 17 } }; // 2 oct 2026 = viernes
    const t = computeTotals("2026-10", cfg);
    expect(t.buckets).toEqual({ lab: 9, sdf: 8, esp: 0 });
    expect(t.guardiasBruto).toBe(Math.round((9 * 14.07 + 8 * 15.78) * 100) / 100);
  });

  it("guardia el último día del mes: 8 h se difieren al mes siguiente", () => {
    const cfg = newMonthConfig("R1");
    cfg.days[30] = { guardia: { mode: "24", customHours: 17 } };
    expect(deferredHours("2026-09", cfg)).toBe(8);
    expect(computeTotals("2026-09", cfg).deferredTotal).toBe(8);
  });

  it("vacaciones reducen los días trabajados y anulan la guardia", () => {
    const cfg = newMonthConfig("R2");
    cfg.days[1] = { type: "vac", guardia: { mode: "17", customHours: 17 } };
    const t = computeTotals("2026-09", cfg);
    expect(t.workedDays).toBe(29);
    expect(t.guardias).toBe(0);
  });

  it("IRPF solo aplica desde R2", () => {
    const r1 = newMonthConfig("R1", 15);
    const r2 = newMonthConfig("R2", 15);
    expect(computeTotals("2026-09", r1).irpfAmount).toBe(0);
    expect(computeTotals("2026-09", r2).irpfAmount).toBeGreaterThan(0);
    expect(estimateIrpf(0)).toBe(0);
  });
});
