import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { downloadBlob } from "../lib/backup";
import { parseMonth } from "../lib/calc";
import { buildIcs, type IcsMonth, type Reminder } from "../lib/ics";
import type { Store } from "../lib/useStore";
import { IconClose, IconDownload, IconShare } from "./icons";
import { SheetLayout } from "./SheetLayout";
import { Dropdown, Toggle } from "./ui";

type Scope = "month" | "year" | "all";

const REMINDERS: { value: Reminder; label: string }[] = [
  { value: "none", label: "Ninguno" },
  { value: "1h", label: "1 hora antes" },
  { value: "1d", label: "1 día antes" },
];

interface Props {
  store: Store;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function OptionRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="g-row option-row">
      <div>
        <p className="sheet-label" style={{ margin: 0 }}>
          {title}
        </p>
        <p className="g-sub">{hint}</p>
      </div>
      <Toggle label={title} checked={checked} onChange={onChange} />
    </div>
  );
}

export function CalendarExportSheet({ store, open, onOpenChange }: Props) {
  const { month, data, cfg } = store;
  const year = parseMonth(month).y;

  const [scope, setScope] = useState<Scope>("year");
  const [guardias, setGuardias] = useState(true);
  const [ausencias, setAusencias] = useState(true);
  const [festivos, setFestivos] = useState(false);
  const [reminder, setReminder] = useState<Reminder>("none");

  const months: IcsMonth[] = useMemo(() => {
    if (scope === "month") return [{ key: month, cfg: data.months[month] ?? cfg }];
    if (scope === "year") {
      return Array.from({ length: 12 }, (_, i) => {
        const key = `${year}-${String(i + 1).padStart(2, "0")}`;
        return { key, cfg: data.months[key] ?? null };
      });
    }
    return Object.keys(data.months)
      .sort()
      .map((key) => ({ key, cfg: data.months[key] }));
  }, [scope, month, year, data.months, cfg]);

  const ics = useMemo(
    () => buildIcs(months, { guardias, ausencias, festivos, reminder }),
    [months, guardias, ausencias, festivos, reminder],
  );

  const filename = `sueldo-resi-calendario-${scope === "month" ? month : scope === "year" ? year : "completo"}.ics`;
  const makeBlob = () => new Blob([ics.content], { type: "text/calendar;charset=utf-8" });
  const canShareFile =
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File([""], "x.ics", { type: "text/calendar" })] });

  const download = () => {
    downloadBlob(makeBlob(), filename);
    toast.success("Archivo de calendario guardado");
  };

  const share = async () => {
    const file = new File([makeBlob()], filename, { type: "text/calendar" });
    try {
      await navigator.share({ files: [file], title: "Guardias" });
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("No se pudo compartir");
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-backdrop" />
        <Drawer.Content className="sheet" aria-describedby={undefined}>
          <SheetLayout
            header={
              <>
                <div className="sheet-grab" />
                <div className="sheet-head">
                  <Drawer.Title className="share-title">Añadir a mi calendario</Drawer.Title>
                  <button className="icon-btn" onClick={() => onOpenChange(false)} aria-label="Cerrar">
                    <IconClose size={18} />
                  </button>
                </div>
              </>
            }
          >
            <p className="sheet-label">Qué exportar</p>
            <ToggleGroup.Root
              type="single"
              className="seg"
              value={scope}
              onValueChange={(value) => value && setScope(value as Scope)}
            >
              <ToggleGroup.Item value="month" className="seg-item">
                <b>Este mes</b>
              </ToggleGroup.Item>
              <ToggleGroup.Item value="year" className="seg-item">
                <b>Año {year}</b>
              </ToggleGroup.Item>
              <ToggleGroup.Item value="all" className="seg-item">
                <b>Todo</b>
                <small>meses guardados</small>
              </ToggleGroup.Item>
            </ToggleGroup.Root>

            <div className="option-list">
              <OptionRow title="Guardias" hint="Con su horario real" checked={guardias} onChange={setGuardias} />
              <OptionRow
                title="Vacaciones y bajas"
                hint="Un evento por periodo"
                checked={ausencias}
                onChange={setAusencias}
              />
              <OptionRow
                title="Festivos"
                hint="Andalucía y Granada, de día completo"
                checked={festivos}
                onChange={setFestivos}
              />
            </div>

            <div className="g-row option-row">
              <div>
                <p className="sheet-label" style={{ margin: 0 }}>
                  Recordatorio
                </p>
                <p className="g-sub">Aviso antes de cada guardia</p>
              </div>
              <div style={{ width: 150 }}>
                <Dropdown label="Recordatorio" value={reminder} onChange={setReminder} options={REMINDERS} />
              </div>
            </div>

            <p className="hint" role="status">
              {ics.events === 0
                ? "No hay nada que exportar con estas opciones."
                : `${ics.events} ${ics.events === 1 ? "evento" : "eventos"} · sin importes ni datos personales.`}
            </p>

            <div className="share-actions">
              <button className="primary-btn" onClick={download} disabled={ics.events === 0}>
                <IconDownload size={18} /> Descargar .ics
              </button>
              {canShareFile && (
                <button className="btn" onClick={() => void share()} disabled={ics.events === 0}>
                  <IconShare size={16} /> Compartir archivo
                </button>
              )}
            </div>

            <p className="hint">
              Ábrelo con Google Calendar, Apple Calendar u Outlook. Si vuelves a exportar, en la mayoría de calendarios
              los eventos se actualizan en vez de duplicarse. Consejo: impórtalo a un calendario propio para poder
              borrarlo entero si algo cambia.
            </p>
          </SheetLayout>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
