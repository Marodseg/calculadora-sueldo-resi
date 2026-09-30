import { describe, expect, it } from "vitest";
import { buildDays, computeTotals } from "./calc";
import { buildSummaryText } from "./share";
import { newMonthConfig } from "./storage";

function input(mutate: (cfg: ReturnType<typeof newMonthConfig>) => void) {
  const cfg = newMonthConfig("R1");
  mutate(cfg);
  const month = "2026-09";
  return { month, cfg, totals: computeTotals(month, cfg), days: buildDays(month, cfg.days) };
}

describe("buildSummaryText", () => {
  it("resume guardias, vacaciones y, si se pide, los importes", () => {
    const i = input((c) => {
      c.days[2] = { guardia: { mode: "17", customHours: 17 } };
      c.days[9] = { guardia: { mode: "24", customHours: 17 } };
      c.days[14] = { type: "vac" };
      c.days[15] = { type: "vac" };
    });
    const text = buildSummaryText(i, true);
    expect(text).toContain("Septiembre de 2026 · R1");
    expect(text).toContain("Guardias (2): días 2, 9");
    expect(text).toContain("Vacaciones: 2 días");
    expect(text).toMatch(/Líquido: .* €/);
  });

  it("no incluye importes si se ocultan", () => {
    const text = buildSummaryText(
      input((c) => (c.days[2] = { guardia: { mode: "17", customHours: 17 } })),
      false,
    );
    expect(text).not.toMatch(/€/);
    expect(text).toContain("Guardias (1): día");
  });

  it("indica cuando no hay guardias", () => {
    expect(
      buildSummaryText(
        input(() => {}),
        false,
      ),
    ).toContain("Sin guardias");
  });
});
