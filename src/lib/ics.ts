import { buildDays, fmtHours, parseMonth } from "./calc";
import { DAY_TYPE_LABEL } from "./rates";
import type { DayView, MonthConfig } from "./types";

export type Reminder = "none" | "1h" | "1d";

export interface IcsOptions {
  guardias: boolean;
  /** Vacaciones y bajas (los días consecutivos se unen en un solo evento). */
  ausencias: boolean;
  festivos: boolean;
  /** Aviso antes de cada guardia. */
  reminder: Reminder;
  /** Momento de generación (para DTSTAMP y SEQUENCE); por defecto, ahora. */
  now?: Date;
}

export interface IcsMonth {
  key: string;
  /** null = mes sin configurar (solo aportará festivos). */
  cfg: MonthConfig | null;
}

export interface IcsResult {
  content: string;
  /** Número de eventos incluidos. */
  events: number;
}

const PRODID = "-//Sueldo Resi//Calendario de guardias//ES";
const UID_DOMAIN = "sueldo-resi";
const TZID = "Europe/Madrid";

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

interface Ymd {
  y: number;
  m: number;
  d: number;
}

const ymdOf = (date: Date): Ymd => ({ y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() });
const addDays = ({ y, m, d }: Ymd, days: number): Ymd => ymdOf(new Date(y, m - 1, d + days));
const dateValue = ({ y, m, d }: Ymd) => `${pad(y, 4)}${pad(m)}${pad(d)}`;
const dateTimeValue = (day: Ymd, hour: number) => `${dateValue(day)}T${pad(hour)}0000`;

const utcStamp = (date: Date) =>
  `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T` +
  `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

/** Escapa un valor de texto según RFC 5545. */
export const escapeText = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const encoder = new TextEncoder();

/** Divide una línea en tramos de 75 octetos como máximo (los siguientes empiezan por un espacio). */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 1; // el espacio inicial de la línea de continuación
      limit = 75;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const ALARM_TRIGGER: Record<Exclude<Reminder, "none">, string> = { "1h": "-PT1H", "1d": "-P1D" };

interface EventSpec {
  uid: string;
  summary: string;
  description?: string;
  categories: string;
  /** Líneas DTSTART/DTEND ya formateadas. */
  when: string[];
  transparent?: boolean;
  alarm?: Reminder;
}

function eventLines(event: EventSpec, stamp: string, sequence: number): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}@${UID_DOMAIN}`,
    `DTSTAMP:${stamp}`,
    `LAST-MODIFIED:${stamp}`,
    `SEQUENCE:${sequence}`,
    ...event.when,
    `SUMMARY:${escapeText(event.summary)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  lines.push(`CATEGORIES:${escapeText(event.categories)}`);
  if (event.transparent) lines.push("TRANSP:TRANSPARENT");
  if (event.alarm && event.alarm !== "none") {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(event.summary)}`,
      `TRIGGER:${ALARM_TRIGGER[event.alarm]}`,
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT");
  return lines;
}

const allDay = (start: Ymd, endExclusive: Ymd) => [
  `DTSTART;VALUE=DATE:${dateValue(start)}`,
  `DTEND;VALUE=DATE:${dateValue(endExclusive)}`,
];

const timed = (start: Ymd, startHour: number, end: Ymd, endHour: number) => [
  `DTSTART;TZID=${TZID}:${dateTimeValue(start, startHour)}`,
  `DTEND;TZID=${TZID}:${dateTimeValue(end, endHour)}`,
];

function guardiaEvent(day: DayView, y: number, m: number, reminder: Reminder): EventSpec {
  const start: Ymd = { y, m, d: day.n };
  const g = day.guardia!;
  const tariff = `Tarifa del día de inicio: ${DAY_TYPE_LABEL[day.type]}.`;
  const uid = `guardia-${dateValue(start)}`;

  if (g.mode === "custom") {
    // Sin horario conocido: evento de día completo con las horas en el título.
    return {
      uid,
      summary: `Guardia (${fmtHours(g.customHours)} h)`,
      description: `Guardia de ${fmtHours(g.customHours)} h (horario sin especificar).\n${tariff}`,
      categories: "Guardia",
      when: allDay(start, addDays(start, 1)),
      alarm: reminder,
    };
  }

  const is24 = g.mode === "24";
  return {
    uid,
    summary: `Guardia ${g.mode} h`,
    description: `Guardia de ${g.mode} h (${is24 ? "08:00–08:00" : "15:00–08:00"}).\n${tariff}`,
    categories: "Guardia",
    when: timed(start, is24 ? 8 : 15, addDays(start, 1), 8),
    alarm: reminder,
  };
}

/** Une los días consecutivos del mismo tipo en rangos [inicio, fin) para crear un evento por periodo. */
function mergeRuns(days: { date: Ymd; type: "vac" | "baja" }[]) {
  const sorted = [...days].sort((a, b) => dateValue(a.date).localeCompare(dateValue(b.date)));
  const runs: { type: "vac" | "baja"; start: Ymd; end: Ymd; count: number }[] = [];
  for (const { date, type } of sorted) {
    const last = runs[runs.length - 1];
    if (last && last.type === type && dateValue(last.end) === dateValue(date)) {
      last.end = addDays(date, 1);
      last.count++;
    } else {
      runs.push({ type, start: date, end: addDays(date, 1), count: 1 });
    }
  }
  return runs;
}

/** Genera un archivo iCalendar (.ics) con las guardias, ausencias y festivos de los meses indicados. */
export function buildIcs(months: IcsMonth[], options: IcsOptions): IcsResult {
  const now = options.now ?? new Date();
  const stamp = utcStamp(now);
  // Un SEQUENCE creciente hace que los calendarios actualicen los eventos al volver a importar.
  const sequence = Math.floor(now.getTime() / 60_000);

  const events: EventSpec[] = [];
  const absent: { date: Ymd; type: "vac" | "baja" }[] = [];

  for (const { key, cfg } of months) {
    const { y, m } = parseMonth(key);
    const days = buildDays(key, cfg?.days ?? {});

    for (const day of days) {
      if (options.guardias && day.guardia) events.push(guardiaEvent(day, y, m, options.reminder));
      if (options.ausencias && (day.type === "vac" || day.type === "baja")) {
        absent.push({ date: { y, m, d: day.n }, type: day.type });
      }
      if (options.festivos && day.holiday) {
        const date: Ymd = { y, m, d: day.n };
        events.push({
          uid: `festivo-${dateValue(date)}`,
          summary: `Festivo: ${day.holiday}`,
          categories: "Festivo",
          when: allDay(date, addDays(date, 1)),
          transparent: true,
        });
      }
    }
  }

  for (const run of mergeRuns(absent)) {
    const label = run.type === "vac" ? "Vacaciones" : DAY_TYPE_LABEL.baja;
    events.push({
      uid: `${run.type}-${dateValue(run.start)}`,
      summary: label,
      description: `${label}: ${run.count} ${run.count === 1 ? "día" : "días"}.`,
      categories: run.type === "vac" ? "Vacaciones" : "Ausencia",
      when: allDay(run.start, run.end),
      transparent: true,
    });
  }

  events.sort((a, b) => a.when[0].localeCompare(b.when[0]) || a.uid.localeCompare(b.uid));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Guardias (Sueldo Resi)",
    `X-WR-TIMEZONE:${TZID}`,
    ...VTIMEZONE,
    ...events.flatMap((e) => eventLines(e, stamp, sequence)),
    "END:VCALENDAR",
  ];

  return { content: lines.map(foldLine).join("\r\n") + "\r\n", events: events.length };
}
