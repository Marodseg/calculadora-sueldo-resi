import { estimateIrpf } from "../lib/calc";
import type { Store } from "../lib/useStore";

export function Irpf({ store }: { store: Store }) {
  const { cfg, totals } = store;
  if (cfg.year === "R1") {
    return (
      <section className="card">
        <h2 className="card-title">Retención de IRPF</h2>
        <div className="locked">
          <span>Retención aplicada</span>
          <b className="mono">0,00 %</b>
        </div>
        <p className="hint">
          En R1 tu contrato no cubre un año fiscal completo, así que Hacienda proyecta un ingreso anual por debajo del
          mínimo exento y no retiene IRPF.
        </p>
      </section>
    );
  }
  return (
    <section className="card">
      <h2 className="card-title">Retención de IRPF</h2>
      <div className="irpf-row">
        <div className="pct-input">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={45}
            step={0.1}
            placeholder="0"
            value={cfg.irpfPct ?? ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              store.setIrpf(isNaN(v) ? null : Math.min(45, Math.max(0, v)));
            }}
            aria-label="Porcentaje de IRPF"
          />
          <span>%</span>
        </div>
        <button className="chip-btn" onClick={() => store.setIrpf(estimateIrpf(totals.bruto))}>
          Estimar
        </button>
      </div>
      <p className="hint">
        Pon el porcentaje que aparece en tu nómina real. «Estimar» proyecta este mes a 12 meses: es solo orientativo,
        depende de tu Modelo 145.
      </p>
    </section>
  );
}
