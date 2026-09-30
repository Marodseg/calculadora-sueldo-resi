import { holidaysOfMonth } from "./holidays";
import { EMPRESA, MIN_CC, RATES, SS, SUELDO_BASE } from "./rates";
import type { DayOverride, DayView, MonthConfig, PayType } from "./types";

export const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export function parseMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return { y, m };
}
export const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
export function shiftMonth(key: string, delta: number) {
  const { y, m } = parseMonth(key);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d.getFullYear(), d.getMonth() + 1);
}
export function currentMonthKey() {
  const d = new Date();
  return monthKey(d.getFullYear(), d.getMonth() + 1);
}
export function monthLabel(key: string, opts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" }) {
  const { y, m } = parseMonth(key);
  return new Date(y, m - 1, 1).toLocaleDateString("es-ES", opts);
}

/** Día de la semana (0 = domingo) del día 1 del mes. */
export function firstWeekday(key: string) {
  const { y, m } = parseMonth(key);
  return new Date(y, m - 1, 1).getDay();
}

export function buildDays(key: string, overrides: Record<number, DayOverride>): DayView[] {
  const { y, m } = parseMonth(key);
  const count = new Date(y, m, 0).getDate();
  const holidays = holidaysOfMonth(key);
  const out: DayView[] = [];
  for (let n = 1; n <= count; n++) {
    const weekday = new Date(y, m - 1, n).getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const holiday = holidays[n];
    const defaultType = isWeekend || holiday ? "sdf" : "lab";
    const o = overrides[n];
    const type = o?.type ?? defaultType;
    const absent = type === "vac" || type === "baja";
    out.push({ n, weekday, isWeekend, holiday, defaultType, type, guardia: absent ? null : (o?.guardia ?? null) });
  }
  return out;
}

export interface GuardiaSplit {
  day0: number;
  day1: number;
  day1Type: PayType | null;
  /** Horas que caen ya en el mes siguiente. */
  deferred: number;
}

/** Tarifa de un día: si está de vacaciones o de baja se paga según su tipo por defecto (fin de semana/festivo o laborable). */
const asPay = (d: DayView): PayType => (d.type === "vac" || d.type === "baja" ? d.defaultType : d.type);

/** Reparte las horas de una guardia que empieza en `idx` entre el día de inicio y el siguiente (corte a medianoche). */
export function splitGuardia(days: DayView[], idx: number): GuardiaSplit {
  const g = days[idx].guardia;
  if (!g) return { day0: 0, day1: 0, day1Type: null, deferred: 0 };
  if (g.mode === "custom") return { day0: g.customHours || 0, day1: 0, day1Type: null, deferred: 0 };
  const day0 = g.mode === "24" ? 16 : 9;
  const h1 = 8;
  if (idx + 1 < days.length) return { day0, day1: h1, day1Type: asPay(days[idx + 1]), deferred: 0 };
  return { day0, day1: 0, day1Type: null, deferred: h1 };
}

/** Horas de guardia del último día del mes que se pagarán en el mes siguiente. */
export function deferredHours(key: string, cfg: MonthConfig) {
  const days = buildDays(key, cfg.days);
  const last = days.length - 1;
  const s = splitGuardia(days, last);
  return s.deferred;
}

/** Tipo de tarifa del primer día del mes siguiente (para las horas arrastradas). */
export function nextMonthFirstDayType(key: string): PayType {
  const { y, m } = parseMonth(key);
  const next = shiftMonth(key, 1);
  const isWeekend = [0, 6].includes(new Date(y, m, 1).getDay());
  return isWeekend || holidaysOfMonth(next)[1] ? "sdf" : "lab";
}

export interface Totals {
  daysInMonth: number;
  workedDays: number;
  guardias: number;
  buckets: Record<PayType, number>;
  extrasBuckets: Record<PayType, number>;
  guardiasBruto: number;
  extrasBruto: number;
  deferredTotal: number;
  sueldoOrdinario: number;
  totalBaseDesempleo: number;
  minCC: number;
  totalBaseCC: number;
  desemDed: number;
  fpDed: number;
  ccDed: number;
  totalSS: number;
  bruto: number;
  irpfPct: number;
  irpfAmount: number;
  neto: number;
  emp: { cc: number; it: number; ims: number; desempleo: number; fp: number; total: number };
}

export function computeTotals(key: string, cfg: MonthConfig): Totals {
  const r = RATES[cfg.year];
  const days = buildDays(key, cfg.days);
  const daysInMonth = days.length;
  const workedDays = days.filter((d) => d.type !== "vac" && d.type !== "baja").length;

  const buckets: Record<PayType, number> = { lab: 0, sdf: 0, esp: 0 };
  let deferredTotal = 0;
  let guardias = 0;
  days.forEach((d, idx) => {
    if (!d.guardia) return;
    guardias++;
    const s = splitGuardia(days, idx);
    const t = d.type as PayType; // con guardia el día nunca es vac/baja
    buckets[t] += s.day0;
    if (s.day1 > 0 && s.day1Type) buckets[s.day1Type] += s.day1;
    deferredTotal += s.deferred;
  });

  const extrasBuckets: Record<PayType, number> = { lab: 0, sdf: 0, esp: 0 };
  cfg.extras.forEach((e) => {
    if (e.hours > 0) extrasBuckets[e.type] += e.hours;
  });
  const extrasBruto = r2(extrasBuckets.lab * r.lab + extrasBuckets.sdf * r.sdf + extrasBuckets.esp * r.esp);
  const guardiasBruto = r2(buckets.lab * r.lab + buckets.sdf * r.sdf + buckets.esp * r.esp + extrasBruto);

  const sueldoFull = r2(SUELDO_BASE + r.comp);
  const sueldoOrdinario = r2((sueldoFull * workedDays) / daysInMonth);

  const baseDesempleoOrd = r2((sueldoOrdinario * 7) / 6);
  const totalBaseDesempleo = r2(baseDesempleoOrd + guardiasBruto);
  const minCC = r2((MIN_CC * workedDays) / daysInMonth);
  const totalBaseCC = Math.max(minCC, totalBaseDesempleo);

  const desemDed = r2(totalBaseDesempleo * SS.desempleo);
  const fpDed = r2(totalBaseDesempleo * SS.fp);
  const ccDed = r2(totalBaseCC * SS.cc);
  const totalSS = r2(desemDed + fpDed + ccDed);

  const bruto = r2(sueldoOrdinario + guardiasBruto);
  const irpfPct = cfg.year === "R1" ? 0 : cfg.irpfPct || 0;
  const irpfAmount = r2((bruto * irpfPct) / 100);
  const neto = r2(bruto - totalSS - irpfAmount);

  const emp = {
    cc: r2(totalBaseCC * EMPRESA.cc),
    it: r2(totalBaseDesempleo * EMPRESA.it),
    ims: r2(totalBaseDesempleo * EMPRESA.ims),
    desempleo: r2(totalBaseDesempleo * EMPRESA.desempleo),
    fp: r2(totalBaseDesempleo * EMPRESA.fp),
    total: 0,
  };
  emp.total = r2(emp.cc + emp.it + emp.ims + emp.desempleo + emp.fp);

  return {
    daysInMonth,
    workedDays,
    guardias,
    buckets,
    extrasBuckets,
    guardiasBruto,
    extrasBruto,
    deferredTotal,
    sueldoOrdinario,
    totalBaseDesempleo,
    minCC,
    totalBaseCC,
    desemDed,
    fpDed,
    ccDed,
    totalSS,
    bruto,
    irpfPct,
    irpfAmount,
    neto,
    emp,
  };
}

/** Estimación aproximada (solo orientativa) del % de IRPF proyectando el bruto del mes a 12 meses. */
export function estimateIrpf(bruto: number) {
  const annual = bruto * 12;
  const taxable = Math.max(0, annual - 5550);
  const brackets: [number, number][] = [
    [12450, 0.19],
    [20200, 0.24],
    [35200, 0.3],
    [60000, 0.37],
    [300000, 0.45],
  ];
  let tax = 0;
  let prev = 0;
  for (const [upper, rate] of brackets) {
    if (taxable > prev) {
      tax += (Math.min(taxable, upper) - prev) * rate;
      prev = upper;
    }
  }
  return annual > 0 ? Math.round((tax / annual) * 1000) / 10 : 0;
}

export const fmtEur = (n: number) => {
  const v = r2(n);
  return (
    (Object.is(v, -0) ? 0 : v).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
  );
};
export const fmtNum = (n: number) =>
  r2(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtEurShort = (n: number) => Math.round(n).toLocaleString("es-ES") + " €";
