import { buildDays, computeTotals, monthKey, r2 } from "./calc";
import type { GuardiaMode, MonthConfig, PayType } from "./types";

export interface MonthGuardias {
  key: string;
  /** Guardias que empiezan en el mes. */
  guardias: number;
  /** Horas de guardia pagadas con el mes (incluye las arrastradas del mes anterior). */
  hours: number;
  hasData: boolean;
}

export interface GuardiaSummary {
  year: number;
  /** Meses del año con datos guardados. */
  monthsCount: number;
  guardias: number;
  byMode: Record<GuardiaMode, number>;
  /** Horas pagadas por tarifa. */
  hours: Record<PayType, number>;
  totalHours: number;
  guardiasBruto: number;
  brutoTotal: number;
  /** % del bruto que representan las guardias. */
  guardiasShare: number;
  /** Guardias que empiezan cada día de la semana, de lunes (0) a domingo (6). */
  byWeekday: number[];
  /** Guardias que empiezan en fin de semana, festivo o festivo especial. */
  onWeekendOrHoliday: number;
  monthly: MonthGuardias[];
  busiest: { key: string; guardias: number } | null;
  vacDays: number;
  bajaDays: number;
}

/**
 * Resume las guardias de un año natural a partir de los meses guardados (no proyecta: solo cuenta lo real).
 * Las horas son las que se pagan en cada mes, así que las que cruzan al mes siguiente se cuentan en ese.
 */
export function summarizeGuardias(saved: Record<string, MonthConfig>, year: number): GuardiaSummary {
  const summary: GuardiaSummary = {
    year,
    monthsCount: 0,
    guardias: 0,
    byMode: { "17": 0, "24": 0, custom: 0 },
    hours: { lab: 0, sdf: 0, esp: 0 },
    totalHours: 0,
    guardiasBruto: 0,
    brutoTotal: 0,
    guardiasShare: 0,
    byWeekday: Array(7).fill(0),
    onWeekendOrHoliday: 0,
    monthly: [],
    busiest: null,
    vacDays: 0,
    bajaDays: 0,
  };

  for (let m = 1; m <= 12; m++) {
    const key = monthKey(year, m);
    const cfg = saved[key];
    if (!cfg) {
      summary.monthly.push({ key, guardias: 0, hours: 0, hasData: false });
      continue;
    }

    const totals = computeTotals(key, cfg);
    const days = buildDays(key, cfg.days);
    summary.monthsCount++;
    summary.brutoTotal += totals.bruto;
    summary.guardiasBruto += totals.guardiasBruto;

    let monthHours = 0;
    for (const rate of ["lab", "sdf", "esp"] as PayType[]) {
      const h = totals.buckets[rate] + totals.extrasBuckets[rate];
      summary.hours[rate] += h;
      monthHours += h;
    }

    for (const day of days) {
      if (day.type === "vac") summary.vacDays++;
      if (day.type === "baja") summary.bajaDays++;
      if (!day.guardia) continue;
      summary.guardias++;
      summary.byMode[day.guardia.mode]++;
      summary.byWeekday[(day.weekday + 6) % 7]++;
      if (day.type !== "lab") summary.onWeekendOrHoliday++;
    }

    summary.monthly.push({ key, guardias: totals.guardias, hours: monthHours, hasData: true });
    if (totals.guardias > 0 && (!summary.busiest || totals.guardias > summary.busiest.guardias)) {
      summary.busiest = { key, guardias: totals.guardias };
    }
  }

  summary.totalHours = summary.hours.lab + summary.hours.sdf + summary.hours.esp;
  summary.guardiasBruto = r2(summary.guardiasBruto);
  summary.brutoTotal = r2(summary.brutoTotal);
  summary.guardiasShare = summary.brutoTotal > 0 ? (summary.guardiasBruto / summary.brutoTotal) * 100 : 0;
  return summary;
}
