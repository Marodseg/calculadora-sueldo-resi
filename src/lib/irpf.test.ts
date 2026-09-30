import { describe, expect, it } from "vitest";
import { aplicarEscala, estimateIrpfAnual, reduccionRendimientosTrabajo } from "./irpf";

describe("aplicarEscala", () => {
  it("aplica los tramos de forma progresiva", () => {
    expect(aplicarEscala(0)).toBe(0);
    expect(aplicarEscala(12_450)).toBeCloseTo(2_365.5, 2);
    expect(aplicarEscala(20_200)).toBeCloseTo(2_365.5 + 7_750 * 0.24, 2);
    expect(aplicarEscala(30_725)).toBeCloseTo(7_383, 2);
  });
});

describe("reduccionRendimientosTrabajo", () => {
  it("es máxima con rendimientos bajos, decrece de forma lineal y se anula", () => {
    expect(reduccionRendimientosTrabajo(10_000)).toBe(7_302);
    expect(reduccionRendimientosTrabajo(16_700)).toBeCloseTo(7_302 - 1.75 * (16_700 - 14_852), 2);
    expect(reduccionRendimientosTrabajo(20_000)).toBe(0);
  });
});

describe("estimateIrpfAnual", () => {
  it("no retiene por debajo del límite de 15.876 €", () => {
    const e = estimateIrpfAnual(15_000, 975);
    expect(e.exento).toBe(true);
    expect(e.cuota).toBe(0);
    expect(e.pct).toBe(0);
  });

  it("calcula un tipo razonable con un bruto medio", () => {
    const e = estimateIrpfAnual(35_000, 2_275);
    expect(e.exento).toBe(false);
    expect(e.rendimientoNeto).toBe(30_725);
    expect(e.reduccion).toBe(0);
    expect(e.cuota).toBeCloseTo(7_383 - 1_054.5, 2);
    expect(e.pct).toBeCloseTo(18.08, 2);
  });

  it("el tipo sube con el bruto", () => {
    expect(estimateIrpfAnual(45_000, 2_925).pct).toBeGreaterThan(estimateIrpfAnual(30_000, 1_950).pct);
  });

  it("sin ingresos devuelve 0", () => {
    expect(estimateIrpfAnual(0, 0).pct).toBe(0);
  });
});
