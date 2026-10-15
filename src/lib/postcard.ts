import type { Palette } from "./sprites";

// Price postcards: a 1200x630 PNG (the size social sites use for link previews), drawn in code like the street.

export const CARD_W = 1200;
export const CARD_H = 630;

export interface PostcardSpec {
  kicker: string;
  title: string;
  left: { label: string; value: string; note?: string };
  right: { label: string; value: string; note?: string };
  verdict: string;
  footer: string;
  sprite?: { grid: string[]; palette: Palette };
}

const INK = "#1c1c22";
const TAXI = "#f2c230";
const DUSK = "#26365e";
const DUSK_DEEP = "#1a2544";
const GLOW = "#f2a65a";
const CHALK = "#f3f5f7";
const BEST = "#b8232f";
const PIXEL = '"Silkscreen", ui-monospace, monospace';
const SANS = '"Bricolage Grotesque Variable", system-ui, sans-serif';

/** Skyline heights: deterministic so every card looks the same. */
const SKYLINE = [3, 5, 4, 8, 6, 3, 9, 12, 7, 4, 5, 10, 6, 3, 4, 7, 11, 5, 3, 6, 8, 4, 5, 9, 6, 3];

export function drawPostcard(canvas: HTMLCanvasElement, spec: PostcardSpec) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const g = canvas.getContext("2d")!;
  g.imageSmoothingEnabled = false;

  // sky in hard pixel bands, dusk to glow
  const bands = [DUSK_DEEP, "#212f53", DUSK, "#3b4470", "#6a5a7a", "#a56c6e", "#c77d6b", GLOW];
  const bandH = CARD_H / bands.length;
  bands.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(0, Math.floor(i * bandH), CARD_W, Math.ceil(bandH) + 1);
  });

  // skyline silhouette along the bottom
  const unit = 16;
  g.fillStyle = "#141b33";
  let x = 0;
  SKYLINE.forEach((h, i) => {
    const w = unit * (2 + (i % 3));
    g.fillRect(x, CARD_H - h * unit, w, h * unit);
    x += w;
  });
  // lit windows
  g.fillStyle = TAXI;
  x = 0;
  SKYLINE.forEach((h, i) => {
    const w = unit * (2 + (i % 3));
    for (let r = 1; r < h - 1; r += 2) for (let c = 0; c < w / unit - 1; c++) if ((r * 7 + c * 3 + i) % 5 === 0) g.fillRect(x + 6 + c * unit, CARD_H - h * unit + r * unit + 4, 6, 6);
    x += w;
  });

  // the card: taxi-yellow board with a hard ink shadow, like the start screen
  const cx = 60;
  const cy = 40;
  const cw = CARD_W - 120;
  const ch = 470;
  g.fillStyle = INK;
  g.fillRect(cx + 12, cy + 12, cw, ch);
  g.fillRect(cx - 6, cy - 6, cw + 12, ch + 12);
  g.fillStyle = TAXI;
  g.fillRect(cx, cy, cw, ch);

  // stamp corner
  g.fillStyle = BEST;
  g.fillRect(cx + cw - 148, cy + 22, 120, 112);
  g.fillStyle = DUSK;
  g.fillRect(cx + cw - 140, cy + 30, 104, 96);
  if (spec.sprite) drawSprite(g, spec.sprite.grid, spec.sprite.palette, cx + cw - 88, cy + 38, 80);

  g.fillStyle = INK;
  g.textBaseline = "alphabetic";
  g.font = `700 22px ${PIXEL}`;
  g.fillText(spec.kicker.toUpperCase(), cx + 36, cy + 56);
  g.font = `700 52px ${PIXEL}`;
  fitText(g, spec.title, cx + 36, cy + 122, cw - 230, 52, PIXEL);

  // two big numbers with an arrow between
  const colY = cy + 176;
  const gap = 130;
  const colW = (cw - 72 - gap) / 2;
  drawFigure(g, spec.left, cx + 36, colY, colW);
  g.fillStyle = INK;
  const ax = cx + 36 + colW + 30;
  g.fillRect(ax, colY + 78, 46, 10);
  g.beginPath();
  g.moveTo(ax + 46, colY + 64);
  g.lineTo(ax + 68, colY + 83);
  g.lineTo(ax + 46, colY + 102);
  g.fill();
  drawFigure(g, spec.right, cx + 36 + colW + gap, colY, colW);

  // verdict strip
  g.fillStyle = INK;
  g.fillRect(cx, cy + ch - 84, cw, 84);
  g.fillStyle = TAXI;
  g.font = `600 30px ${SANS}`;
  fitText(g, spec.verdict, cx + 36, cy + ch - 31, cw - 72, 30, SANS, "600");

  // footer below the card
  g.fillStyle = CHALK;
  g.font = `400 18px ${PIXEL}`;
  g.fillText(spec.footer, cx, CARD_H - 30);
}

function drawFigure(g: CanvasRenderingContext2D, f: PostcardSpec["left"], x: number, y: number, w: number) {
  g.fillStyle = INK;
  g.font = `700 24px ${PIXEL}`;
  g.fillText(f.label, x, y + 20);
  g.font = `800 92px ${SANS}`;
  fitText(g, f.value, x, y + 116, w, 92, SANS, "800");
  if (f.note) {
    g.font = `500 20px ${SANS}`;
    g.fillStyle = "#3a3420";
    fitText(g, f.note, x, y + 152, w, 20, SANS, "500");
  }
}

/** Shrinks the font until the text fits the width. */
function fitText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, family: string, weight = "700") {
  let s = size;
  g.font = `${weight} ${s}px ${family}`;
  while (g.measureText(text).width > maxW && s > 10) {
    s -= 2;
    g.font = `${weight} ${s}px ${family}`;
  }
  g.fillText(text, x, y);
}

function drawSprite(g: CanvasRenderingContext2D, grid: string[], palette: Palette, cx: number, top: number, height: number) {
  const px = Math.max(1, Math.floor(height / grid.length));
  const w = Math.max(...grid.map((r) => r.length));
  const left = Math.round(cx - (w * px) / 2);
  grid.forEach((row, y) =>
    [...row].forEach((ch, xx) => {
      const c = palette[ch];
      if (!c) return;
      g.fillStyle = c;
      g.fillRect(left + xx * px, top + y * px, px, px);
    }),
  );
}

export const canvasBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not draw the postcard"))), "image/png"));

/** Shares the PNG through the system share sheet where supported, otherwise downloads it. */
export async function shareOrDownload(canvas: HTMLCanvasElement, filename: string, text: string, url: string) {
  const blob = await canvasBlob(canvas);
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, url });
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "cancelled";
    }
  }
  download(blob, filename);
  return "downloaded";
}

export function download(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
