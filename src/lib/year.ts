import { computeTotals, monthKey, r2 } from "./calc";
import { estimateIrpfAnual, type IrpfEstimate } from "./irpf";
import type { MonthConfig } from "./types";

export interface YearMonth {
  key: string;
  /** true = mes sin configurar, estimado con la media de los meses que sí tienes. */
  projected: boolean;
  bruto: number;
  seguridadSocial: number;
  neto: number;
}

export interface YearProjection {
  year: number;
  months: YearMonth[];
  /** Meses con datos reales (guardados o el que se está editando). */
  realCount: number;
  brutoAnual: number;
  seguridadSocialAnual: number;
  irpf: IrpfEstimate;
  /** Bruto − Seguridad Social − cuota de IRPF estimada. */
  netoAnual: number;
}

/**
 * Proyecta el año natural `year`.
 *
 * - Meses con datos: se usan tal cual.
 * - Meses posteriores al primero con datos y sin configurar: se estiman con la media de los que sí tienen.
 * - Meses anteriores al primero con datos: se consideran no trabajados (importe 0).
 *
 * `active` permite incluir el mes que se está editando aunque todavía no esté guardado.
 */
export function projectYear(
  saved: Record<string, MonthConfig>,
  year: number,
  active?: { key: string; cfg: MonthConfig },
): YearProjection {
  const keys = Array.from({ length: 12 }, (_, i) => monthKey(year, i + 1));
  const real = new Map<string, MonthConfig>();
  for (const k of keys) if (saved[k]) real.set(k, saved[k]);
  if (active && keys.includes(active.key) && !real.has(active.key)) real.set(active.key, active.cfg);

  const totals = new Map(Array.from(real, ([k, cfg]) => [k, computeTotals(k, cfg)]));
  const realCount = totals.size;
  const avgBruto = realCount ? [...totals.values()].reduce((a, t) => a + t.bruto, 0) / realCount : 0;
  const avgSs = realCount ? [...totals.values()].reduce((a, t) => a + t.totalSS, 0) / realCount : 0;
  const firstReal = keys.findIndex((k) => totals.has(k));

  // Los meses proyectados usan el mismo % de retención que se calcula para el año completo (ver más abajo).
  const draft = keys.map((key, i): YearMonth => {
    const t = totals.get(key);
    if (t) return { key, projected: false, bruto: t.bruto, seguridadSocial: t.totalSS, neto: t.neto };
    if (firstReal === -1 || i < firstReal) return { key, projected: true, bruto: 0, seguridadSocial: 0, neto: 0 };
    return { key, projected: true, bruto: r2(avgBruto), seguridadSocial: r2(avgSs), neto: 0 };
  });

  const brutoAnual = r2(draft.reduce((a, m) => a + m.bruto, 0));
  const seguridadSocialAnual = r2(draft.reduce((a, m) => a + m.seguridadSocial, 0));
  const irpf = estimateIrpfAnual(brutoAnual, seguridadSocialAnual);

  const months = draft.map((m) =>
    m.projected ? { ...m, neto: r2(m.bruto - m.seguridadSocial - (m.bruto * irpf.pct) / 100) } : m,
  );

  return {
    year,
    months,
    realCount,
    brutoAnual,
    seguridadSocialAnual,
    irpf,
    netoAnual: r2(brutoAnual - seguridadSocialAnual - irpf.cuota),
  };
}
