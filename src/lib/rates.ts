import type { DayType, PayType, Year } from "./types";

export const YEARS: Year[] = ["R1", "R2", "R3", "R4", "R5"];

/** Anexo XVI.1 y XVI.2 de Retribuciones del SAS (R. 0002/2026). */
export const RATES: Record<Year, { comp: number } & Record<PayType, number>> = {
  R1: { comp: 0, lab: 14.07, sdf: 15.78, esp: 28.14 },
  R2: { comp: 110.38, lab: 15.42, sdf: 17.28, esp: 30.84 },
  R3: { comp: 248.41, lab: 18.02, sdf: 20.17, esp: 36.04 },
  R4: { comp: 386.37, lab: 20.22, sdf: 22.61, esp: 40.44 },
  R5: { comp: 524.38, lab: 20.22, sdf: 22.61, esp: 40.44 },
};

export const SUELDO_BASE = 1379.9;
export const MIN_CC = 1989.3;
export const SS = { desempleo: 0.016, fp: 0.001, cc: 0.0485 };
export const EMPRESA = { cc: 0.2435, it: 0.008, ims: 0.007, desempleo: 0.067, fp: 0.006 };

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  lab: "Laborable",
  sdf: "Fin de semana / festivo",
  esp: "Festivo especial",
  vac: "Vacaciones",
  baja: "Baja / ausencia",
};

export const DAY_TYPE_SHORT: Record<DayType, string> = {
  lab: "Lab",
  sdf: "S-D-F",
  esp: "F.Esp",
  vac: "Vac",
  baja: "Baja",
};
