import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { useEffect, useRef } from "react";
import { Drawer } from "vaul";
import { buildDays, splitGuardia } from "../lib/calc";
import { DAY_TYPE_LABEL } from "../lib/rates";
import type { DayOverride, DayType, DayView, Guardia, GuardiaMode, MonthConfig } from "../lib/types";
import { IconClose, IconFlag, IconMoon, IconWarn } from "./icons";
import { SheetLayout } from "./SheetLayout";
import { Toggle } from "./ui";

/** Duración de la animación de cierre de vaul (0,5 s) más un pequeño margen. */
const CLOSE_ANIMATION_MS = 550;

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DAY_TYPES: DayType[] = ["lab", "sdf", "esp", "vac", "baja"];
const GUARDIA_MODES: { value: GuardiaMode; label: string; hint: string }[] = [
  { value: "17", label: "17 h", hint: "15:00–08:00" },
  { value: "24", label: "24 h", hint: "08:00–08:00" },
  { value: "custom", label: "Otra", hint: "a medida" },
];

interface Props {
  month: string;
  cfg: MonthConfig;
  /** Día del mes abierto, o null si el panel está cerrado. */
  day: number | null;
  onClose: () => void;
  onChange: (day: number, override: DayOverride | null) => void;
}

export function DaySheet({ month, cfg, day, onClose, onChange }: Props) {
  const days = day !== null ? buildDays(month, cfg.days) : [];
  const lastDay = useRef<number | null>(null);

  // Devolver el foco a la celda solo cuando el panel ya se ha cerrado del todo: mientras dura la animación,
  // Radix mantiene aria-hidden sobre el resto de la app y un foco ahí dentro sería inaccesible.
  useEffect(() => {
    if (day !== null) {
      lastDay.current = day;
      return;
    }
    if (lastDay.current === null) return;
    const timer = setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-day="${lastDay.current}"]`)?.focus({ preventScroll: true });
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [day]);

  return (
    <Drawer.Root open={day !== null} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-backdrop" />
        <Drawer.Content className="sheet" aria-describedby={undefined} onCloseAutoFocus={(e) => e.preventDefault()}>
          {day !== null && <SheetBody day={day} days={days} cfg={cfg} onClose={onClose} onChange={onChange} />}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

interface BodyProps extends Pick<Props, "cfg" | "onClose" | "onChange"> {
  day: number;
  days: DayView[];
}

function SheetBody({ day, days, cfg, onClose, onChange }: BodyProps) {
  const view = days[day - 1];
  const stored = cfg.days[day];
  const absent = view.type === "vac" || view.type === "baja";
  const defaultType = view.defaultType;
  const split = view.guardia ? splitGuardia(days, day - 1) : null;

  const setType = (type: DayType) => {
    // Vacaciones y baja son incompatibles con una guardia.
    const keepGuardia = type !== "vac" && type !== "baja";
    onChange(day, {
      type: type === defaultType ? undefined : type,
      guardia: keepGuardia ? (stored?.guardia ?? null) : null,
    });
  };
  const setGuardia = (guardia: Guardia | null) => onChange(day, { type: stored?.type, guardia });
  const setHours = (hours: number) =>
    view.guardia && setGuardia({ ...view.guardia, customHours: Math.min(24, Math.max(0, hours)) });

  return (
    <SheetLayout
      header={
        <>
          <div className="sheet-grab" />
          <div className="sheet-head">
            <div>
              <Drawer.Title className="sheet-day">{day}</Drawer.Title>
              <p className="sheet-wd">{WEEKDAYS[view.weekday]}</p>
              {view.holiday && (
                <p className="sheet-holiday">
                  <IconFlag size={13} /> {view.holiday}
                </p>
              )}
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <IconClose size={18} />
            </button>
          </div>
        </>
      }
    >
      <p className="sheet-label">Tipo de día</p>
      <ToggleGroup.Root
        type="single"
        value={view.type}
        onValueChange={(value) => value && setType(value as DayType)}
        className="type-grid"
      >
        {DAY_TYPES.map((type) => (
          <ToggleGroup.Item key={type} value={type} className={`type-chip t-${type}`}>
            {DAY_TYPE_LABEL[type]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      <div className={"g-row" + (absent ? " disabled" : "")}>
        <div className="g-row-l">
          <span className="g-ico">
            <IconMoon size={18} />
          </span>
          <div>
            <p className="sheet-label" style={{ margin: 0 }}>
              Guardia
            </p>
            <p className="g-sub">{absent ? "No disponible en vacaciones o baja" : "Empieza este día"}</p>
          </div>
        </div>
        <Toggle
          label="Guardia"
          checked={!!view.guardia}
          disabled={absent}
          onChange={(on) => setGuardia(on ? { mode: view.type === "lab" ? "17" : "24", customHours: 17 } : null)}
        />
      </div>

      {view.guardia && (
        <div className="g-panel">
          <ToggleGroup.Root
            type="single"
            className="seg"
            value={view.guardia.mode}
            onValueChange={(mode) => mode && setGuardia({ ...view.guardia!, mode: mode as GuardiaMode })}
          >
            {GUARDIA_MODES.map((m) => (
              <ToggleGroup.Item key={m.value} value={m.value} className="seg-item">
                <b>{m.label}</b>
                <small>{m.hint}</small>
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>

          {view.guardia.mode === "custom" && (
            <div className="stepper">
              <button onClick={() => setHours(view.guardia!.customHours - 0.5)} aria-label="Menos horas">
                −
              </button>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={24}
                step={0.5}
                value={view.guardia.customHours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                aria-label="Horas de guardia"
              />
              <button onClick={() => setHours(view.guardia!.customHours + 0.5)} aria-label="Más horas">
                +
              </button>
              <span>horas a tarifa del día</span>
            </div>
          )}

          {split && view.guardia.mode !== "custom" && (
            <p className="g-split">
              <b>{split.day0} h</b> a tarifa «{DAY_TYPE_LABEL[view.type]}»
              {split.day1 > 0 && (
                <>
                  {" "}
                  + <b>{split.day1} h</b> del día siguiente
                </>
              )}
            </p>
          )}
          {split && split.deferred > 0 && (
            <p className="warn-box">
              <IconWarn size={14} /> {split.deferred} h caen ya en el mes siguiente: se pagarán en esa complementaria,
              no en este mes.
            </p>
          )}
        </div>
      )}

      <button className="primary-btn" onClick={onClose}>
        Listo
      </button>
    </SheetLayout>
  );
}
