import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { downloadBlob } from "../lib/backup";
import { buildDays } from "../lib/calc";
import { buildSummaryText, renderShareImage, type ShareInput } from "../lib/share";
import type { Store } from "../lib/useStore";
import { IconClose, IconCopy, IconDownload, IconShare } from "./icons";
import { Toggle } from "./ui";

interface Props {
  store: Store;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareSheet({ store, open, onOpenChange }: Props) {
  const { month, cfg, totals } = store;
  const [showAmounts, setShowAmounts] = useState(true);
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);

  const input: ShareInput = useMemo(
    () => ({ month, cfg, totals, days: buildDays(month, cfg.days) }),
    [month, cfg, totals],
  );

  // Genera la imagen al abrir y cada vez que cambian los datos o la opción de mostrar importes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let url = "";
    renderShareImage(input, showAmounts)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
      })
      .catch(() => toast.error("No se pudo generar la imagen"));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, input, showAmounts]);

  const filename = `sueldo-resi-${month}.png`;
  const text = buildSummaryText(input, showAmounts);

  const share = async () => {
    if (!image) return;
    const file = new File([image.blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
      } catch (e) {
        if ((e as Error).name !== "AbortError") toast.error("No se pudo compartir");
      }
    } else {
      downloadBlob(image.blob, filename);
      toast.success("Imagen guardada");
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Resumen copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const canShareFiles = typeof navigator.canShare === "function";

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-backdrop" />
        <Drawer.Content className="sheet share-sheet" aria-describedby={undefined}>
          <div className="sheet-grab" />
          <div className="sheet-head">
            <Drawer.Title className="share-title">Compartir resumen</Drawer.Title>
            <button className="icon-btn" onClick={() => onOpenChange(false)} aria-label="Cerrar">
              <IconClose size={18} />
            </button>
          </div>

          <div className="share-preview">
            {image ? (
              <img src={image.url} alt="Vista previa del resumen del mes" />
            ) : (
              <div className="share-skeleton" />
            )}
          </div>

          <div className="g-row">
            <div>
              <p className="sheet-label" style={{ margin: 0 }}>
                Incluir importes
              </p>
              <p className="g-sub">Desactívalo para compartir solo las guardias</p>
            </div>
            <Toggle label="Incluir importes" checked={showAmounts} onChange={setShowAmounts} />
          </div>

          <div className="share-actions">
            <button className="primary-btn" onClick={() => void share()} disabled={!image}>
              {canShareFiles ? (
                <>
                  <IconShare size={18} /> Compartir imagen
                </>
              ) : (
                <>
                  <IconDownload size={18} /> Guardar imagen
                </>
              )}
            </button>
            <div className="btn-pair" style={{ margin: 0 }}>
              <button className="btn" onClick={() => void copyText()}>
                <IconCopy size={16} /> Copiar texto
              </button>
              <button className="btn" onClick={() => image && downloadBlob(image.blob, filename)} disabled={!image}>
                <IconDownload size={16} /> Descargar
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
