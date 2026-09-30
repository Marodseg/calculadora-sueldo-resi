import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Drawer } from "vaul";
import { buildDays, splitGuardia } from "../lib/calc";
import { DAY_TYPE_LABEL } from "../lib/rates";
import type { DayOverride, DayType, GuardiaMode } from "../lib/types";
import type { MonthConfig } from "../lib/types";
import { IconMoon, IconWarn } from "./icons";
import { Toggle } from "./ui";

const WD = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const TYPES: DayType[] = ["lab", "sdf", "esp", "vac", "baja"];
const MODES: { v: GuardiaMode; l: string; s: string }[] = [
  { v: "17", l: "17 h", s: "15:00–08:00" },
  { v: "24", l: "24 h", s: "08:00–08:00" },
  { v: "custom", l: "Otra", s: "a medida" },
];

export function DaySheet({
  month, cfg, day, onClose, onChange,
}: {
  month: string;
  cfg: MonthConfig;
  day: number | null;
  onClose: () => void;
  onChange: (n: number, o: DayOverride | null) => void;
}) {
  const days = buildDays(month, cfg.days);
  const d = day !== null ? days[day - 1] : null;

  return (
    <Drawer.Root open={day !== null} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-backdrop" />
        <Drawer.Content className="sheet" aria-describedby={undefined}>
          {day !== null && d && <Body {...{ month, cfg, day, d, days, onClose, onChange }} />}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Body({ cfg, day, d, days, onClose, onChange }: {
  month: string; cfg: MonthConfig; day: number; d: ReturnType<typeof buildDays>[number]; days: ReturnType<typeof buildDays>;
  onClose: () => void; onChange: (n: number, o: DayOverride | null) => void;
}) {
  const absent = d.type === "vac" || d.type === "baja";
  const defaultType: DayType = d.isWeekend ? "sdf" : "lab";
  const split = d.guardia ? splitGuardia(days, day - 1) : null;

  const setType = (t: DayType) => {
    const type = t === defaultType ? undefined : t;
    const keepG = t !== "vac" && t !== "baja";
    onChange(day, { type, guardia: keepG ? cfg.days[day]?.guardia ?? null : null });
  };
  const setGuardia = (g: { mode: GuardiaMode; customHours: number } | null) =>
    onChange(day, { type: cfg.days[day]?.type, guardia: g });

  return (
    <>
      <div className="sheet-grab" />
      <div className="sheet-head">
        <div>
          <Drawer.Title className="sheet-day">{day}</Drawer.Title>
          <p className="sheet-wd">{WD[d.weekday]}</p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>

      <p className="sheet-label">Tipo de día</p>
      <ToggleGroup.Root type="single" value={d.type} onValueChange={(v) => v && setType(v as DayType)} className="type-grid">
        {TYPES.map((t) => (
          <ToggleGroup.Item key={t} value={t} className={`type-chip t-${t}`}>{DAY_TYPE_LABEL[t]}</ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      <div className={"g-row" + (absent ? " disabled" : "")}>
        <div className="g-row-l">
          <span className="g-ico"><IconMoon size={18} /></span>
          <div>
            <p className="sheet-label" style={{ margin: 0 }}>Guardia</p>
            <p className="g-sub">{absent ? "No disponible en vacaciones o baja" : "Empieza este día"}</p>
          </div>
        </div>
        <Toggle
          label="Guardia" checked={!!d.guardia} disabled={absent}
          onChange={(v) => setGuardia(v ? { mode: d.isWeekend || d.type !== "lab" ? "24" : "17", customHours: 17 } : null)}
        />
      </div>

      {d.guardia && (
        <div className="g-panel">
          <ToggleGroup.Root type="single" className="seg" value={d.guardia.mode} onValueChange={(v) => v && setGuardia({ ...d.guardia!, mode: v as GuardiaMode })}>
            {MODES.map((m) => (
              <ToggleGroup.Item key={m.v} value={m.v} className="seg-item"><b>{m.l}</b><small>{m.s}</small></ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
          {d.guardia.mode === "custom" && (
            <div className="stepper">
              <button onClick={() => setGuardia({ ...d.guardia!, customHours: Math.max(0, d.guardia!.customHours - 0.5) })}>−</button>
              <input
                type="number" inputMode="decimal" min={0} max={24} step={0.5} value={d.guardia.customHours}
                onChange={(e) => setGuardia({ ...d.guardia!, customHours: Math.max(0, parseFloat(e.target.value) || 0) })}
              />
              <button onClick={() => setGuardia({ ...d.guardia!, customHours: Math.min(24, d.guardia!.customHours + 0.5) })}>+</button>
              <span>horas a tarifa del día</span>
            </div>
          )}
          {split && d.guardia.mode !== "custom" && (
            <p className="g-split">
              <b>{split.day0} h</b> a tarifa «{DAY_TYPE_LABEL[d.type]}»
              {split.day1 > 0 && split.day1Type && <> + <b>{split.day1} h</b> del día siguiente</>}
            </p>
          )}
          {split && split.deferred > 0 && (
            <p className="warn-box"><IconWarn size={14} /> {split.deferred} h caen ya en el mes siguiente: se pagarán en esa complementaria, no en este mes.</p>
          )}
        </div>
      )}

      <button className="primary-btn" onClick={onClose}>Listo</button>
    </>
  );
}
