import type { Store } from "../lib/useStore";

export function Irpf({ store }: { store: Store }) {
  const { cfg, yearProjection } = store;
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
            step={0.01}
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
        <button className="chip-btn" onClick={() => store.setIrpf(yearProjection.irpf.pct)}>
          Estimar
        </button>
      </div>
      <p className="hint">
        {cfg.year === "R1"
          ? "En R1 suele quedar en 0 % porque el contrato no cubre el año fiscal. Si el recibo trae otro tipo, pon el que salga: en 2026 vimos un 0,12 %."
          : `Pon el porcentaje que aparece en tu nómina real. «Estimar» proyecta el año ${yearProjection.year} con tus meses guardados (${yearProjection.irpf.pct.toLocaleString("es-ES")} %): es solo orientativo, depende de tu Modelo 145. Verás el detalle en la pestaña Año.`}
      </p>
    </section>
  );
}
