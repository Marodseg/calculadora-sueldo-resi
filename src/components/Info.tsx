import { useRef } from "react";
import { fmtNum } from "../lib/calc";
import { MIN_CC, RATES, YEARS } from "../lib/rates";
import type { Store } from "../lib/useStore";
import { toast } from "sonner";
import { IconDownload, IconUpload, IconTrash } from "./icons";
import { Acc, Confirm } from "./ui";

export function Info({ s }: { s: Store }) {
  const file = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([s.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sueldo-resi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Copia exportada");
  };
  const importData = async (f: File) => {
    try {
      s.importJson(await f.text());
      toast.success("Copia importada correctamente");
    } catch {
      toast.error("No se pudo leer ese archivo");
    }
  };

  return (
    <>
      <section className="card">
        <h2 className="card-title">Tus datos</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Todo se guarda solo en este dispositivo (localStorage). Haz una copia si cambias de móvil o borras los datos del navegador.
        </p>
        <div className="btn-row">
          <button className="chip-btn solid" onClick={exportData}><IconDownload /> Exportar</button>
          <button className="chip-btn" onClick={() => file.current?.click()}><IconUpload /> Importar</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ""; }} />
        </div>
        <Confirm
          title="¿Borrar todos los datos?" description="Se eliminarán todos los meses guardados en este dispositivo. No se puede deshacer." action="Borrar todo"
          onConfirm={() => { s.clearAll(); toast("Datos borrados"); }}
          trigger={<button className="link-danger"><IconTrash size={15} /> Borrar todos los datos</button>}
        />
      </section>

      <Acc.Root type="single" collapsible className="acc-list">
      <Acc.Item value="a1" title="Regla del corte a medianoche">
        <p>Una guardia se cobra por calendario. Las horas hasta las 24:00 del día de inicio se pagan al precio <b>de ese día</b>; las de 00:00 a 08:00 al precio <b>del día siguiente</b>. Una guardia que empieza en viernes reparte 9 h a precio laborable y 8 h a fin de semana.</p>
        <h4>Duraciones</h4>
        <ul>
          <li><b>17 h (15:00–08:00):</b> 9 h el día de inicio + 8 h el siguiente.</li>
          <li><b>24 h (08:00–08:00):</b> 16 h + 8 h. Para sábados, domingos y festivos.</li>
          <li><b>Otra:</b> horas totales a precio del día de inicio.</li>
        </ul>
      </Acc.Item>

      <Acc.Item value="a2" title="Tarifas oficiales 2026">
        <p>Anexo XVI.1 y XVI.2 de Retribuciones de Personal del SAS (R. 0002/2026).</p>
        <table className="rate-table">
          <thead><tr><th>Año</th><th>Compl.</th><th>Lab.</th><th>S-D-F</th><th>F. esp.</th></tr></thead>
          <tbody>
            {YEARS.map((y) => (
              <tr key={y} className={y === s.cfg.year ? "active" : ""}>
                <td>{y}</td><td>{fmtNum(RATES[y].comp)}</td><td>{fmtNum(RATES[y].lab)}</td><td>{fmtNum(RATES[y].sdf)}</td><td>{fmtNum(RATES[y].esp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>El sueldo base (1.379,90 €) es igual para los cinco años; cambian el complemento de formación y el precio de la hora de guardia.</p>
      </Acc.Item>

      <Acc.Item value="a3" title="Cotizaciones a la Seguridad Social">
        <ul>
          <li>Desempleo: 1,60 %</li>
          <li>Formación profesional: 0,10 %</li>
          <li>Contingencias comunes + MEI: 4,85 % (4,70 % + 0,15 %)</li>
        </ul>
        <h4>Base mínima del grupo 1</h4>
        <p>Como titulado superior tu base de contingencias comunes nunca baja de <b className="mono">{fmtNum(MIN_CC)} €</b>/mes (prorrateada si trabajas menos días). Cuando sueldo + guardias superan ese mínimo, la base pasa a ser tu base real.</p>
      </Acc.Item>

      <Acc.Item value="a4" title="Por qué el IRPF es 0 % en R1">
        <p>Hacienda calcula la retención sobre una proyección de tus ingresos del año. Si tu contrato de R1 empieza a mitad de año, la proyección solo cuenta los meses restantes y queda por debajo del mínimo exento (unos 15.876 € para soltero sin hijos en 2026): retención 0 %.</p>
        <p>Desde R2 el contrato cubre un año completo con guardias, y suele aparecer una retención real (10–18 % según ingresos). Indícala en cuanto la veas en tu nómina.</p>
      </Acc.Item>
      </Acc.Root>

      <p className="disclaimer">
        Estimación orientativa basada en nóminas reales del H. Virgen de las Nieves (jun–ago 2026) y el Anexo XVI de Retribuciones del SAS. Verifica siempre el importe definitivo con tu nómina o RRHH.
      </p>
    </>
  );
}
