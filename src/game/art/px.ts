// A tiny pixel painter. Every sprite in the game is drawn with this at 1 canvas pixel = 1 game pixel,
// then scaled up crisp by the camera. No image files: the whole city is code.

export type Col = string;

export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Mix two hex colours. */
export function mix(a: Col, b: Col, t: number): Col {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
export const darken = (c: Col, t = 0.25) => mix(c, "#140c14", t);
export const lighten = (c: Col, t = 0.25) => mix(c, "#fff6e0", t);

/** A three-step ramp (shadow, base, light) from one colour, the way pixel artists shade. */
export const ramp = (c: Col) => ({ dk: darken(c, 0.3), md: c, lt: lighten(c, 0.28) });

export const OUTLINE = "#22161c";

export class Px {
  readonly c: HTMLCanvasElement;
  readonly g: CanvasRenderingContext2D;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.c = document.createElement("canvas");
    this.c.width = w;
    this.c.height = h;
    this.g = this.c.getContext("2d", { willReadFrequently: true })!;
    this.g.imageSmoothingEnabled = false;
  }

  rect(x: number, y: number, w: number, h: number, col: Col) {
    if (w <= 0 || h <= 0) return this;
    this.g.fillStyle = col;
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    return this;
  }
  px(x: number, y: number, col: Col) {
    return this.rect(x, y, 1, 1, col);
  }
  hline(x: number, y: number, w: number, col: Col) {
    return this.rect(x, y, w, 1, col);
  }
  vline(x: number, y: number, h: number, col: Col) {
    return this.rect(x, y, 1, h, col);
  }
  clear(x: number, y: number, w: number, h: number) {
    this.g.clearRect(x, y, w, h);
    return this;
  }

  /** Filled pixel ellipse (no anti-aliasing). */
  ellipse(cx: number, cy: number, rx: number, ry: number, col: Col) {
    for (let y = -ry; y <= ry; y++) {
      const k = 1 - (y * y) / ((ry + 0.5) * (ry + 0.5));
      if (k < 0) continue;
      const dx = Math.round(rx * Math.sqrt(k));
      this.rect(cx - dx, cy + y, dx * 2 + 1, 1, col);
    }
    return this;
  }
  circle(cx: number, cy: number, r: number, col: Col) {
    return this.ellipse(cx, cy, r, r, col);
  }

  /** Checkerboard dither, for soft transitions without new colours. */
  dither(x: number, y: number, w: number, h: number, col: Col, phase = 0) {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if ((xx + yy + phase) % 2 === 0) this.px(x + xx, y + yy, col);
    return this;
  }

  /** Random speckles of the given colours: texture for asphalt, plaster, grass. */
  speckle(x: number, y: number, w: number, h: number, cols: Col[], density: number, seed: number) {
    const r = rng(seed);
    const n = Math.round(w * h * density);
    for (let i = 0; i < n; i++) this.px(x + Math.floor(r() * w), y + Math.floor(r() * h), cols[Math.floor(r() * cols.length)]);
    return this;
  }

  /**
   * A 1px outline around every opaque shape. By default it is "tinted": each outline pixel is a deep shade
   * of the colour it borders, which reads soft and painted. Pass ink = true for a hard dark line (characters).
   */
  outline(col: Col = OUTLINE, onlyOutside = true, ink = false) {
    const { w, h } = this;
    const img = this.g.getImageData(0, 0, w, h);
    const d = img.data;
    const a = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
    const out = this.g.createImageData(w, h);
    const o = out.data;
    const base = parseInt(col.slice(1), 16);
    const [br, bg, bb] = [(base >> 16) & 255, (base >> 8) & 255, base & 255];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (onlyOutside && a(x, y) > 0) continue;
        let n = -1;
        for (const [nx, ny] of [
          [x, y + 1],
          [x, y - 1],
          [x - 1, y],
          [x + 1, y],
        ])
          if (a(nx, ny) > 200) {
            n = (ny * w + nx) * 4;
            break;
          }
        if (n < 0) continue;
        const i = (y * w + x) * 4;
        const k = ink ? 1 : 0.62;
        o[i] = Math.round(d[n] * (1 - k) + br * k);
        o[i + 1] = Math.round(d[n + 1] * (1 - k) + bg * k);
        o[i + 2] = Math.round(d[n + 2] * (1 - k) + bb * k);
        o[i + 3] = 255;
      }
    const tmp = new Px(w, h);
    tmp.g.putImageData(out, 0, 0);
    this.g.drawImage(tmp.c, 0, 0);
    return this;
  }

  /** Paints a text-grid sprite (one character = one pixel, "." transparent). */
  grid(x: number, y: number, rows: string[], pal: Record<string, Col>, flip = false) {
    rows.forEach((row, yy) => {
      const w = row.length;
      [...row].forEach((ch, xx) => {
        const c = pal[ch];
        if (c) this.px(x + (flip ? w - 1 - xx : xx), y + yy, c);
      });
    });
    return this;
  }

  /** Copy another painter's pixels in (optionally mirrored). */
  draw(src: Px | HTMLCanvasElement, x: number, y: number, flip = false) {
    const c = src instanceof Px ? src.c : src;
    if (!flip) this.g.drawImage(c, x, y);
    else {
      this.g.save();
      this.g.translate(x + c.width, y);
      this.g.scale(-1, 1);
      this.g.drawImage(c, 0, 0);
      this.g.restore();
    }
    return this;
  }

  /** Tiny pixel text (3x5 font) for signboards. */
  text(x: number, y: number, s: string, col: Col) {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const glyph = FONT[ch];
      if (glyph) {
        glyph.forEach((row, yy) => [...row].forEach((b, xx) => b === "1" && this.px(cx + xx, y + yy, col)));
        cx += glyph[0].length + 1;
      } else cx += 3;
    }
    return this;
  }
}

export const textWidth = (s: string) => [...s.toUpperCase()].reduce((w, ch) => w + (FONT[ch] ? FONT[ch][0].length + 1 : 3), 0) - 1;

// 3x5 pixel font: enough for shop boards ("CHAI RS15", "VADA PAV", "BEST", platform numbers).
const FONT: Record<string, string[]> = {
  A: ["111", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["111", "100", "100", "100", "111"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["111", "100", "101", "101", "111"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "111"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["1001", "1101", "1011", "1001", "1001"],
  O: ["111", "101", "101", "101", "111"],
  P: ["111", "101", "111", "100", "100"],
  Q: ["111", "101", "101", "111", "001"],
  R: ["111", "101", "110", "101", "101"],
  S: ["111", "100", "111", "001", "111"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "010"],
  W: ["10001", "10001", "10101", "11011", "10001"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "001", "001", "001"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  "₹": ["111", "010", "111", "010", "001"],
  "/": ["001", "001", "010", "100", "100"],
  "-": ["000", "000", "111", "000", "000"],
  ".": ["0", "0", "0", "0", "1"],
  ":": ["0", "1", "0", "1", "0"],
  "&": ["010", "101", "010", "101", "011"],
};
