import { monthLabel } from "../lib/calc";
import { DAY_TYPE_LABEL } from "../lib/rates";
import type { Store } from "../lib/useStore";
import type { PayType } from "../lib/types";
import { IconPlus, IconTrash } from "./icons";
import { Dropdown } from "./ui";

export function Extras({ s }: { s: Store }) {
  const { cfg, carry } = s;
  return (
    <section className="card">
      <h2 className="card-title">Horas del mes anterior</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Si una guardia empezó el último día del mes pasado, parte de sus horas se paga con este mes.
      </p>
      {carry && (
        <div className="banner">
          <p>
            Tienes <b>{carry.hours} h</b> de guardia de {monthLabel(carry.fromMonth, { month: "long" })} que caen en este mes ({DAY_TYPE_LABEL[carry.type]}).
          </p>
          <div className="banner-actions">
            <button className="chip-btn solid" onClick={() => s.addExtra({ hours: carry.hours, type: carry.type, fromCarry: true })}>Añadir</button>
            <button className="chip-btn" onClick={s.dismissCarry}>No, gracias</button>
          </div>
        </div>
      )}
      <div className="extras">
        {cfg.extras.map((e) => (
          <div key={e.id} className="extra">
            <input
              type="number" inputMode="decimal" min={0} max={24} step={0.5} value={e.hours}
              onChange={(ev) => s.patchExtra(e.id, { hours: Math.max(0, parseFloat(ev.target.value) || 0) })}
              aria-label="Horas"
            />
            <span>h a</span>
            <Dropdown label="Tarifa" value={e.type} onChange={(v) => s.patchExtra(e.id, { type: v })} options={(["lab", "sdf", "esp"] as PayType[]).map((t) => ({ value: t, label: DAY_TYPE_LABEL[t] }))} />
            <button className="icon-btn danger" onClick={() => s.removeExtra(e.id)} aria-label="Quitar"><IconTrash size={18} /></button>
          </div>
        ))}
        <button className="add-btn" onClick={() => s.addExtra({ hours: 8, type: "lab" })}><IconPlus /> Añadir horas</button>
      </div>
    </section>
  );
}
