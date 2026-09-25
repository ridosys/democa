import "server-only";
import path from "node:path";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import type { ReceiptLine } from "@/features/invoices/bluetooth-receipt";
import type { ReceiptPaperSize } from "@/lib/receipt-paper";

/**
 * Renders a receipt to a black-on-white PNG as wide as the thermal printer's
 * print head, for the printer apps to print as a bitmap. Used for Arabic:
 * Skia shapes (joins) the letters and lays out right-to-left text itself, so
 * the paper shows the text exactly as on screen — which neither the
 * printer's code pages nor the apps' basic HTML renderers manage.
 */

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const LATIN = "ReceiptLatin";
const ARABIC = "ReceiptArabic";

let fontsRegistered = false;
function registerFonts() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "NotoSans-Regular.ttf"), LATIN);
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "NotoSans-Bold.ttf"), LATIN);
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "NotoSansArabic-Regular.ttf"), ARABIC);
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "NotoSansArabic-Bold.ttf"), ARABIC);
  fontsRegistered = true;
}

/** Printable dots per line at 203 dpi: 48mm on 58mm paper, 72mm on 80mm. */
export function receiptImageWidth(paper: ReceiptPaperSize): number {
  return paper === "58mm" ? 384 : 576;
}

type Dir = "rtl" | "ltr";
type Align = "start" | "end" | "center";
type Op =
  | { kind: "text"; text: string; y: number; size: number; bold: boolean; align: Align; dir: Dir }
  | { kind: "rule"; y: number };

const PADDING = 8;
const LINE_HEIGHT = 1.5;
const GAP = 12;

function font(size: number, bold: boolean) {
  return `${bold ? "bold " : ""}${size}px ${LATIN}, ${ARABIC}`;
}

/** Word-wraps by measured pixel width, hard-splitting over-long words. */
function wrap(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  let line = "";
  const fits = (value: string) => ctx.measureText(value).width <= maxWidth;
  for (const word of text.replace(/\s+/g, " ").trim().split(" ")) {
    let rest = word;
    while (!fits(rest)) {
      let cut = rest.length - 1;
      while (cut > 1 && !fits(rest.slice(0, cut))) cut--;
      if (line) {
        out.push(line);
        line = "";
      }
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    if (!line) line = rest;
    else if (fits(`${line} ${rest}`)) line += ` ${rest}`;
    else {
      out.push(line);
      line = rest;
    }
  }
  if (line) out.push(line);
  return out.length > 0 ? out : [""];
}

function layout(
  ctx: SKRSContext2D,
  lines: ReceiptLine[],
  width: number,
  dir: Dir,
): { ops: Op[]; height: number } {
  const base = width >= 576 ? 26 : 25;
  const inner = width - PADDING * 2;
  const ops: Op[] = [];
  let y = PADDING;

  const pushText = (text: string, size: number, bold: boolean, align: Align, textDir: Dir) => {
    ops.push({ kind: "text", text, y, size, bold, align, dir: textDir });
    y += Math.round(size * LINE_HEIGHT);
  };
  const wrapped = (text: string, size: number, bold: boolean, align: Align, textDir: Dir) => {
    ctx.font = font(size, bold);
    for (const part of wrap(ctx, text, inner)) pushText(part, size, bold, align, textDir);
  };
  /** Label on the start side, value on the end side of the same line. */
  const row = (label: string, value: string, size: number, bold: boolean) => {
    ctx.font = font(size, bold);
    const valueWidth = ctx.measureText(value).width;
    const labelParts = wrap(ctx, label, Math.max(inner / 3, inner - valueWidth - GAP));
    ops.push({ kind: "text", text: value, y, size, bold, align: "end", dir });
    for (const part of labelParts) pushText(part, size, bold, "start", dir);
  };

  for (const line of lines) {
    switch (line.kind) {
      case "title":
        wrapped(line.text, Math.round(base * 1.5), true, "center", dir);
        break;
      case "center":
        wrapped(line.text, base, Boolean(line.bold), "center", line.ltr ? "ltr" : dir);
        break;
      case "text":
        wrapped(line.text, base, false, "start", dir);
        break;
      case "row":
        row(line.left, line.right, base, Boolean(line.bold));
        break;
      case "item": {
        wrapped(line.name, base, true, "start", dir);
        const size = Math.round(base * 0.9);
        ctx.font = font(size, false);
        ops.push({ kind: "text", text: line.detail, y, size, bold: false, align: "start", dir: "ltr" });
        ops.push({ kind: "text", text: line.total, y, size, bold: false, align: "end", dir: "ltr" });
        y += Math.round(size * LINE_HEIGHT);
        break;
      }
      case "total":
        row(line.label, line.value, Math.round(base * 1.3), true);
        break;
      case "rule":
        y += Math.round(base * 0.4);
        ops.push({ kind: "rule", y });
        y += Math.round(base * 0.6);
        break;
    }
  }
  // Blank feed past the tear bar.
  y += base * 3;
  return { ops, height: Math.ceil(y + PADDING) };
}

export function renderReceiptImage(
  lines: ReceiptLine[],
  { paper, dir }: { paper: ReceiptPaperSize; dir: Dir },
): Buffer {
  registerFonts();
  const width = receiptImageWidth(paper);
  const measure = createCanvas(width, 10).getContext("2d");
  const { ops, height } = layout(measure, lines, width, dir);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.textBaseline = "top";

  // "start" is the right edge on an RTL receipt, the left edge otherwise.
  const startX = dir === "rtl" ? width - PADDING : PADDING;
  const endX = dir === "rtl" ? PADDING : width - PADDING;
  const startAlign = dir === "rtl" ? "right" : "left";
  const endAlign = dir === "rtl" ? "left" : "right";

  for (const op of ops) {
    if (op.kind === "rule") {
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(PADDING, op.y);
      ctx.lineTo(width - PADDING, op.y);
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    ctx.font = font(op.size, op.bold);
    ctx.direction = op.dir;
    if (op.align === "center") {
      ctx.textAlign = "center";
      ctx.fillText(op.text, width / 2, op.y);
    } else if (op.align === "start") {
      ctx.textAlign = startAlign;
      ctx.fillText(op.text, startX, op.y);
    } else {
      ctx.textAlign = endAlign;
      ctx.fillText(op.text, endX, op.y);
    }
  }

  return canvas.toBuffer("image/png");
}
