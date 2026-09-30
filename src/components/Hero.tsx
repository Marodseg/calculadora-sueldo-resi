import { fmtEur, fmtNum } from "../lib/calc";
import { RATES, SUELDO_BASE, YEARS } from "../lib/rates";
import type { Totals } from "../lib/calc";
import type { Year } from "../lib/types";
import { IconArrow, IconSpark, IconWallet, IconMoon, IconBank } from "./icons";
import { useAnimatedNumber } from "../lib/useAnimatedNumber";

export function Hero({ totals, onSeeDetail }: { totals: Totals; onSeeDetail: () => void }) {
  const neto = useAnimatedNumber(totals.neto);
  const [int, dec] = fmtNum(neto).split(",");
  return (
    <section className="hero">
      <div className="hero-glow" aria-hidden="true" />
      <p className="hero-label"><IconSpark size={13} /> Líquido a percibir</p>
      <p className="hero-amount mono" aria-live="polite">
        {int}
        <span className="hero-dec">,{dec} €</span>
      </p>
      <div className="hero-stats">
        <div><span><IconWallet size={11} /> Bruto</span><b className="mono">{fmtEur(totals.bruto)}</b></div>
        <div><span><IconMoon size={11} /> Guardias</span><b className="mono">{fmtEur(totals.guardiasBruto)}</b></div>
        <div><span><IconBank size={11} /> S. Social</span><b className="mono">−{fmtEur(totals.totalSS)}</b></div>
      </div>
      <button className="hero-link" onClick={onSeeDetail}>Ver desglose de la nómina <IconArrow size={15} /></button>
    </section>
  );
}

export function YearPicker({ year, onChange }: { year: Year; onChange: (y: Year) => void }) {
  const r = RATES[year];
  return (
    <section className="card">
      <h2 className="card-title">Año de residencia</h2>
      <div className="seg" role="group" aria-label="Año de residencia">
        {YEARS.map((y) => (
          <button key={y} aria-pressed={y === year} onClick={() => onChange(y)}>{y}</button>
        ))}
      </div>
      <div className="rate-grid">
        <div><span>Sueldo + formación</span><b className="mono">{fmtNum(SUELDO_BASE + r.comp)} €</b></div>
        <div><span>Guardia laborable</span><b className="mono">{fmtNum(r.lab)} €/h</b></div>
        <div><span>Fin de sem./festivo</span><b className="mono">{fmtNum(r.sdf)} €/h</b></div>
        <div><span>Festivo especial</span><b className="mono">{fmtNum(r.esp)} €/h</b></div>
      </div>
    </section>
  );
}
