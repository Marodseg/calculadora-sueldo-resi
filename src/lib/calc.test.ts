import { describe, expect, it } from "vitest";
import { computeTotals, deferredHours, nextMonthFirstDayType, shiftMonth } from "./calc";
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
  });
});

describe("meses y arrastre", () => {
  it("shiftMonth cruza el cambio de año", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("las horas arrastradas cobran a la tarifa del primer día del mes siguiente", () => {
    expect(nextMonthFirstDayType("2026-09")).toBe("lab"); // 1 oct 2026 = jueves
    expect(nextMonthFirstDayType("2026-07")).toBe("sdf"); // 1 ago 2026 = sábado
  });

  it("las horas extra entran en el bruto a su tarifa", () => {
    const cfg = newMonthConfig("R1");
    cfg.extras.push({ id: "x", hours: 8, type: "sdf" });
    expect(computeTotals("2026-10", cfg).extrasBruto).toBe(Math.round(8 * 15.78 * 100) / 100);
  });
});

describe("festivos en el cálculo", () => {
  it("un festivo entre semana cuenta como fin de semana/festivo para la guardia", () => {
    const cfg = newMonthConfig("R1");
    cfg.days[2] = { guardia: { mode: "17", customHours: 17 } }; // jueves 2 abr 2026 = Jueves Santo
    const t = computeTotals("2026-04", cfg);
    expect(t.buckets.sdf).toBe(9 + 8); // 9 h del festivo + 8 h del Viernes Santo (también festivo)
    expect(t.buckets.lab).toBe(0);
  });

  it("los festivos no reducen los días trabajados (se cobra el sueldo completo)", () => {
    expect(computeTotals("2026-04", newMonthConfig("R1")).workedDays).toBe(30);
  });

  it("las horas arrastradas del mes anterior usan la tarifa de festivo si el día 1 lo es", () => {
    expect(nextMonthFirstDayType("2026-12")).toBe("sdf"); // 1 ene 2027 = festivo (viernes)
  });
});
