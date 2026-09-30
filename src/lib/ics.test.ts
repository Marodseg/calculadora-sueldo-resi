import ICAL from "ical.js";
import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine, type IcsOptions, type IcsMonth } from "./ics";
import { newMonthConfig } from "./storage";
import type { GuardiaMode, MonthConfig } from "./types";

const NOW = new Date("2026-09-30T12:00:00Z");
const ALL: IcsOptions = { guardias: true, ausencias: true, festivos: true, reminder: "none", now: NOW };

function cfg(days: Record<number, { mode?: GuardiaMode; hours?: number; type?: "vac" | "baja" | "esp" }>): MonthConfig {
  const c = newMonthConfig("R1");
  for (const [d, o] of Object.entries(days)) {
    c.days[Number(d)] = { type: o.type, guardia: o.mode ? { mode: o.mode, customHours: o.hours ?? 17 } : undefined };
  }
  return c;
}

/** Parsea el .ics con una librería independiente y devuelve sus eventos. */
function parse(content: string) {
  const root = new ICAL.Component(ICAL.parse(content));
  return {
    root,
    events: root.getAllSubcomponents("vevent").map((c) => new ICAL.Event(c)),
  };
}

const sep = (month: string, ...rest: IcsMonth[]): IcsMonth[] => [{ key: month, cfg: null }, ...rest];

describe("formato del archivo", () => {
  it("es un VCALENDAR válido con zona horaria de Madrid y saltos de línea CRLF", () => {
    const { content } = buildIcs([{ key: "2026-09", cfg: cfg({ 2: { mode: "17" } }) }], ALL);
    expect(content.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(content.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(content).not.toMatch(/[^\r]\n/); // ningún LF suelto

    const { root } = parse(content);
    expect(root.getFirstPropertyValue("version")).toBe("2.0");
    expect(root.getFirstSubcomponent("vtimezone")?.getFirstPropertyValue("tzid")).toBe("Europe/Madrid");
  });

  it("ninguna línea supera los 75 octetos", () => {
    const long = cfg({ 2: { mode: "17" } });
    const { content } = buildIcs([{ key: "2026-04", cfg: long }], ALL);
    for (const line of content.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("escapa comas, punto y coma, barras y saltos de línea", () => {
    // Se comprueba carácter a carácter para no repetir en el test el mismo escape que usa el código.
    const escaped = escapeText("a,b;c\\d\ne");
    expect(escaped).toBe(["a", "\\", ",", "b", "\\", ";", "c", "\\", "\\", "d", "\\", "n", "e"].join(""));
    expect(escaped).not.toContain("\n"); // ya no hay un salto de línea real
  });

  it("dobla líneas largas sin partir caracteres multibyte", () => {
    const text = "SUMMARY:" + "ñ".repeat(80);
    const folded = foldLine(text);
    for (const part of folded.split("\r\n")) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(text);
  });
});

describe("guardias", () => {
  it("una guardia de 17 h va de 15:00 a las 08:00 del día siguiente, en hora de Madrid", () => {
    const { events } = parse(buildIcs([{ key: "2026-09", cfg: cfg({ 2: { mode: "17" } }) }], ALL).content);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.summary).toBe("Guardia 17 h");
    expect(e.startDate.toString()).toBe("2026-09-02T15:00:00");
    expect(e.endDate.toString()).toBe("2026-09-03T08:00:00");
    expect(e.startDate.zone.tzid).toBe("Europe/Madrid");
    // 15:00 CEST (UTC+2) = 13:00 UTC
    expect(e.startDate.toJSDate().toISOString()).toBe("2026-09-02T13:00:00.000Z");
    expect(e.duration.toSeconds() / 3600).toBe(17);
  });

  it("una guardia de 24 h dura 24 horas desde las 08:00", () => {
    const { events } = parse(buildIcs([{ key: "2026-09", cfg: cfg({ 5: { mode: "24" } }) }], ALL).content);
    expect(events[0].startDate.toString()).toBe("2026-09-05T08:00:00");
    expect(events[0].endDate.toString()).toBe("2026-09-06T08:00:00");
    expect(events[0].duration.toSeconds() / 3600).toBe(24);
  });

  it("respeta el cambio de hora: en invierno 15:00 son las 14:00 UTC", () => {
    const { events } = parse(buildIcs([{ key: "2026-12", cfg: cfg({ 3: { mode: "17" } }) }], ALL).content);
    expect(events[0].startDate.toJSDate().toISOString()).toBe("2026-12-03T14:00:00.000Z");
  });

  it("una guardia a medida es un evento de día completo con las horas en el título", () => {
    const { events } = parse(
      buildIcs([{ key: "2026-09", cfg: cfg({ 7: { mode: "custom", hours: 12.5 } }) }], ALL).content,
    );
    expect(events[0].summary).toBe("Guardia (12,5 h)");
    expect(events[0].startDate.isDate).toBe(true);
    expect(events[0].startDate.toString()).toBe("2026-09-07");
  });

  it("una guardia en el último día del mes acaba en el mes siguiente", () => {
    const { events } = parse(buildIcs([{ key: "2026-09", cfg: cfg({ 30: { mode: "17" } }) }], ALL).content);
    expect(events[0].endDate.toString()).toBe("2026-10-01T08:00:00");
  });

  it("la descripción indica la tarifa del día de inicio", () => {
    const { events } = parse(buildIcs([{ key: "2026-09", cfg: cfg({ 5: { mode: "24" } }) }], ALL).content);
    expect(events[0].description).toContain("Fin de semana / festivo");
  });

  it("añade el recordatorio pedido", () => {
    const month = [{ key: "2026-09", cfg: cfg({ 2: { mode: "17" } }) }];
    const trigger = (reminder: IcsOptions["reminder"]) => {
      const { root } = parse(buildIcs(month, { ...ALL, reminder }).content);
      return root
        .getFirstSubcomponent("vevent")
        ?.getFirstSubcomponent("valarm")
        ?.getFirstPropertyValue("trigger")
        ?.toString();
    };
    expect(trigger("none")).toBeUndefined();
    expect(trigger("1h")).toBe("-PT1H");
    expect(trigger("1d")).toBe("-P1D");
  });
});

describe("ausencias y festivos", () => {
  it("une los días consecutivos de vacaciones en un solo evento", () => {
    const { events } = parse(
      buildIcs(
        [
          {
            key: "2026-09",
            cfg: cfg({ 14: { type: "vac" }, 15: { type: "vac" }, 16: { type: "vac" }, 22: { type: "vac" } }),
          },
        ],
        { ...ALL, festivos: false },
      ).content,
    );
    const vac = events.filter((e) => e.summary === "Vacaciones");
    expect(vac).toHaveLength(2);
    expect(vac[0].startDate.toString()).toBe("2026-09-14");
    expect(vac[0].endDate.toString()).toBe("2026-09-17"); // fin exclusivo
    expect(vac[0].description).toBe("Vacaciones: 3 días.");
  });

  it("une vacaciones que cruzan de un mes a otro y no mezcla vacaciones con bajas", () => {
    const months: IcsMonth[] = [
      { key: "2026-09", cfg: cfg({ 29: { type: "vac" }, 30: { type: "vac" } }) },
      { key: "2026-10", cfg: cfg({ 1: { type: "vac" }, 2: { type: "baja" } }) },
    ];
    const { events } = parse(buildIcs(months, { ...ALL, festivos: false }).content);
    expect(events.map((e) => `${e.summary} ${e.startDate} ${e.endDate}`)).toEqual([
      "Vacaciones 2026-09-29 2026-10-02",
      "Baja / ausencia 2026-10-02 2026-10-03",
    ]);
  });

  it("incluye los festivos del mes como eventos de día completo que no ocupan", () => {
    const { events } = parse(buildIcs([{ key: "2026-04", cfg: null }], ALL).content);
    expect(events.map((e) => e.summary)).toEqual(["Festivo: Jueves Santo", "Festivo: Viernes Santo"]);
    expect(events[0].component.getFirstPropertyValue("transp")).toBe("TRANSPARENT");
  });

  it("los meses sin configurar solo aportan festivos", () => {
    const result = buildIcs(sep("2026-06"), ALL);
    const { events } = parse(result.content);
    expect(events.map((e) => e.summary)).toEqual(["Festivo: Corpus Christi (Granada)"]);
    expect(result.events).toBe(1);
  });
});

describe("opciones y estabilidad", () => {
  const months = [{ key: "2026-04", cfg: cfg({ 2: { mode: "24" }, 7: { mode: "17" }, 20: { type: "vac" } }) }];

  it("respeta lo que se activa y se desactiva", () => {
    const names = (o: Partial<IcsOptions>) =>
      parse(buildIcs(months, { ...ALL, ...o }).content).events.map((e) => e.summary);
    expect(names({ festivos: false, ausencias: false })).toEqual(["Guardia 24 h", "Guardia 17 h"]);
    expect(names({ guardias: false, ausencias: false })).toEqual(["Festivo: Jueves Santo", "Festivo: Viernes Santo"]);
    expect(names({ guardias: false, festivos: false })).toEqual(["Vacaciones"]);
    expect(names({ guardias: false, festivos: false, ausencias: false })).toEqual([]);
  });

  it("los UID son estables entre exportaciones (así se actualiza en vez de duplicar) y únicos", () => {
    const uids = (now: Date) => parse(buildIcs(months, { ...ALL, now }).content).events.map((e) => e.uid);
    const first = uids(NOW);
    expect(uids(new Date("2026-10-15T08:00:00Z"))).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
  });

  it("el SEQUENCE crece con el tiempo para que los calendarios acepten la actualización", () => {
    const seq = (now: Date) =>
      Number(parse(buildIcs(months, { ...ALL, now }).content).events[0].component.getFirstPropertyValue("sequence"));
    expect(seq(new Date("2026-10-15T08:00:00Z"))).toBeGreaterThan(seq(NOW));
  });

  it("cuenta los eventos generados", () => {
    expect(buildIcs(months, ALL).events).toBe(parse(buildIcs(months, ALL).content).events.length);
  });
});
