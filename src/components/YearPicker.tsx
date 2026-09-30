import { fmtNum } from "../lib/calc";
import { RATES, SUELDO_BASE, YEARS } from "../lib/rates";
import type { Year } from "../lib/types";

interface Props {
  year: Year;
  onChange: (year: Year) => void;
}

export function YearPicker({ year, onChange }: Props) {
  const rate = RATES[year];
  return (
    <section className="card">
      <h2 className="card-title">Año de residencia</h2>
      <div className="seg" role="group" aria-label="Año de residencia">
        {YEARS.map((y) => (
          <button key={y} aria-pressed={y === year} onClick={() => onChange(y)}>
            {y}
          </button>
        ))}
      </div>
      <div className="rate-grid">
        <div>
          <span>Sueldo + formación</span>
          <b className="mono">{fmtNum(SUELDO_BASE + rate.comp)} €</b>
        </div>
        <div>
          <span>Guardia laborable</span>
          <b className="mono">{fmtNum(rate.lab)} €/h</b>
        </div>
        <div>
          <span>Fin de sem./festivo</span>
          <b className="mono">{fmtNum(rate.sdf)} €/h</b>
        </div>
        <div>
          <span>Festivo especial</span>
          <b className="mono">{fmtNum(rate.esp)} €/h</b>
        </div>
      </div>
    </section>
  );
}
