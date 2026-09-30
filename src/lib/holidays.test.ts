import { describe, expect, it } from "vitest";
import { easterSunday, holidaysOf, holidaysOfMonth } from "./holidays";

const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

describe("easterSunday", () => {
  it("coincide con las fechas reales de Pascua", () => {
    expect(ymd(easterSunday(2024))).toBe("2024-3-31");
    expect(ymd(easterSunday(2025))).toBe("2025-4-20");
    expect(ymd(easterSunday(2026))).toBe("2026-4-5");
    expect(ymd(easterSunday(2027))).toBe("2027-3-28");
  });
});

describe("holidaysOf", () => {
  it("incluye Semana Santa, Corpus de Granada y la Toma", () => {
    const h = holidaysOf(2026);
    expect(h.get("04-02")).toBe("Jueves Santo");
    expect(h.get("04-03")).toBe("Viernes Santo");
    expect(h.get("06-04")).toBe("Corpus Christi (Granada)");
    expect(h.get("01-02")).toBe("Toma de Granada");
  });

  it("traslada al lunes los festivos que caen en domingo", () => {
    const h = holidaysOf(2026);
    // 1 nov y 6 dic de 2026 son domingo.
    expect(h.has("11-01")).toBe(false);
    expect(h.get("11-02")).toBe("Todos los Santos (traslado)");
    expect(h.has("12-06")).toBe(false);
    expect(h.get("12-07")).toBe("Día de la Constitución (traslado)");
  });

  it("no traslada los que caen en sábado", () => {
    expect(holidaysOf(2026).get("08-15")).toBe("Asunción de la Virgen"); // sábado
  });

  it("junta dos festivos que coinciden en el mismo día", () => {
    // 1 ene 2023 es domingo: Año Nuevo pasa al lunes 2, día de la Toma de Granada.
    expect(holidaysOf(2023).get("01-02")).toBe("Año Nuevo (traslado) · Toma de Granada");
  });
});

describe("holidaysOfMonth", () => {
  it("devuelve solo los del mes pedido", () => {
    expect(Object.keys(holidaysOfMonth("2026-04")).map(Number)).toEqual([2, 3]);
    expect(holidaysOfMonth("2026-09")).toEqual({});
  });
});
