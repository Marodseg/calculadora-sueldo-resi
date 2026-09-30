import { fmtEur, fmtNum, type Totals } from "../lib/calc";
import { useAnimatedNumber } from "../lib/useAnimatedNumber";
import { IconArrow, IconBank, IconMoon, IconSpark, IconWallet } from "./icons";

interface Props {
  totals: Totals;
  /** Si se omite, no se muestra el enlace al desglose. */
  onSeeDetail?: () => void;
}

export function Hero({ totals, onSeeDetail }: Props) {
  const animated = useAnimatedNumber(totals.neto);
  const [integer, decimals] = fmtNum(animated).split(",");
  return (
    <section className="hero">
      <div className="hero-glow" aria-hidden="true" />
      <p className="hero-label">
        <IconSpark size={13} /> Líquido a percibir
      </p>
      {/* El número animado se oculta a lectores de pantalla; se lee solo el valor final. */}
      <p className="hero-amount mono">
        <span aria-hidden="true">
          {integer}
          <span className="hero-dec">,{decimals} €</span>
        </span>
        <span className="sr-only" aria-live="polite">
          {fmtEur(totals.neto)}
        </span>
      </p>
      <div className="hero-stats">
        <div>
          <span>
            <IconWallet size={11} /> Bruto
          </span>
          <b className="mono">{fmtEur(totals.bruto)}</b>
        </div>
        <div>
          <span>
            <IconMoon size={11} /> Guardias
          </span>
          <b className="mono">{fmtEur(totals.guardiasBruto)}</b>
        </div>
        <div>
          <span>
            <IconBank size={11} /> S. Social
          </span>
          <b className="mono">−{fmtEur(totals.totalSS)}</b>
        </div>
      </div>
      {onSeeDetail && (
        <button className="hero-link" onClick={onSeeDetail}>
          Ver desglose de la nómina <IconArrow size={15} />
        </button>
      )}
    </section>
  );
}
