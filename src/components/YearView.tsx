import { useState } from "react";
import { fmtEur, fmtEurShort, fmtNum, monthLabel, parseMonth } from "../lib/calc";
import { OTROS_GASTOS } from "../lib/irpf";
import type { Store } from "../lib/useStore";
import { projectYear } from "../lib/year";
import { m } from "framer-motion";
import { IconBank, IconInfo, IconLeft, IconRight, IconSpark, IconWallet } from "./icons";

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** 2.646 → "2,6k": los importes completos no caben sobre 12 barras en un móvil. */
const fmtThousands = (n: number) => (n / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + "k";

export function YearView({ store, onOpen }: { store: Store; onOpen: (month: string) => void }) {
  const [year, setYear] = useState(() => parseMonth(store.month).y);
  const p = projectYear(store.data.months, year);
  const maxNeto = Math.max(1, ...p.months.map((mo) => mo.neto));
  const { irpf } = p;

  return (
    <>
      <div className="year-switch">
        <button className="icon-btn" onClick={() => setYear(year - 1)} aria-label="Año anterior">
          <IconLeft size={22} />
        </button>
        <h1 className="year-title">{year}</h1>
        <button className="icon-btn" onClick={() => setYear(year + 1)} aria-label="Año siguiente">
          <IconRight size={22} />
        </button>
      </div>

      {p.realCount === 0 ? (
        <section className="card empty">
          <div className="empty-ico">
            <IconInfo size={30} />
          </div>
          <h2>Sin meses en {year}</h2>
          <p>Configura al menos un mes de este año en la pestaña «Mes» y aquí verás la proyección anual y del IRPF.</p>
        </section>
      ) : (
        <>
          <section className="hero">
            <div className="hero-glow" aria-hidden="true" />
            <p className="hero-label">
              <IconSpark size={13} /> Líquido anual estimado
            </p>
            <p className="hero-amount mono">
              {fmtNum(p.netoAnual).split(",")[0]}
              <span className="hero-dec">,{fmtNum(p.netoAnual).split(",")[1]} €</span>
            </p>
            <div className="hero-stats">
              <div>
                <span>
                  <IconWallet size={11} /> Bruto
                </span>
                <b className="mono">{fmtEurShort(p.brutoAnual)}</b>
              </div>
              <div>
                <span>
                  <IconBank size={11} /> S. Social
                </span>
                <b className="mono">−{fmtEurShort(p.seguridadSocialAnual)}</b>
              </div>
              <div>
                <span>IRPF est.</span>
                <b className="mono">−{fmtEurShort(irpf.cuota)}</b>
              </div>
            </div>
            <p className="hero-foot">
              Con {p.realCount} {p.realCount === 1 ? "mes" : "meses"} de datos; el resto del año se estima con su media.
            </p>
          </section>

          <section className="card">
            <h2 className="card-title">Líquido mes a mes</h2>
            <div className="bars year" role="group" aria-label={`Líquido de cada mes de ${year}`}>
              {p.months.map((mo) => {
                const bar = (
                  <>
                    <span className="bar-val mono">{mo.neto > 0 ? fmtThousands(mo.neto) : "–"}</span>
                    <span className="bar-track">
                      <m.span
                        className={"bar" + (mo.projected ? " projected" : "")}
                        initial={{ height: 0 }}
                        animate={{ height: mo.neto > 0 ? `${Math.max(4, (mo.neto / maxNeto) * 100)}%` : 0 }}
                        transition={{ type: "spring", stiffness: 120, damping: 18 }}
                      />
                    </span>
                    <span className="bar-lbl">{MONTH_SHORT[parseMonth(mo.key).m - 1]}</span>
                  </>
                );
                return mo.projected ? (
                  <div
                    key={mo.key}
                    className="bar-col static"
                    role="img"
                    aria-label={`${monthLabel(mo.key)}: ${mo.neto > 0 ? fmtEur(mo.neto) : "sin datos"} (estimado)`}
                  >
                    {bar}
                  </div>
                ) : (
                  <button
                    key={mo.key}
                    className="bar-col"
                    onClick={() => onOpen(mo.key)}
                    aria-label={`${monthLabel(mo.key)}: ${fmtEur(mo.neto)}`}
                  >
                    {bar}
                  </button>
                );
              })}
            </div>
            <div className="legend">
              <span>
                <i className="lg-bar" />
                Con datos
              </span>
              <span>
                <i className="lg-bar projected" />
                Estimado
              </span>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Retención de IRPF estimada</h2>
            <p className="big mono irpf-pct">{fmtNum(irpf.pct)} %</p>
            {irpf.exento ? (
              <p className="hint" style={{ marginTop: 0 }}>
                Con un bruto anual de {fmtEur(irpf.brutoAnual)}, por debajo del límite de 15.876 € para un soltero sin
                hijos, no se practica retención.
              </p>
            ) : (
              <div className="rows">
                <div className="row">
                  <span>Bruto anual proyectado</span>
                  <b className="mono">{fmtEur(irpf.brutoAnual)}</b>
                </div>
                <div className="row neg">
                  <span>Seguridad Social</span>
                  <b className="mono">−{fmtEur(irpf.seguridadSocial)}</b>
                </div>
                <div className="row neg">
                  <span>Otros gastos deducibles</span>
                  <b className="mono">−{fmtEur(OTROS_GASTOS)}</b>
                </div>
                <div className={"row" + (irpf.reduccion > 0 ? " neg" : "")}>
                  <span>Reducción por rendimientos del trabajo</span>
                  <b className="mono">
                    {irpf.reduccion > 0 ? "−" : ""}
                    {fmtEur(irpf.reduccion)}
                  </b>
                </div>
                <div className="row">
                  <span>Base de retención</span>
                  <b className="mono">{fmtEur(irpf.baseRetencion)}</b>
                </div>
                <div className="row total">
                  <span>Cuota anual estimada</span>
                  <b className="mono">{fmtEur(irpf.cuota)}</b>
                </div>
              </div>
            )}
            <p className="hint">
              Estimación para un soltero sin hijos ni otras circunstancias (mínimo personal de 5.550 €). Tu retención
              real depende de tu Modelo 145 y de lo que aplique tu pagador. En la pestaña «Mes» puedes copiar este
              porcentaje con «Estimar».
            </p>
          </section>
        </>
      )}
    </>
  );
}
