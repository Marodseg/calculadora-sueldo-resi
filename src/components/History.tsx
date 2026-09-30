import { computeTotals, fmtEur, fmtEurShort, monthLabel } from "../lib/calc";
import type { Store } from "../lib/useStore";
import { IconTrash, IconTrend } from "./icons";
import { Confirm } from "./ui";
import { motion } from "framer-motion";
import { toast } from "sonner";

export function History({ s, onOpen }: { s: Store; onOpen: (m: string) => void }) {
  const keys = Object.keys(s.data.months).sort();
  const rows = keys.map((k) => ({ k, cfg: s.data.months[k], t: computeTotals(k, s.data.months[k]) }));
  const max = Math.max(1, ...rows.map((r) => r.t.neto));
  const totalNeto = rows.reduce((a, r) => a + r.t.neto, 0);
  const totalBruto = rows.reduce((a, r) => a + r.t.bruto, 0);
  const totalG = rows.reduce((a, r) => a + r.t.guardiasBruto, 0);

  if (!rows.length) {
    return (
      <section className="card empty">
        <div className="empty-ico"><IconTrend size={30} /></div>
        <h2>Aún no hay meses guardados</h2>
        <p>Configura tu primer mes en la pestaña «Mes» y aparecerá aquí, con su líquido y su evolución.</p>
      </section>
    );
  }
  const last12 = rows.slice(-12);
  return (
    <>
      <section className="card totals-card">
        <h2 className="card-title"><IconTrend size={14} /> Acumulado · {rows.length} {rows.length === 1 ? "mes" : "meses"}</h2>
        <p className="big mono">{fmtEur(totalNeto)}</p>
        <div className="rate-grid">
          <div><span>Bruto</span><b className="mono">{fmtEur(totalBruto)}</b></div>
          <div><span>Guardias (bruto)</span><b className="mono">{fmtEur(totalG)}</b></div>
          <div><span>Media mensual</span><b className="mono">{fmtEur(totalNeto / rows.length)}</b></div>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Líquido por mes</h2>
        <div className="bars" role="img" aria-label="Gráfico de líquido por mes">
          {last12.map((r) => (
            <button key={r.k} className="bar-col" onClick={() => onOpen(r.k)} aria-label={`${monthLabel(r.k)}: ${fmtEur(r.t.neto)}`}>
              <span className="bar-val mono">{fmtEurShort(r.t.neto)}</span>
              <span className="bar-track"><motion.span className="bar" initial={{ height: 0 }} animate={{ height: `${Math.max(4, (r.t.neto / max) * 100)}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} /></span>
              <span className="bar-lbl">{monthLabel(r.k, { month: "short" }).replace(".", "")}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Meses</h2>
        <div className="hist-list">
          {[...rows].reverse().map((r) => (
            <div key={r.k} className="hist-item">
              <button className="hist-main" onClick={() => onOpen(r.k)}>
                <span className="hist-month">{monthLabel(r.k)}<em>{r.cfg.year}</em></span>
                <span className="hist-meta">{r.t.guardias} guardias · bruto {fmtEur(r.t.bruto)}</span>
              </button>
              <b className="mono hist-neto">{fmtEur(r.t.neto)}</b>
              <Confirm
                title={`¿Borrar ${monthLabel(r.k)}?`} description="Se eliminará la configuración guardada de este mes." action="Borrar"
                onConfirm={() => { s.deleteMonth(r.k); toast("Mes borrado"); }}
                trigger={<button className="icon-btn danger" aria-label={`Borrar ${monthLabel(r.k)}`}><IconTrash size={18} /></button>}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
