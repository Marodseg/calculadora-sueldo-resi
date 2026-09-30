export type Year = "R1" | "R2" | "R3" | "R4" | "R5";
export type DayType = "lab" | "sdf" | "esp" | "vac" | "baja";
export type PayType = "lab" | "sdf" | "esp";
export type GuardiaMode = "17" | "24" | "custom";

export interface Guardia {
  mode: GuardiaMode;
  /** Solo se usa en modo "custom". */
  customHours: number;
}

/** Cambios sobre el valor por defecto de un día (lab entre semana, sdf en fin de semana). */
export interface DayOverride {
  type?: DayType;
  guardia?: Guardia | null;
}

export interface ExtraHours {
  id: string;
  hours: number;
  type: PayType;
  /** Añadida desde la sugerencia de horas del mes anterior. */
  fromCarry?: boolean;
}

/** Configuración guardada de un mes ("YYYY-MM"). */
export interface MonthConfig {
  year: Year;
  /** % de retención de IRPF (solo R2+). null = sin indicar. */
  irpfPct: number | null;
  days: Record<number, DayOverride>;
  extras: ExtraHours[];
  /** El usuario descartó la sugerencia de horas arrastradas del mes anterior. */
  carryDismissed?: boolean;
  updatedAt: number;
}

export interface AppData {
  version: 1;
  months: Record<string, MonthConfig>;
  /** Último año de residencia usado, para preconfigurar meses nuevos. */
  lastYear: Year;
}

export interface DayView {
  n: number;
  weekday: number; // 0 = domingo
  isWeekend: boolean;
  type: DayType;
  guardia: Guardia | null;
}
