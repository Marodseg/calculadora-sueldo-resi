import { fmtEur, fmtNum, monthLabel } from "../lib/calc";
import { RATES } from "../lib/rates";
import type { Store } from "../lib/useStore";
import { shiftMonth } from "../lib/calc";
import { IconBank, IconSteth, IconWarn } from "./icons";

export function Breakdown({ s }: { s: Store }) {
  const { totals: t, cfg, month } = s;
  const r = RATES[cfg.year];
  const rows: { k: string; l: string; v: string; kind?: "sub" | "neg" | "total" }[] = [
    { k: "ord", l: `Sueldo ordinario (${t.workedDays}/${t.daysInMonth} días)`, v: fmtEur(t.sueldoOrdinario) },
  ];
  if (t.buckets.lab) rows.push({ k: "gl", l: `Guardias laborables · ${t.buckets.lab} h`, v: fmtEur(t.buckets.lab * r.lab), kind: "sub" });
  if (t.buckets.sdf) rows.push({ k: "gs", l: `Guardias fin de sem./festivo · ${t.buckets.sdf} h`, v: fmtEur(t.buckets.sdf * r.sdf), kind: "sub" });
  if (t.buckets.esp) rows.push({ k: "ge", l: `Guardias festivo especial · ${t.buckets.esp} h`, v: fmtEur(t.buckets.esp * r.esp), kind: "sub" });
  if (t.extrasBruto) rows.push({ k: "ex", l: `Horas del mes anterior · ${fmtNum(t.extrasBuckets.lab + t.extrasBuckets.sdf + t.extrasBuckets.esp)} h`, v: fmtEur(t.extrasBruto), kind: "sub" });
  rows.push({ k: "br", l: "Total devengado (bruto)", v: fmtEur(t.bruto), kind: "total" });
  rows.push({ k: "de", l: `Desempleo 1,60 % s/ ${fmtNum(t.totalBaseDesempleo)} €`, v: "−" + fmtEur(t.desemDed), kind: "neg" });
  rows.push({ k: "fp", l: "Formación profesional 0,10 %", v: "−" + fmtEur(t.fpDed), kind: "neg" });
  rows.push({ k: "cc", l: `Cont. comunes + MEI 4,85 % s/ ${fmtNum(t.totalBaseCC)} €`, v: "−" + fmtEur(t.ccDed), kind: "neg" });
  if (cfg.year !== "R1") rows.push({ k: "ir", l: `IRPF ${fmtNum(t.irpfPct)} %`, v: "−" + fmtEur(t.irpfAmount), kind: "neg" });
  rows.push({ k: "ne", l: "Líquido a percibir", v: fmtEur(t.neto), kind: "total" });

  const nextLabel = monthLabel(shiftMonth(month, 1), { month: "long", year: "numeric" });

  return (
    <>
      <section className="card">
        <h2 className="card-title"><IconBank size={14} /> Desglose de {monthLabel(month, { month: "long" })}</h2>
        <div className="rows">
          {rows.map((r) => (
            <div key={r.k} className={`row ${r.kind ?? ""}`}>
              <span>{r.l}</span>
              <b className="mono">{r.v}</b>
            </div>
          ))}
        </div>
        {t.deferredTotal > 0 && (
          <p className="warn-box"><IconWarn size={14} /> {t.deferredTotal} h de guardia caen ya en {nextLabel} y no están incluidas aquí. Al configurar ese mes te las propondré como horas extra.</p>
        )}
        <p className="hint">Las guardias de un mes se cobran normalmente con la nómina «complementaria» del mes siguiente. Este resultado suma ambas partes para ver lo que genera el mes trabajado, no lo que ingresará el banco en esa fecha exacta.</p>
      </section>

      <section className="card">
        <h2 className="card-title"><IconSteth size={14} /> Coste para el hospital</h2>
        <div className="rows">
          <div className="row"><span>Contingencias comunes 24,35 %</span><b className="mono">{fmtEur(t.emp.cc)}</b></div>
          <div className="row"><span>AT/EP incapacidad temporal 0,80 %</span><b className="mono">{fmtEur(t.emp.it)}</b></div>
          <div className="row"><span>AT/EP invalidez y superv. 0,70 %</span><b className="mono">{fmtEur(t.emp.ims)}</b></div>
          <div className="row"><span>Desempleo 6,70 %</span><b className="mono">{fmtEur(t.emp.desempleo)}</b></div>
          <div className="row"><span>Formación profesional 0,60 %</span><b className="mono">{fmtEur(t.emp.fp)}</b></div>
          <div className="row total"><span>Aportación empresa</span><b className="mono">{fmtEur(t.emp.total)}</b></div>
        </div>
        <p className="hint">No sale de tu nómina, pero es lo que el hospital cotiza además de tu bruto (bruto + esto = coste total).</p>
      </section>
    </>
  );
}
