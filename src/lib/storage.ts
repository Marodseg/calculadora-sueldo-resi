import type { AppData, MonthConfig, Year } from "./types";
import { YEARS } from "./rates";

const KEY = "sueldo-resi:v1";
const LEGACY_PREFS = "mirCalcPrefs";

export const emptyData = (): AppData => ({ version: 1, months: {}, lastYear: "R1" });

export function newMonthConfig(year: Year, irpfPct: number | null = null): MonthConfig {
  return { year, irpfPct, days: {}, extras: [], updatedAt: Date.now() };
}

export function sanitize(raw: unknown): AppData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<AppData>;
  if (!r.months || typeof r.months !== "object") return null;
  const months: Record<string, MonthConfig> = {};
  for (const [k, v] of Object.entries(r.months)) {
    if (!/^\d{4}-\d{2}$/.test(k) || !v || typeof v !== "object") continue;
    const m = v as MonthConfig;
    months[k] = {
      year: YEARS.includes(m.year) ? m.year : "R1",
      irpfPct: typeof m.irpfPct === "number" ? m.irpfPct : null,
      days: m.days && typeof m.days === "object" ? m.days : {},
      extras: Array.isArray(m.extras) ? m.extras : [],
      carryDismissed: !!m.carryDismissed,
      updatedAt: typeof m.updatedAt === "number" ? m.updatedAt : Date.now(),
    };
  }
  return { version: 1, months, lastYear: YEARS.includes(r.lastYear as Year) ? (r.lastYear as Year) : "R1" };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = sanitize(JSON.parse(raw));
      if (d) return d;
    }
    // Migración desde la versión artifact (solo recordaba año y mes).
    const legacy = localStorage.getItem(LEGACY_PREFS);
    if (legacy) {
      const p = JSON.parse(legacy);
      if (YEARS.includes(p?.year)) return { ...emptyData(), lastYear: p.year };
    }
  } catch {
    /* localStorage no disponible o JSON corrupto */
  }
  return emptyData();
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* cuota o modo privado */
  }
}
