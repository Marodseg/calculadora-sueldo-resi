/**
 * Festivos de Andalucía y de Granada capital.
 *
 * Son orientativos: el calendario laboral oficial (BOJA) puede trasladar festivos de forma distinta cada año.
 * Aquí se aplica la regla habitual: un festivo fijo que cae en domingo pasa al lunes siguiente.
 */

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const key = (date: Date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Festivos fijos (mes, día, nombre). Los trasladables pasan al lunes si caen en domingo. */
const FIXED: { month: number; day: number; name: string; movable: boolean }[] = [
  { month: 1, day: 1, name: "Año Nuevo", movable: true },
  { month: 1, day: 6, name: "Epifanía del Señor", movable: true },
  { month: 2, day: 28, name: "Día de Andalucía", movable: true },
  { month: 5, day: 1, name: "Fiesta del Trabajo", movable: true },
  { month: 8, day: 15, name: "Asunción de la Virgen", movable: true },
  { month: 10, day: 12, name: "Fiesta Nacional de España", movable: true },
  { month: 11, day: 1, name: "Todos los Santos", movable: true },
  { month: 12, day: 6, name: "Día de la Constitución", movable: true },
  { month: 12, day: 8, name: "Inmaculada Concepción", movable: true },
  { month: 12, day: 25, name: "Navidad", movable: true },
  // Local de Granada capital.
  { month: 1, day: 2, name: "Toma de Granada", movable: false },
];

const cache = new Map<number, Map<string, string>>();

/** Festivos de un año como mapa "MM-DD" → nombre(s). */
export function holidaysOf(year: number): Map<string, string> {
  const cached = cache.get(year);
  if (cached) return cached;

  const result = new Map<string, string>();
  const add = (date: Date, name: string) => {
    const k = key(date);
    const previous = result.get(k);
    result.set(k, previous ? `${previous} · ${name}` : name);
  };

  for (const h of FIXED) {
    const date = new Date(year, h.month - 1, h.day);
    if (h.movable && date.getDay() === 0) add(addDays(date, 1), `${h.name} (traslado)`);
    else add(date, h.name);
  }

  const easter = easterSunday(year);
  add(addDays(easter, -3), "Jueves Santo");
  add(addDays(easter, -2), "Viernes Santo");
  add(addDays(easter, 60), "Corpus Christi (Granada)");

  cache.set(year, result);
  return result;
}

/** Festivos de un mes ("YYYY-MM") como mapa día → nombre. */
export function holidaysOfMonth(monthKey: string): Record<number, string> {
  const [year, month] = monthKey.split("-").map(Number);
  const out: Record<number, string> = {};
  for (const [k, name] of holidaysOf(year)) {
    const [m, d] = k.split("-").map(Number);
    if (m === month) out[d] = name;
  }
  return out;
}
