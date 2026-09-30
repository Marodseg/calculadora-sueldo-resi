import { currentMonthKey, monthLabel, shiftMonth } from "../lib/calc";
import { IconLeft, IconRight } from "./icons";

export function MonthSwitcher({ month, onChange, configured }: { month: string; onChange: (m: string) => void; configured: boolean }) {
  const isNow = month === currentMonthKey();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="icon-btn" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mes anterior">
          <IconLeft />
        </button>
        <div className="month-title">
          <label className="month-pick">
            <span className="month-name">{monthLabel(month)}</span>
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && onChange(e.target.value)}
              aria-label="Elegir mes"
            />
          </label>
          <span className={"month-status" + (configured ? " saved" : "")}>
            {configured ? "Guardado en este dispositivo" : "Sin configurar"}
          </span>
        </div>
        <button className="icon-btn" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Mes siguiente">
          <IconRight />
        </button>
        {!isNow && (
          <button className="chip-btn today" onClick={() => onChange(currentMonthKey())}>
            Hoy
          </button>
        )}
      </div>
    </header>
  );
}
