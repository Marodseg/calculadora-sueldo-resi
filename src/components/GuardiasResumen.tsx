import { fmtEurShort, fmtHours, fmtNum, monthLabel, MONTHS_SHORT, parseMonth } from "../lib/calc";
import type { GuardiaSummary } from "../lib/guardiaStats";
import type { PayType } from "../lib/types";
import { IconMoon } from "./icons";

const RATE_LABEL: Record<PayType, string> = {
  lab: "Laborables",
  sdf: "Fin de semana / festivo",
  esp: "Festivo especial",
};
const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const WEEKDAYS_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Columnas de un mini gráfico de barras: valor sobre la barra, etiqueta debajo. */
function MiniBars({
  label,
  items,
}: {
  label: string;
  items: { key: string; short: string; value: number; aria: string; highlight?: boolean }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="mini-bars" role="group" aria-label={label}>
      {items.map((item) => (
        <div key={item.key} className="mini-col" role="img" aria-label={item.aria}>
          <span className="mini-val mono">{item.value > 0 ? item.value : ""}</span>
          <span className="mini-track">
            <span
              className={"mini-bar" + (item.highlight ? " top" : "")}
              style={{ height: item.value > 0 ? `${Math.max(8, (item.value / max) * 100)}%` : 0 }}
            />
          </span>
          <span className="mini-lbl">{item.short}</span>
        </div>
      ))}
    </div>
  );
}

export function GuardiasResumen({ summary: s }: { summary: GuardiaSummary }) {
  if (s.guardias === 0) {
    return (
      <section className="card">
        <h2 className="card-title">
          <IconMoon size={14} /> Guardias de {s.year}
        </h2>
        <p className="hint" style={{ margin: 0 }}>
          Todavía no hay guardias en los meses guardados de {s.year}.
        </p>
      </section>
    );
  }

  const rates = (["lab", "sdf", "esp"] as PayType[]).filter((r) => s.hours[r] > 0);
  const maxWeekday = Math.max(...s.byWeekday);
  const avg = s.guardias / s.monthsCount;

  return (
    <section className="card guardias-card">
      <h2 className="card-title">
        <IconMoon size={14} /> Guardias de {s.year}
      </h2>

      <div className="stat-grid">
        <div className="stat-tile" data-testid="stat-guardias">
          <span>Guardias</span>
          <b className="mono">{s.guardias}</b>
        </div>
        <div className="stat-tile" data-testid="stat-horas">
          <span>Horas</span>
          <b className="mono">{fmtHours(s.totalHours)} h</b>
        </div>
        <div className="stat-tile" data-testid="stat-ingresos">
          <span>Ingresos</span>
          <b className="mono">{fmtEurShort(s.guardiasBruto)}</b>
          <small>{Math.round(s.guardiasShare)} % del bruto</small>
        </div>
      </div>

      <h3 className="sub-title">Horas por tarifa</h3>
      <div
        className="stack-bar"
        role="img"
        aria-label={rates.map((r) => `${RATE_LABEL[r]}: ${fmtHours(s.hours[r])} h`).join(", ")}
      >
        {rates.map((r) => (
          <span key={r} className={`stack-seg r-${r}`} style={{ flexGrow: s.hours[r] }} />
        ))}
      </div>
      <ul className="stack-legend">
        {rates.map((r) => (
          <li key={r}>
            <i className={`sw r-${r}`} />
            <span>{RATE_LABEL[r]}</span>
            <b className="mono">
              {fmtHours(s.hours[r])} h · {pct(s.hours[r], s.totalHours)} %
            </b>
          </li>
        ))}
      </ul>

      <h3 className="sub-title">Por día de la semana</h3>
      <MiniBars
        label="Guardias por día de la semana"
        items={s.byWeekday.map((n, i) => ({
          key: String(i),
          short: WEEKDAYS_SHORT[i],
          value: n,
          aria: `${WEEKDAYS[i]}: ${plural(n, "guardia", "guardias")}`,
          highlight: n === maxWeekday && n > 0,
        }))}
      />

      <h3 className="sub-title">Guardias por mes</h3>
      <MiniBars
        label="Guardias por mes"
        items={s.monthly.map((m) => ({
          key: m.key,
          short: MONTHS_SHORT[parseMonth(m.key).m - 1],
          value: m.guardias,
          aria: m.hasData
            ? `${monthLabel(m.key)}: ${plural(m.guardias, "guardia", "guardias")}`
            : `${monthLabel(m.key)}: sin datos`,
          highlight: s.busiest?.key === m.key,
        }))}
      />

      <dl className="facts">
        <div>
          <dt>Media por mes</dt>
          <dd className="mono">{fmtNum(avg).replace(",00", "")} guardias</dd>
        </div>
        {s.busiest && (
          <div>
            <dt>Mes con más guardias</dt>
            <dd>
              <span className="cap">{monthLabel(s.busiest.key, { month: "long" })}</span>{" "}
              <b className="mono">({s.busiest.guardias})</b>
            </dd>
          </div>
        )}
        <div>
          <dt>De 17 h / de 24 h{s.byMode.custom > 0 ? " / a medida" : ""}</dt>
          <dd className="mono">
            {s.byMode["17"]} / {s.byMode["24"]}
            {s.byMode.custom > 0 ? ` / ${s.byMode.custom}` : ""}
          </dd>
        </div>
        <div>
          <dt>En fin de semana o festivo</dt>
          <dd className="mono">
            {s.onWeekendOrHoliday} ({pct(s.onWeekendOrHoliday, s.guardias)} %)
          </dd>
        </div>
        {(s.vacDays > 0 || s.bajaDays > 0) && (
          <div>
            <dt>Vacaciones / baja</dt>
            <dd className="mono">
              {plural(s.vacDays, "día", "días")} / {plural(s.bajaDays, "día", "días")}
            </dd>
          </div>
        )}
      </dl>

      <p className="hint">
        Cuenta solo los meses que has guardado ({plural(s.monthsCount, "mes", "meses")}). Las horas son las que se pagan
        con cada mes: las de una guardia que cruza al mes siguiente se suman en ese.
      </p>
    </section>
  );
}
