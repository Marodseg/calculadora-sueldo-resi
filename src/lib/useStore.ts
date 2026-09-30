import { useEffect, useMemo, useState } from "react";
import { computeTotals, currentMonthKey, deferredHours, nextMonthFirstDayType, shiftMonth } from "./calc";
import { emptyData, loadData, newMonthConfig, sanitize, saveData } from "./storage";
import type { AppData, DayOverride, ExtraHours, MonthConfig, Year } from "./types";

const uid = () => crypto.randomUUID();

export function useStore() {
  const [data, setData] = useState<AppData>(loadData);
  const [month, setMonth] = useState(currentMonthKey);

  useEffect(() => {
    saveData(data);
  }, [data]);

  /** Config del mes activo (si nunca se ha tocado, se muestra una por defecto sin persistirla). */
  const cfg: MonthConfig = useMemo(() => {
    if (data.months[month]) return data.months[month];
    const prev = data.months[shiftMonth(month, -1)];
    return newMonthConfig(prev?.year ?? data.lastYear, prev?.irpfPct ?? null);
  }, [data, month]);

  /** Aplica un cambio al mes activo y lo persiste (el primer cambio "materializa" el mes). */
  const update = (fn: (c: MonthConfig) => MonthConfig) =>
    setData((d) => {
      const next = { ...fn(d.months[month] ?? cfg), updatedAt: Date.now() };
      return { ...d, lastYear: next.year, months: { ...d.months, [month]: next } };
    });

  const setYear = (year: Year) => update((c) => ({ ...c, year }));
  const setIrpf = (irpfPct: number | null) => update((c) => ({ ...c, irpfPct }));
  const setDay = (n: number, o: DayOverride | null) =>
    update((c) => {
      const days = { ...c.days };
      if (!o || (o.type === undefined && !o.guardia)) delete days[n];
      else days[n] = o;
      return { ...c, days };
    });
  const addExtra = (e: Omit<ExtraHours, "id">) => update((c) => ({ ...c, extras: [...c.extras, { ...e, id: uid() }] }));
  const patchExtra = (id: string, p: Partial<ExtraHours>) =>
    update((c) => ({ ...c, extras: c.extras.map((e) => (e.id === id ? { ...e, ...p } : e)) }));
  const removeExtra = (id: string) => update((c) => ({ ...c, extras: c.extras.filter((e) => e.id !== id) }));
  const dismissCarry = () => update((c) => ({ ...c, carryDismissed: true }));
  const deleteMonth = (key: string) =>
    setData((d) => {
      const months = { ...d.months };
      delete months[key];
      return { ...d, months };
    });
  const resetMonth = () => deleteMonth(month);

  /** Sugerencia de horas de guardia del último día del mes anterior. */
  const carry = useMemo(() => {
    const prevKey = shiftMonth(month, -1);
    const prev = data.months[prevKey];
    if (!prev || cfg.carryDismissed || cfg.extras.some((e) => e.fromCarry)) return null;
    const hours = deferredHours(prevKey, prev);
    if (hours <= 0) return null;
    return { hours, type: nextMonthFirstDayType(prevKey), fromMonth: prevKey };
  }, [data, month, cfg.carryDismissed, cfg.extras]);

  const totals = useMemo(() => computeTotals(month, cfg), [month, cfg]);

  const exportJson = () => JSON.stringify(data, null, 2);
  const importJson = (text: string) => {
    const d = sanitize(JSON.parse(text));
    if (!d) throw new Error("Archivo no válido");
    setData(d);
  };
  const clearAll = () => setData(emptyData());

  return {
    data,
    month,
    setMonth,
    cfg,
    totals,
    carry,
    setYear,
    setIrpf,
    setDay,
    addExtra,
    patchExtra,
    removeExtra,
    dismissCarry,
    resetMonth,
    deleteMonth,
    exportJson,
    importJson,
    clearAll,
  };
}
export type Store = ReturnType<typeof useStore>;
