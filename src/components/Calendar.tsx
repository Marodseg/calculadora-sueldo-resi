import { buildDays, currentMonthKey, firstWeekday, splitGuardia } from "../lib/calc";
import { DAY_TYPE_SHORT } from "../lib/rates";
import type { MonthConfig } from "../lib/types";
import { IconMoon } from "./icons";

const HEAD = ["L", "M", "X", "J", "V", "S", "D"];

export function Calendar({ month, cfg, onPick }: { month: string; cfg: MonthConfig; onPick: (n: number) => void }) {
  const days = buildDays(month, cfg.days);
  const offset = (firstWeekday(month) + 6) % 7;
  const today = new Date();
  const isThisMonth = month === currentMonthKey();
  const guardias = days.filter((d) => d.guardia).length;
  const worked = days.filter((d) => d.type !== "vac" && d.type !== "baja").length;

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Calendario</h2>
        <div className="mini-stats">
          <span>
            <b className="mono">{worked}</b>/{days.length} días
          </span>
          <span>
            <b className="mono">{guardias}</b> guardias
          </span>
        </div>
      </div>
      <div className="cal" role="group" aria-label="Calendario del mes">
        {HEAD.map((h) => (
          <div key={h} className="cal-head">
            {h}
          </div>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={"e" + i} />
        ))}
        {days.map((d, idx) => {
          const split = d.guardia ? splitGuardia(days, idx) : null;
          const total = split ? split.day0 + split.day1 : 0;
          const changed = cfg.days[d.n]?.type !== undefined;
          return (
            <button
              key={d.n}
              className={`cell t-${d.type}${d.isWeekend ? " weekend" : ""}${d.guardia ? " has-g" : ""}${isThisMonth && d.n === today.getDate() ? " today" : ""}`}
              data-day={d.n}
              onClick={(e) => {
                // Sin foco previo en la celda: el panel modal oculta el resto de la app con aria-hidden.
                e.currentTarget.blur();
                onPick(d.n);
              }}
              aria-label={`Día ${d.n}, ${DAY_TYPE_SHORT[d.type]}${d.guardia ? ", con guardia" : ""}`}
            >
              <span className="cell-n">{d.n}</span>
              {d.guardia ? (
                <span className="cell-g">
                  <IconMoon size={10} />
                  {d.guardia.mode === "custom" ? d.guardia.customHours : total || d.guardia.mode}h
                </span>
              ) : changed && d.type !== "lab" && d.type !== "sdf" ? (
                <span className="cell-tag">{DAY_TYPE_SHORT[d.type]}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span>
          <i className="lg t-lab" />
          Laborable
        </span>
        <span>
          <i className="lg t-sdf" />
          S-D-F
        </span>
        <span>
          <i className="lg t-esp" />
          F. especial
        </span>
        <span>
          <i className="lg t-vac" />
          Vacaciones
        </span>
        <span>
          <i className="lg t-baja" />
          Baja
        </span>
      </div>
      <p className="hint">Toca un día para marcar guardia, festivo, vacaciones o baja.</p>
    </section>
  );
}
