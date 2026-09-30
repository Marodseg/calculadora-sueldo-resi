/**
 * Estimación de la retención de IRPF sobre el rendimiento del trabajo, siguiendo el esquema del cálculo de
 * retenciones de la AEAT para un contribuyente soltero, sin hijos ni otras circunstancias.
 *
 * Es una aproximación: la retención real depende del Modelo 145 (situación familiar, discapacidad, etc.)
 * y del tipo que aplique tu pagador. Úsala como orientación.
 */

/** Escala general de retenciones (tramo estatal + autonómico combinados): [límite superior del tramo, tipo]. */
const ESCALA: [number, number][] = [
  [12_450, 0.19],
  [20_200, 0.24],
  [35_200, 0.3],
  [60_000, 0.37],
  [300_000, 0.45],
  [Infinity, 0.47],
];

/** Mínimo personal del contribuyente. */
export const MINIMO_PERSONAL = 5_550;
/** "Otros gastos" deducibles de los rendimientos del trabajo. */
export const OTROS_GASTOS = 2_000;
/** Por debajo de este bruto anual no se practica retención (soltero sin hijos). */
export const LIMITE_SIN_RETENCION = 15_876;

const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

/** Aplica la escala progresiva a una base. */
export function aplicarEscala(base: number): number {
  let cuota = 0;
  let previo = 0;
  for (const [limite, tipo] of ESCALA) {
    if (base <= previo) break;
    cuota += (Math.min(base, limite) - previo) * tipo;
    previo = limite;
  }
  return cuota;
}

/** Reducción por obtención de rendimientos del trabajo (art. 20 LIRPF) según el rendimiento neto. */
export function reduccionRendimientosTrabajo(rendimientoNeto: number): number {
  if (rendimientoNeto <= 14_852) return 7_302;
  if (rendimientoNeto <= 17_673.52) return r2(7_302 - 1.75 * (rendimientoNeto - 14_852));
  return 0;
}

export interface IrpfEstimate {
  brutoAnual: number;
  seguridadSocial: number;
  otrosGastos: number;
  rendimientoNeto: number;
  reduccion: number;
  baseRetencion: number;
  /** Cuota anual estimada. */
  cuota: number;
  /** Tipo de retención estimado, en %, con dos decimales. */
  pct: number;
  /** True si el bruto queda por debajo del límite y no se retiene. */
  exento: boolean;
}

export function estimateIrpfAnual(brutoAnual: number, seguridadSocial: number): IrpfEstimate {
  const exento = brutoAnual <= LIMITE_SIN_RETENCION;
  const rendimientoNeto = Math.max(0, brutoAnual - seguridadSocial - OTROS_GASTOS);
  const reduccion = reduccionRendimientosTrabajo(rendimientoNeto);
  const baseRetencion = Math.max(0, rendimientoNeto - reduccion);
  const cuota = exento ? 0 : r2(Math.max(0, aplicarEscala(baseRetencion) - aplicarEscala(MINIMO_PERSONAL)));
  const pct = brutoAnual > 0 ? r2((cuota / brutoAnual) * 100) : 0;
  return {
    brutoAnual,
    seguridadSocial,
    otrosGastos: OTROS_GASTOS,
    rendimientoNeto,
    reduccion,
    baseRetencion,
    cuota,
    pct,
    exento,
  };
}
