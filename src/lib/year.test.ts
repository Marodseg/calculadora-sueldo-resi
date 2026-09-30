import { describe, expect, it } from "vitest";
import { computeTotals } from "./calc";
import { newMonthConfig } from "./storage";
import { projectYear } from "./year";

const cfgWith = (guardias: number[]) => {
  const c = newMonthConfig("R2", 10);
  for (const d of guardias) c.days[d] = { guardia: { mode: "17", customHours: 17 } };
  return c;
};

describe("projectYear", () => {
  it("sin datos no proyecta nada", () => {
    const p = projectYear({}, 2026);
    expect(p.realCount).toBe(0);
    expect(p.brutoAnual).toBe(0);
    expect(p.months.every((m) => m.projected && m.bruto === 0)).toBe(true);
  });

  it("proyecta los meses siguientes con la media de los guardados y deja a 0 los anteriores", () => {
    const saved = { "2026-06": cfgWith([3, 10]), "2026-07": cfgWith([1, 8, 15, 22]) };
    const p = projectYear(saved, 2026);
    const june = computeTotals("2026-06", saved["2026-06"]);
    const july = computeTotals("2026-07", saved["2026-07"]);

    expect(p.realCount).toBe(2);
    expect(p.months[4]).toMatchObject({ key: "2026-05", projected: true, bruto: 0 }); // antes del primero
    expect(p.months[5].projected).toBe(false);
    expect(p.months[7].projected).toBe(true);
    expect(p.months[7].bruto).toBeCloseTo((june.bruto + july.bruto) / 2, 1);
    // jun + jul reales + 5 meses proyectados (ago–dic)
    expect(p.brutoAnual).toBeCloseTo(june.bruto + july.bruto + 5 * ((june.bruto + july.bruto) / 2), 0);
  });

  it("incluye el mes activo aunque no esté guardado", () => {
    const p = projectYear({}, 2026, { key: "2026-09", cfg: cfgWith([2]) });
    expect(p.realCount).toBe(1);
    expect(p.months[8].projected).toBe(false);
    expect(p.months[9].projected).toBe(true); // octubre en adelante, con la media
    expect(p.months[7].bruto).toBe(0); // agosto: anterior al primer mes con datos
  });

  it("el neto anual descuenta Seguridad Social e IRPF estimado", () => {
    const p = projectYear({ "2026-09": cfgWith([2, 9, 16]) }, 2026);
    expect(p.netoAnual).toBeCloseTo(p.brutoAnual - p.seguridadSocialAnual - p.irpf.cuota, 1);
  });
});
