import { fmtEur, fmtNum, monthLabel, type Totals } from "./calc";
import { DAY_TYPE_LABEL } from "./rates";
import type { DayType, DayView, MonthConfig } from "./types";

export interface ShareInput {
  month: string;
  cfg: MonthConfig;
  totals: Totals;
  days: DayView[];
}

const totalGuardiaHours = (t: Totals) => t.buckets.lab + t.buckets.sdf + t.buckets.esp;

/** Horas sin decimales innecesarios: 108 → "108", 17,5 → "17,5". */
const fmtHours = (h: number) => h.toLocaleString("es-ES", { maximumFractionDigits: 1 });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Resumen del mes en texto plano, pensado para pegar en un chat. */
export function buildSummaryText({ month, cfg, totals: t, days }: ShareInput, showAmounts: boolean): string {
  const lines = [`${capitalize(monthLabel(month))} · ${cfg.year}`];
  const guardias = days.filter((d) => d.guardia).map((d) => d.n);
  lines.push(
    guardias.length
      ? `Guardias (${guardias.length}): días ${guardias.join(", ")} · ${fmtHours(totalGuardiaHours(t))} h`
      : "Sin guardias",
  );
  const vac = days.filter((d) => d.type === "vac").length;
  const baja = days.filter((d) => d.type === "baja").length;
  if (vac) lines.push(`Vacaciones: ${vac} ${vac === 1 ? "día" : "días"}`);
  if (baja) lines.push(`${DAY_TYPE_LABEL.baja}: ${baja} ${baja === 1 ? "día" : "días"}`);
  if (showAmounts) {
    lines.push(`Bruto: ${fmtEur(t.bruto)}`, `Líquido: ${fmtEur(t.neto)}`);
  }
  return lines.join("\n");
}

// --- Imagen -------------------------------------------------------------------------------------------------

const W = 1080;
const H = 1350;
const PAD = 64;
const SANS = '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';

// La imagen es siempre clara, con independencia del tema del dispositivo.
const C = {
  bg: "#f3f5f2",
  card: "#ffffff",
  ink: "#14211c",
  ink2: "#566860",
  ink3: "#8a9a92",
  brand: "#0f766e",
  cell: { lab: "#e9ede8", sdf: "#b9d8f7", esp: "#ffd88a", vac: "#a6e3b2", baja: "#f6b1a9" },
  cellInk: { lab: "#14211c", sdf: "#0a3a70", esp: "#5e3a00", vac: "#0b4a1e", baja: "#7d1d16" },
  holiday: "#c2410c",
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Espera a que las fuentes de la app estén cargadas para que el canvas no dibuje con la de reserva. */
async function loadFonts() {
  await Promise.all(
    [`800 40px ${SANS}`, `600 40px ${SANS}`, `700 40px ${MONO}`].map((f) => document.fonts.load(f).catch(() => [])),
  );
}

function drawHero(ctx: CanvasRenderingContext2D, input: ShareInput, showAmounts: boolean) {
  const { month, cfg, totals: t } = input;
  const grad = ctx.createLinearGradient(0, 0, W, 560);
  grad.addColorStop(0, "#0b5f59");
  grad.addColorStop(1, "#12a37f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 560);
  const glow = ctx.createRadialGradient(W - 120, 40, 0, W - 120, 40, 420);
  glow.addColorStop(0, "rgba(255,255,255,0.28)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 560);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `800 26px ${SANS}`;
  ctx.textAlign = "left";
  ctx.fillText("SUELDO RESI", PAD, 88);
  ctx.textAlign = "right";
  ctx.fillText(cfg.year, W - PAD, 88);

  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = `800 58px ${SANS}`;
  ctx.fillText(capitalize(monthLabel(month)), PAD, 170);

  const hours = totalGuardiaHours(t);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `700 24px ${SANS}`;
  ctx.fillText(showAmounts ? "LÍQUIDO A PERCIBIR" : "GUARDIAS DEL MES", PAD, 240);

  ctx.fillStyle = "#fff";
  if (showAmounts) {
    // Parte entera grande y decimales más pequeños, como en la app.
    const [integer, decimals] = fmtNum(t.neto).split(",");
    ctx.font = `700 120px ${MONO}`;
    ctx.fillText(integer, PAD, 356);
    const intWidth = ctx.measureText(integer).width;
    ctx.font = `700 64px ${MONO}`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(`,${decimals} €`, PAD + intWidth + 6, 356);
    ctx.globalAlpha = 1;
  } else {
    ctx.font = `800 112px ${SANS}`;
    ctx.fillText(`${t.guardias} ${t.guardias === 1 ? "guardia" : "guardias"}`, PAD, 350);
  }

  const stats: [string, string][] = showAmounts
    ? [
        ["Bruto", fmtEur(t.bruto)],
        ["Guardias", fmtEur(t.guardiasBruto)],
        ["Retenciones", `−${fmtEur(t.totalSS + t.irpfAmount)}`],
      ]
    : [
        ["Horas de guardia", `${fmtHours(hours)} h`],
        ["Días trabajados", `${t.workedDays}/${t.daysInMonth}`],
        ["Días libres", `${t.daysInMonth - t.workedDays}`],
      ];
  const gap = 20;
  const bw = (W - PAD * 2 - gap * 2) / 3;
  stats.forEach(([label, value], i) => {
    const x = PAD + i * (bw + gap);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    roundRect(ctx, x, 420, bw, 96, 24);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = `600 21px ${SANS}`;
    ctx.fillText(label, x + 24, 458);
    ctx.fillStyle = "#fff";
    ctx.font = `600 27px ${MONO}`;
    ctx.fillText(value, x + 24, 498);
  });
}

function drawCalendar(ctx: CanvasRenderingContext2D, input: ShareInput) {
  const { days } = input;
  const top = 596;
  const cardH = 676;
  const legendH = 74; // hueco para la leyenda al pie de la tarjeta
  ctx.fillStyle = C.card;
  roundRect(ctx, PAD - 16, top, W - (PAD - 16) * 2, cardH, 36);
  ctx.fill();

  const gridX = PAD;
  const gridW = W - PAD * 2;
  const gap = 10;
  const cw = (gridW - gap * 6) / 7;
  const offset =
    (new Date(input.month.split("-").map(Number)[0], Number(input.month.split("-")[1]) - 1, 1).getDay() + 6) % 7;
  const rows = Math.ceil((offset + days.length) / 7);
  // Las celdas se ajustan a la altura de la tarjeta: más grandes en meses de 5 filas.
  const ch = Math.min(112, (cardH - 78 - legendH - 30 - (rows - 1) * gap) / rows);

  ctx.textAlign = "center";
  ctx.fillStyle = C.ink3;
  ctx.font = `800 22px ${SANS}`;
  ["L", "M", "X", "J", "V", "S", "D"].forEach((h, i) => ctx.fillText(h, gridX + i * (cw + gap) + cw / 2, top + 52));

  days.forEach((d, i) => {
    const pos = offset + i;
    const x = gridX + (pos % 7) * (cw + gap);
    const y = top + 78 + Math.floor(pos / 7) * (ch + gap);
    ctx.fillStyle = C.cell[d.type];
    roundRect(ctx, x, y, cw, ch, 18);
    ctx.fill();
    if (d.guardia) {
      ctx.strokeStyle = C.brand;
      ctx.lineWidth = 4;
      roundRect(ctx, x + 2, y + 2, cw - 4, ch - 4, 16);
      ctx.stroke();
    }
    ctx.fillStyle = C.cellInk[d.type];
    ctx.font = `800 30px ${SANS}`;
    ctx.fillText(String(d.n), x + cw / 2, y + (d.guardia ? 38 : 50));
    if (d.holiday) {
      ctx.fillStyle = C.holiday;
      ctx.beginPath();
      ctx.arc(x + cw - 16, y + 16, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (d.guardia) {
      const label = d.guardia.mode === "custom" ? `${d.guardia.customHours}h` : `${d.guardia.mode}h`;
      ctx.fillStyle = C.brand;
      roundRect(ctx, x + cw / 2 - 30, y + ch - 32, 60, 24, 12);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `800 17px ${SANS}`;
      ctx.fillText(label, x + cw / 2, y + ch - 14);
    } else if (d.type === "vac" || d.type === "baja") {
      ctx.fillStyle = C.cellInk[d.type];
      ctx.font = `800 15px ${SANS}`;
      ctx.fillText(d.type === "vac" ? "VAC" : "BAJA", x + cw / 2, y + ch - 12);
    }
  });
  drawLegend(ctx, days, top, cardH);
}

const TYPE_LEGEND: Record<DayType, string> = {
  lab: "Laborable",
  sdf: "Fin de semana / festivo",
  esp: "Festivo especial",
  vac: "Vacaciones",
  baja: "Baja",
};

interface LegendItem {
  label: string;
  swatch: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
}

const SWATCH = 22;

/** Leyenda de lo que aparece en el mes: solo los tipos de día usados, las guardias y los festivos. */
function legendItems(days: DayView[]): LegendItem[] {
  const items: LegendItem[] = [];
  const present = new Set(days.map((d) => d.type));
  for (const type of ["lab", "sdf", "esp", "vac", "baja"] as DayType[]) {
    if (!present.has(type)) continue;
    items.push({
      label: TYPE_LEGEND[type],
      swatch: (ctx, x, y) => {
        ctx.fillStyle = C.cell[type];
        roundRect(ctx, x, y, SWATCH, SWATCH, 6);
        ctx.fill();
      },
    });
  }
  if (days.some((d) => d.guardia)) {
    items.push({
      label: "Guardia (horas)",
      swatch: (ctx, x, y) => {
        ctx.strokeStyle = C.brand;
        ctx.lineWidth = 3.5;
        roundRect(ctx, x + 1.75, y + 1.75, SWATCH - 3.5, SWATCH - 3.5, 6);
        ctx.stroke();
      },
    });
  }
  if (days.some((d) => d.holiday)) {
    items.push({
      label: "Festivo",
      swatch: (ctx, x, y) => {
        ctx.fillStyle = C.holiday;
        ctx.beginPath();
        ctx.arc(x + SWATCH / 2, y + SWATCH / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      },
    });
  }
  return items;
}

function drawLegend(ctx: CanvasRenderingContext2D, days: DayView[], top: number, cardH: number) {
  const items = legendItems(days);
  ctx.font = `600 21px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const gapX = 26;
  const labelGap = 10;
  const widths = items.map((it) => SWATCH + labelGap + ctx.measureText(it.label).width);
  const maxW = W - PAD * 2;

  // Reparte los elementos en líneas que quepan en el ancho disponible.
  const lines: number[][] = [[]];
  let used = 0;
  widths.forEach((w, i) => {
    if (used > 0 && used + gapX + w > maxW) {
      lines.push([]);
      used = 0;
    }
    lines[lines.length - 1].push(i);
    used += (used > 0 ? gapX : 0) + w;
  });

  const lineH = 32;
  const blockH = lines.length * lineH;
  let y = top + cardH - 14 - blockH;
  for (const line of lines) {
    const total = line.reduce((a, i) => a + widths[i], 0) + gapX * (line.length - 1);
    let x = (W - total) / 2;
    for (const i of line) {
      items[i].swatch(ctx, x, y + 2);
      ctx.fillStyle = C.ink2;
      ctx.fillText(items[i].label, x + SWATCH + labelGap, y + 20);
      x += widths[i] + gapX;
    }
    y += lineH;
  }
}

/** Dibuja la tarjeta resumen del mes y la devuelve como PNG. */
export async function renderShareImage(input: ShareInput, showAmounts: boolean): Promise<Blob> {
  await loadFonts();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  drawHero(ctx, input, showAmounts);
  drawCalendar(ctx, input);

  ctx.textAlign = "center";
  ctx.fillStyle = C.ink3;
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText("Calculado con Sueldo Resi · marodseg.github.io/calculadora-sueldo-resi", W / 2, H - 32);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen"))), "image/png"),
  );
}
