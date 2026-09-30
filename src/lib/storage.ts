import { YEARS } from "./rates";
import type { AppData, DayOverride, DayType, ExtraHours, GuardiaMode, MonthConfig, PayType, Year } from "./types";

const STORAGE_KEY = "sueldo-resi:v1";
/** Clave de la primera versión (prototipo), que solo recordaba el año de residencia. */
const LEGACY_PREFS_KEY = "mirCalcPrefs";

const DAY_TYPES: DayType[] = ["lab", "sdf", "esp", "vac", "baja"];
const PAY_TYPES: PayType[] = ["lab", "sdf", "esp"];
const GUARDIA_MODES: GuardiaMode[] = ["17", "24", "custom"];

export const emptyData = (): AppData => ({ version: 1, months: {}, lastYear: "R1" });

export function newMonthConfig(year: Year, irpfPct: number | null = null): MonthConfig {
  return { year, irpfPct, days: {}, extras: [], carryDismissed: false, updatedAt: Date.now() };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isYear = (v: unknown): v is Year => YEARS.includes(v as Year);

function sanitizeDays(raw: unknown): Record<number, DayOverride> {
  const days: Record<number, DayOverride> = {};
  if (!isRecord(raw)) return days;
  for (const [key, value] of Object.entries(raw)) {
    const n = Number(key);
    if (!Number.isInteger(n) || n < 1 || n > 31 || !isRecord(value)) continue;
    const override: DayOverride = {};
    if (DAY_TYPES.includes(value.type as DayType)) override.type = value.type as DayType;
    const g = value.guardia;
    if (isRecord(g) && GUARDIA_MODES.includes(g.mode as GuardiaMode)) {
      override.guardia = {
        mode: g.mode as GuardiaMode,
        customHours: isFiniteNumber(g.customHours) ? Math.min(24, Math.max(0, g.customHours)) : 17,
      };
    }
    days[n] = override;
  }
  return days;
}

function sanitizeExtras(raw: unknown): ExtraHours[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((e, i): ExtraHours[] => {
    if (!isRecord(e) || !isFiniteNumber(e.hours) || !PAY_TYPES.includes(e.type as PayType)) return [];
    return [
      {
        id: typeof e.id === "string" ? e.id : `import-${i}`,
        hours: Math.min(24, Math.max(0, e.hours)),
        type: e.type as PayType,
        fromCarry: e.fromCarry === true,
      },
    ];
  });
}

/** Valida y normaliza datos externos (localStorage o un archivo importado). Devuelve null si no son válidos. */
export function sanitize(raw: unknown): AppData | null {
  if (!isRecord(raw) || !isRecord(raw.months)) return null;
  const months: Record<string, MonthConfig> = {};
  for (const [key, value] of Object.entries(raw.months)) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key) || !isRecord(value)) continue;
    months[key] = {
      year: isYear(value.year) ? value.year : "R1",
      irpfPct: isFiniteNumber(value.irpfPct) ? Math.min(45, Math.max(0, value.irpfPct)) : null,
      days: sanitizeDays(value.days),
      extras: sanitizeExtras(value.extras),
      carryDismissed: value.carryDismissed === true,
      updatedAt: isFiniteNumber(value.updatedAt) ? value.updatedAt : Date.now(),
    };
  }
  return { version: 1, months, lastYear: isYear(raw.lastYear) ? raw.lastYear : "R1" };
}

export function loadData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = sanitize(JSON.parse(stored));
      if (data) return data;
    }
    const legacy = localStorage.getItem(LEGACY_PREFS_KEY);
    if (legacy) {
      const prefs: unknown = JSON.parse(legacy);
      if (isRecord(prefs) && isYear(prefs.year)) return { ...emptyData(), lastYear: prefs.year };
    }
  } catch {
    // localStorage no disponible o JSON corrupto: se empieza de cero.
  }
  return emptyData();
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Cuota agotada o modo privado: la app sigue funcionando, solo sin persistencia.
  }
}
