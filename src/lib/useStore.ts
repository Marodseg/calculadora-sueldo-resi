import { useCallback, useEffect, useMemo, useState } from "react";
import { computeTotals, currentMonthKey, deferredHours, nextMonthFirstDayType, shiftMonth } from "./calc";
import { loadData, newMonthConfig, sanitize, saveData } from "./storage";
import type { AppData, DayOverride, ExtraHours, MonthConfig, Year } from "./types";

const uid = () => Math.random().toString(36).slice(2, 9);

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

  const update = useCallback(
    (fn: (c: MonthConfig) => MonthConfig) => {
      setData((d) => {
        const base = d.months[month] ?? cfg;
        const next = { ...fn(base), updatedAt: Date.now() };
        return { ...d, lastYear: next.year, months: { ...d.months, [month]: next } };
      });
    },
    [month, cfg],
  );

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
  const resetMonth = () =>
    setData((d) => {
      const months = { ...d.months };
      delete months[month];
      return { ...d, months };
    });
  const deleteMonth = (key: string) =>
    setData((d) => {
      const months = { ...d.months };
      delete months[key];
      return { ...d, months };
    });

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
  const clearAll = () => setData({ version: 1, months: {}, lastYear: "R1" });

  return {
    data, month, setMonth, cfg, totals, carry,
    setYear, setIrpf, setDay, addExtra, patchExtra, removeExtra, dismissCarry, resetMonth, deleteMonth,
    exportJson, importJson, clearAll,
  };
}
export type Store = ReturnType<typeof useStore>;
