import { OUTLINE, Px, darken, lighten, mix, rng, textWidth, type Col } from "./px";

// Buildings, trees and street props in 3/4 top-down view: the roof from above, then the wall that faces you.
// Sizes are in game pixels (16 px = one tile).

// ---------------------------------------------------------------- roof + wall helpers
type Roof = "tiles" | "terrace" | "tin" | "tarp" | "glass";

function roof(p: Px, x: number, y: number, w: number, h: number, kind: Roof, col: Col, seed = 1) {
  const r = rng(seed);
  if (kind === "tiles") {
    // Mangalore tiles: rows of half-round scallops, lighter towards the ridge
    p.rect(x, y, w, h, col);
    for (let ry = 0; ry < h; ry += 4) {
      const t = ry / h;
      const rowCol = mix(lighten(col, 0.22), darken(col, 0.18), t);
      p.rect(x, y + ry, w, 4, rowCol);
      p.hline(x, y + ry + 3, w, darken(rowCol, 0.25));
      for (let rx = (ry / 4) % 2 ? 2 : 0; rx < w; rx += 4) p.px(x + rx, y + ry + 2, darken(rowCol, 0.18));
    }
    p.hline(x, y, w, lighten(col, 0.35)); // ridge
    p.vline(x, y, h, darken(col, 0.2));
    p.vline(x + w - 1, y, h, darken(col, 0.3));
    p.speckle(x, y, w, h, [darken(col, 0.35), "#6b7a4a"], 0.012, seed); // moss and soot
  } else if (kind === "terrace") {
    p.rect(x, y, w, h, col);
    p.rect(x, y, w, 2, lighten(col, 0.2)); // parapet
    p.rect(x, y + h - 2, w, 2, darken(col, 0.15));
    p.vline(x, y, h, lighten(col, 0.15));
    p.vline(x + w - 1, y, h, darken(col, 0.2));
    p.speckle(x + 2, y + 2, w - 4, h - 4, [darken(col, 0.12), darken(col, 0.2), lighten(col, 0.1)], 0.08, seed);
    // rain stains
    for (let i = 0; i < 3; i++) p.ellipse(x + 6 + Math.floor(r() * (w - 12)), y + 4 + Math.floor(r() * (h - 8)), 4, 2, darken(col, 0.1));
  } else if (kind === "tin") {
    p.rect(x, y, w, h, col);
    for (let rx = 0; rx < w; rx += 3) p.vline(x + rx, y, h, lighten(col, 0.18));
    p.speckle(x, y, w, h, ["#a0522d", darken(col, 0.3)], 0.03, seed); // rust
  } else if (kind === "tarp") {
    p.rect(x, y, w, h, col);
    for (let i = 0; i < w + h; i += 7) for (let k = 0; k < h; k++) if (i - k >= 0 && i - k < w) p.px(x + i - k, y + k, lighten(col, 0.2));
    p.hline(x, y + h - 1, w, darken(col, 0.3));
  } else {
    p.rect(x, y, w, h, col);
    for (let ry = 0; ry < h; ry += 6) p.hline(x, y + ry, w, lighten(col, 0.25));
    for (let rx = 0; rx < w; rx += 10) p.vline(x + rx, y, h, darken(col, 0.15));
  }
}

function wall(p: Px, x: number, y: number, w: number, h: number, col: Col, seed = 2) {
  p.rect(x, y, w, h, col);
  p.rect(x, y, w, 3, darken(col, 0.3)); // shadow under the eaves
  p.rect(x, y + h - 3, w, 3, darken(col, 0.2)); // damp base
  p.speckle(x, y + 3, w, h - 6, [darken(col, 0.08), darken(col, 0.14), lighten(col, 0.06)], 0.06, seed);
  // monsoon streaks
  const r = rng(seed);
  for (let i = 0; i < w / 18; i++) {
    const sx = x + Math.floor(r() * w);
    p.vline(sx, y + 3, 4 + Math.floor(r() * 10), darken(col, 0.12));
  }
}

function window(p: Px, x: number, y: number, open: boolean, shutter: Col = "#2e8b57", ac = false) {
  p.rect(x, y, 10, 11, darken(shutter, 0.35));
  if (open) {
    p.rect(x + 1, y + 1, 8, 9, "#2b2b36");
    p.rect(x + 1, y + 1, 8, 2, "#ffe29a"); // warm light inside
    for (let gx = x + 2; gx < x + 9; gx += 2) p.vline(gx, y + 1, 9, "#5a5a66"); // grill
    p.rect(x - 2, y + 1, 2, 9, shutter);
    p.rect(x + 10, y + 1, 2, 9, shutter);
  } else {
    p.rect(x + 1, y + 1, 8, 9, shutter);
    p.vline(x + 5, y + 1, 9, darken(shutter, 0.3));
    for (let ly = y + 2; ly < y + 10; ly += 2) p.hline(x + 1, ly, 8, lighten(shutter, 0.15));
  }
  p.hline(x - 1, y + 11, 12, "#cfc6b4"); // sill
  if (ac) {
    p.rect(x + 1, y + 12, 9, 5, "#e9e6e0");
    p.hline(x + 2, y + 14, 7, "#9a9a9e");
  }
}

function laundry(p: Px, x: number, y: number, w: number, seed: number) {
  const r = rng(seed);
  p.hline(x, y, w, "#6b5544");
  const cols = ["#c23b3b", "#2f6fb3", "#e0a526", "#e9e6e0", "#2e8b57", "#7a4fb5", "#e86a8a"];
  for (let cx = x + 2; cx < x + w - 4; cx += 5 + Math.floor(r() * 4)) {
    const c = cols[Math.floor(r() * cols.length)];
    const h = 4 + Math.floor(r() * 4);
    p.rect(cx, y + 1, 3 + Math.floor(r() * 2), h, c);
    p.vline(cx, y + 1, h, darken(c, 0.2));
  }
}

function signboard(p: Px, cx: number, y: number, text: string, bg: Col, fg: Col) {
  const w = textWidth(text) + 6;
  const x = Math.round(cx - w / 2);
  p.rect(x, y, w, 9, darken(bg, 0.35));
  p.rect(x + 1, y + 1, w - 2, 7, bg);
  p.text(x + 3, y + 2, text, fg);
  return w;
}

// ---------------------------------------------------------------- chawl (the classic Mumbai tenement)
export interface ChawlOpts {
  w: number;
  floors: number;
  plaster: Col;
  roof: "tiles" | "terrace";
  year: number;
  seed: number;
  shop?: { at: number; w: number; sign: string; signCol: Col; open: boolean; kind?: "kirana" | "plain" };
}

export function chawl(o: ChawlOpts): Px {
  const roofH = o.roof === "tiles" ? 44 : 30;
  const floorH = 30;
  const h = roofH + o.floors * floorH + 4;
  const p = new Px(o.w, h);
  roof(p, 0, 0, o.w, roofH, o.roof, o.roof === "tiles" ? "#b5533c" : "#a9a395", o.seed);
  const r = rng(o.seed);
  if (o.roof === "terrace") {
    // water tanks, and dish antennas once cable TV arrived (late 1990s)
    for (let i = 0; i < Math.max(1, Math.floor(o.w / 70)); i++) {
      const tx = 10 + Math.floor(r() * (o.w - 30));
      p.rect(tx, 6, 12, 14, "#1f1f26");
      p.rect(tx, 6, 12, 3, "#3a3a44");
      p.ellipse(tx + 6, 7, 5, 1, "#4a4a55");
    }
    if (o.year >= 1999)
      for (let i = 0; i < Math.floor(o.w / 50); i++) {
        const dx = 8 + Math.floor(r() * (o.w - 20));
        p.circle(dx, 18, 3, "#d8d8dc");
        p.px(dx, 18, "#8a8a92");
      }
  }
  const wy = roofH;
  wall(p, 0, wy, o.w, o.floors * floorH + 4, o.plaster, o.seed);
  for (let f = 0; f < o.floors; f++) {
    const fy = wy + 4 + f * floorH;
    const ground = f === o.floors - 1;
    // the gallery: a long shared balcony with a railing, every chawl's common corridor
    if (!ground) {
      p.rect(0, fy + 18, o.w, 2, darken(o.plaster, 0.35));
      for (let rx = 2; rx < o.w; rx += 4) p.vline(rx, fy + 14, 4, "#6b5544");
      p.hline(0, fy + 14, o.w, "#6b5544");
      laundry(p, 4, fy + 1, o.w - 8, o.seed + f * 7);
    }
    for (let x = 8; x < o.w - 12; x += 22) {
      if (ground && o.shop && x + 10 > o.shop.at && x < o.shop.at + o.shop.w) continue;
      if (ground) {
        // doors on the ground floor
        p.rect(x, fy + 6, 10, 20, "#5a3a22");
        p.rect(x + 1, fy + 7, 8, 18, "#7a4e2d");
        p.vline(x + 5, fy + 7, 18, "#5a3a22");
        p.rect(x - 1, fy + 5, 12, 1, darken(o.plaster, 0.3));
      } else window(p, x, fy + 2, r() < 0.6, ["#2e8b57", "#2f6fb3", "#8a5a3a"][Math.floor(r() * 3)], o.year >= 2006 && r() < 0.35);
    }
  }
  if (o.shop) {
    const s = o.shop;
    const fy = wy + 4 + (o.floors - 1) * floorH;
    p.rect(s.at, fy + 2, s.w, 26, "#2b2226");
    if (s.open) {
      // rolled-up shutter and the shop inside
      p.rect(s.at, fy + 2, s.w, 3, "#9da3a8");
      for (let ly = fy + 7; ly < fy + 26; ly += 6) {
        p.hline(s.at + 2, ly + 4, s.w - 4, "#7a5a3a");
        for (let i = 0; i < (s.w - 6) / 4; i++) p.rect(s.at + 3 + i * 4, ly, 3, 4, ["#c23b3b", "#e0a526", "#2e8b57", "#2f6fb3", "#e9e6e0"][(i + ly) % 5]);
      }
      if (s.kind === "kirana") {
        p.rect(s.at - 10, fy + 18, 10, 9, "#d8c49a"); // sacks of onions and rice
        p.rect(s.at - 10, fy + 18, 10, 2, "#bfa877");
        p.rect(s.at + s.w, fy + 18, 10, 9, "#d8c49a");
        p.rect(s.at + s.w + 2, fy + 16, 6, 3, "#b5533c");
      }
    } else {
      for (let ly = fy + 3; ly < fy + 28; ly += 2) p.hline(s.at, ly, s.w, ly % 4 ? "#9da3a8" : "#7d838a");
    }
    signboard(p, s.at + s.w / 2, fy - 8, s.sign, s.signCol, "#1c1c22");
  }
  return p.outline(OUTLINE);
}

// ---------------------------------------------------------------- shops on the street
export function chaiTapri(year: number): Px {
  const p = new Px(76, 66);
  // blue tarp roof on bamboo poles
  roof(p, 2, 4, 72, 26, "tarp", "#2f6fb3", 3);
  p.rect(2, 30, 72, 3, "#24548a");
  for (const x of [5, 68]) p.rect(x, 33, 3, 28, "#8a6a3a");
  // counter, kettle on the stove, glasses
  p.rect(10, 42, 56, 18, "#8b5a33");
  p.rect(10, 42, 56, 3, "#a9744a");
  p.rect(10, 57, 56, 3, "#6b4423");
  p.rect(16, 34, 12, 8, "#c4c4c8"); // kettle
  p.rect(18, 32, 8, 2, "#a5a5ab");
  p.rect(28, 36, 4, 2, "#a5a5ab");
  p.rect(16, 41, 12, 1, "#e05a2b"); // flame
  for (let i = 0; i < 6; i++) p.rect(36 + i * 4, 37, 3, 5, "#e8d9b5");
  for (let i = 0; i < 6; i++) p.rect(36 + i * 4, 39, 3, 3, "#b07a3a"); // chai in the glasses
  p.rect(54, 34, 8, 8, year >= 2005 ? "#c23b3b" : "#2e8b57"); // biscuit jars
  p.rect(55, 35, 6, 2, "#e0a526");
  signboard(p, 38, 18, "CHAI", "#f2c230", "#1c1c22");
  return p.outline(OUTLINE);
}

export function vadaPavCart(): Px {
  const p = new Px(64, 60);
  // striped umbrella seen from above
  const cx = 32;
  const cy = 18;
  for (let y = -16; y <= 16; y++)
    for (let x = -28; x <= 28; x++) {
      if ((x * x) / (28 * 28) + (y * y) / (16 * 16) > 1) continue;
      const a = Math.atan2(y, x);
      const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 10);
      const base = seg % 2 ? "#c23b3b" : "#f2c230";
      p.px(cx + x, cy + y, y < -4 ? lighten(base, 0.12) : y > 8 ? darken(base, 0.15) : base);
    }
  p.rect(cx - 1, cy - 1, 3, 3, "#6b4423");
  p.rect(cx - 1, 34, 2, 6, "#8a8a92");
  // the cart
  p.rect(6, 38, 52, 14, "#4a6fa5");
  p.rect(6, 38, 52, 3, "#6b8fc5");
  p.ellipse(18, 38, 9, 3, "#222");
  p.circle(15, 37, 2, "#d9a441");
  p.circle(20, 37, 2, "#d9a441");
  p.rect(36, 34, 14, 5, "#e6c27a"); // stack of pav
  p.hline(36, 36, 14, "#c9a05c");
  p.circle(12, 54, 4, "#1d1a1f");
  p.circle(52, 54, 4, "#1d1a1f");
  return p.outline(OUTLINE);
}

export function station(year: number): Px {
  const w = 224;
  const p = new Px(w, 220);
  // red Mangalore-tile roof and a clock tower: a nod to the old Bombay stations
  roof(p, 0, 26, w, 70, "tiles", "#a8432f", 11);
  const stone = "#d7c7a3";
  wall(p, 0, 96, w, 124, stone, 12);
  // tower
  p.rect(92, 0, 40, 100, stone);
  roof(p, 92, 0, 40, 26, "tiles", "#8e3526", 13);
  p.circle(112, 44, 11, "#f3ead2");
  p.circle(112, 44, 11, "#f3ead2");
  p.rect(112, 36, 1, 8, "#1d1a1f");
  p.rect(112, 44, 6, 1, "#1d1a1f");
  p.rect(92, 60, 40, 3, darken(stone, 0.2));
  for (let i = 0; i < 3; i++) p.rect(100 + i * 9, 70, 6, 14, "#3a3f4b");
  // arcade of arches along the front
  for (let a = 0; a < 7; a++) {
    const ax = 10 + a * 30;
    const tall = a === 3;
    const top = tall ? 128 : 140;
    p.rect(ax, top, 22, 220 - top - 4, tall ? "#2b2226" : "#3a3f4b");
    p.ellipse(ax + 11, top, 11, 8, tall ? "#2b2226" : "#3a3f4b");
    if (!tall) for (let gy = top - 4; gy < 200; gy += 8) p.hline(ax + 1, gy, 20, "#5f8aa3");
    p.rect(ax - 3, 120, 3, 96, darken(stone, 0.18));
    if (tall) p.rect(ax + 2, 160, 18, 56, "#e8b04a"); // warm light from the booking hall
  }
  p.rect(0, 116, w, 4, darken(stone, 0.25));
  // station board: yellow with black lettering, as on every Indian Railways station
  const name = "THEN & NOW";
  p.rect(112 - (textWidth(name) + 10) / 2, 102, textWidth(name) + 10, 12, "#1c1c22");
  p.rect(112 - (textWidth(name) + 6) / 2, 104, textWidth(name) + 6, 8, "#f2c230");
  p.text(112 - textWidth(name) / 2, 105, name, "#1c1c22");
  if (year >= 2015) {
    p.rect(20, 102, 22, 10, "#2f6fb3"); // M-Indicator era signage
    p.text(23, 104, "WIFI", "#f3f1ea");
  }
  return p.outline(OUTLINE);
}

export function autoStand(year: number): Px {
  const p = new Px(160, 84);
  // green shelter
  roof(p, 0, 0, 92, 26, "tin", "#2e8b57", 21);
  p.rect(0, 26, 92, 4, "#1f6b42");
  for (const x of [3, 86]) p.rect(x, 30, 3, 40, "#6f7f8c");
  signboard(p, 46, 34, "AUTO STAND", "#f2c230", "#1c1c22");
  // petrol pump canopy and pumps
  roof(p, 104, 4, 54, 22, "terrace", "#e9e6e0", 22);
  p.rect(104, 4, 54, 4, "#c0392b");
  p.rect(104, 26, 54, 4, "#c0392b");
  for (const x of [108, 152]) p.rect(x, 30, 3, 34, "#c9c9cf");
  for (const x of [116, 136]) {
    p.rect(x, 46, 10, 20, "#e9e6e0");
    p.rect(x, 46, 10, 4, "#c0392b");
    p.rect(x + 2, 52, 6, 5, "#1c1c22");
    p.px(x + 3, 54, year >= 2010 ? "#6fcf8f" : "#e05a2b");
  }
  return p.outline(OUTLINE);
}

/** The plot that changes with the city: textile mill (before 2004), construction (2004-08), glass mall (2009+). */
export function bigPlot(year: number): Px {
  const w = 352;
  const p = new Px(w, 236);
  if (year < 2004) {
    // a mill shed with a saw-tooth roof and a chimney
    for (let i = 0; i < 8; i++) {
      const x = 8 + i * 42;
      roof(p, x, 40, 40, 40, "tin", "#7d8590", 30 + i);
      p.rect(x + 34, 40, 6, 40, "#c9d6dd"); // north lights
    }
    wall(p, 4, 80, w - 8, 150, "#9c7b62", 31);
    for (let x = 16; x < w - 20; x += 26) {
      p.rect(x, 110, 14, 18, "#3a3f4b");
      for (let gy = 112; gy < 128; gy += 4) p.hline(x, gy, 14, "#6b7280");
    }
    p.rect(150, 170, 52, 56, "#3a2a22");
    signboard(p, 176, 156, "MILLS", "#e9e6e0", "#1c1c22");
    p.rect(300, 0, 18, 100, "#8a5a44");
    p.rect(296, 0, 26, 6, "#6f4434");
  } else if (year < 2009) {
    // construction: hoarding, scaffolding, a crane
    p.rect(20, 60, w - 40, 120, "#7d7468");
    for (let x = 20; x < w - 20; x += 12) p.vline(x, 60, 120, "#a9a091");
    for (let y = 60; y < 180; y += 14) p.hline(20, y, w - 40, "#a9a091");
    p.rect(60, 0, 6, 120, "#e0a526");
    p.rect(20, 0, 160, 5, "#e0a526");
    for (let x = 20; x < 180; x += 8) p.vline(x, 0, 5, "#b8851a");
    p.rect(150, 5, 2, 30, "#3a3a44");
    p.rect(146, 35, 10, 6, "#3a3a44");
    for (let x = 0; x < w; x += 16) p.rect(x, 180, 16, 56, x % 32 ? "#2f6fb3" : "#e9e6e0");
    signboard(p, w / 2, 196, "COMING SOON", "#f2c230", "#1c1c22");
  } else {
    // glass mall
    roof(p, 0, 0, w, 60, "terrace", "#c9ccd1", 40);
    p.rect(20, 10, 40, 24, "#9aa3ad");
    p.rect(280, 14, 50, 20, "#9aa3ad");
    const gl = "#5f8aa3";
    p.rect(0, 60, w, 176, gl);
    for (let y = 64; y < 200; y += 14) for (let x = 4; x < w - 4; x += 18) p.rect(x, y, 16, 12, (x + y) % 3 ? "#9fc3d6" : "#7fb0c8");
    for (let x = 4; x < w; x += 54) p.rect(x, 64, 2, 136, "#d6ecf5");
    p.rect(0, 196, w, 6, "#e9e6e0");
    p.rect(140, 206, 72, 30, "#2c2a2f");
    p.rect(142, 208, 68, 28, "#ffe9a0");
    signboard(p, w / 2, 182, "THE MALL", "#c0392b", "#f3f1ea");
  }
  return p.outline(OUTLINE);
}

/** A residential tower; they multiply on the skyline after the mid-2000s. */
export function tower(w: number, floors: number, col: Col, seed: number): Px {
  const roofH = 24;
  const p = new Px(w, roofH + floors * 12 + 4);
  roof(p, 0, 0, w, roofH, "terrace", "#b9b3a8", seed);
  p.rect(w / 2 - 6, 4, 12, 12, "#8a8a92"); // lift room
  wall(p, 0, roofH, w, floors * 12 + 4, col, seed);
  const r = rng(seed);
  for (let f = 0; f < floors; f++)
    for (let x = 4; x < w - 6; x += 9) {
      const lit = r() < 0.35;
      p.rect(x, roofH + 3 + f * 12, 6, 7, lit ? "#ffe29a" : "#3a4a5c");
      if (r() < 0.15) p.rect(x, roofH + 10 + f * 12, 6, 2, "#e9e6e0");
    }
  return p.outline(OUTLINE);
}

// ---------------------------------------------------------------- trees and props
export function tree(kind: "gulmohar" | "banyan" | "neem", seed: number): Px {
  // layered canopy: a dark under-layer, mid foliage, sunlit tops, then leaf texture and (for gulmohar) blossoms
  const W = kind === "banyan" ? 72 : 58;
  const H = kind === "banyan" ? 72 : 66;
  const p = new Px(W, H);
  const r = rng(seed);
  const trunkCol = "#7a5236";
  const bx = Math.floor(W / 2);
  p.rect(bx - 4, 34, 9, H - 38, trunkCol);
  p.rect(bx - 4, 34, 3, H - 38, darken(trunkCol, 0.3));
  p.rect(bx + 3, 34, 2, H - 38, lighten(trunkCol, 0.2));
  p.rect(bx - 7, H - 7, 15, 3, darken(trunkCol, 0.15)); // roots
  if (kind === "banyan") for (const dx of [-18, -11, 10, 17]) p.vline(bx + dx, 30, H - 34, "#8a6446");
  const greens =
    kind === "gulmohar"
      ? ["#2f6a3c", "#3f8a4a", "#5fae58", "#9ad06a"]
      : kind === "banyan"
        ? ["#285e38", "#367a44", "#4f9a50", "#86c062"]
        : ["#3a7a3e", "#4f9a4a", "#74b85a", "#b3dc78"];
  const blobs: [number, number, number][] = [];
  const n = kind === "banyan" ? 14 : 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = i === 0 ? 0 : 6 + r() * (W / 2 - 18);
    blobs.push([bx + Math.round(Math.cos(a) * d), 22 + Math.round(Math.sin(a) * d * 0.6), 9 + Math.floor(r() * 6)]);
  }
  blobs.forEach(([x, y, rad]) => p.circle(x, y + 3, rad, greens[0]));
  blobs.forEach(([x, y, rad]) => p.circle(x, y, rad - 1, greens[1]));
  blobs.forEach(([x, y, rad]) => p.circle(x - 2, y - 2, Math.max(2, rad - 4), greens[2]));
  blobs.forEach(([x, y, rad]) => p.circle(x - 3, y - 4, Math.max(1, rad - 8), greens[3]));
  // leaf texture: little clusters, not single pixels
  const lr = rng(seed + 5);
  for (let i = 0; i < 70; i++) {
    const [x, y, rad] = blobs[Math.floor(lr() * blobs.length)];
    const a = lr() * Math.PI * 2;
    const d = lr() * (rad - 1);
    const lx = Math.round(x + Math.cos(a) * d);
    const ly = Math.round(y + Math.sin(a) * d);
    const c = ly < y ? greens[3] : greens[0];
    p.rect(lx, ly, 2, 1, c);
    p.px(lx + 1, ly - 1, c);
  }
  if (kind === "gulmohar") {
    // the flame tree: red-orange blossoms in May
    const fl = rng(seed + 9);
    for (let i = 0; i < 46; i++) {
      const [x, y, rad] = blobs[Math.floor(fl() * blobs.length)];
      const a = fl() * Math.PI * 2;
      const d = fl() * (rad - 2);
      const fx = Math.round(x + Math.cos(a) * d);
      const fy = Math.round(y + Math.sin(a) * d);
      p.rect(fx, fy, 2, 2, fl() < 0.5 ? "#e8542f" : "#f28b3a");
      p.px(fx, fy, "#ffc36a");
    }
  }
  return p.outline(OUTLINE);
}

export function bush(seed: number, flowers = false): Px {
  const p = new Px(26, 18);
  const r = rng(seed);
  const g = ["#2f6a3c", "#4f9a4a", "#74b85a", "#a8d16b"];
  for (let i = 0; i < 4; i++) p.circle(6 + i * 5, 10 - (i % 2) * 2, 5, g[1]);
  for (let i = 0; i < 4; i++) p.circle(5 + i * 5, 8 - (i % 2) * 2, 3, g[2]);
  for (let i = 0; i < 4; i++) p.px(4 + i * 5, 6 - (i % 2) * 2, g[3]);
  p.hline(2, 15, 22, g[0]);
  if (flowers) for (let i = 0; i < 7; i++) p.rect(3 + Math.floor(r() * 19), 4 + Math.floor(r() * 9), 2, 2, ["#f3f1ea", "#f28bb0", "#f2c230"][i % 3]);
  return p.outline(OUTLINE);
}

export function flowerBed(seed: number): Px {
  const p = new Px(34, 14);
  const r = rng(seed);
  p.rect(1, 4, 32, 9, "#8a5a3a");
  p.rect(2, 4, 30, 6, "#5a8a3a");
  const cols = ["#e8542f", "#f2c230", "#f28bb0", "#f3f1ea", "#b07ad6"];
  for (let i = 0; i < 16; i++) p.rect(3 + Math.floor(r() * 28), 2 + Math.floor(r() * 7), 2, 2, cols[Math.floor(r() * cols.length)]);
  return p.outline(OUTLINE);
}

export function rock(seed: number): Px {
  const p = new Px(20, 14);
  const r = rng(seed);
  const w = 7 + Math.floor(r() * 3);
  p.ellipse(10, 8, w, 5, "#8f959c");
  p.ellipse(9, 6, w - 2, 3, "#b4b9be");
  p.rect(6, 4, 3, 1, "#d4d8db");
  p.hline(4, 12, 12, "#6f757c");
  if (r() < 0.5) p.rect(12, 3, 3, 2, "#6fa04a"); // moss
  return p.outline(OUTLINE);
}

export function tallGrass(seed: number): Px {
  const p = new Px(16, 12);
  const r = rng(seed);
  for (let i = 0; i < 9; i++) {
    const x = 2 + Math.floor(r() * 12);
    const h = 4 + Math.floor(r() * 7);
    p.vline(x, 12 - h, h, i % 2 ? "#5f9e48" : "#86c062");
    p.px(x + (i % 2 ? 1 : -1), 12 - h, "#a8d16b");
  }
  return p;
}

export function pottedPlant(seed: number): Px {
  const p = new Px(14, 18);
  p.rect(3, 11, 8, 6, "#b5533c");
  p.rect(3, 11, 8, 1, "#d4704f");
  p.circle(7, 7, 5, "#4f9a4a");
  p.circle(6, 5, 3, "#74b85a");
  if (seed % 2) p.rect(8, 3, 2, 2, "#e8542f"); // tulsi or a hibiscus
  return p.outline(OUTLINE);
}

export function palm(seed: number): Px {
  const p = new Px(48, 70);
  const r = rng(seed);
  // a curved coconut palm, sea-front staple
  for (let y = 24; y < 68; y++) {
    const x = 22 + Math.round(Math.sin((y - 24) / 18) * 4);
    p.rect(x, y, 5, 1, y % 4 ? "#8a6a3a" : "#6b4a2f");
  }
  const cx = 24;
  const cy = 22;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + r() * 0.3;
    for (let t = 0; t < 22; t++) {
      const x = cx + Math.cos(a) * t;
      const y = cy + Math.sin(a) * t * 0.6 + (t * t) / 50;
      p.rect(Math.round(x), Math.round(y), 2, 2, t % 3 ? "#3f7a45" : "#5e9e4f");
    }
  }
  p.circle(cx, cy + 2, 3, "#6b4a2f");
  return p.outline(OUTLINE);
}

export function lamppost(): Px {
  const p = new Px(14, 52);
  p.rect(6, 6, 2, 44, "#3a3f4b");
  p.rect(4, 48, 6, 3, "#2b2b33");
  p.rect(6, 4, 7, 2, "#3a3f4b");
  p.rect(9, 6, 5, 3, "#ffe9a0");
  return p.outline(OUTLINE);
}

export function bench(): Px {
  const p = new Px(30, 14);
  p.rect(1, 2, 28, 3, "#7a4e2d");
  p.rect(1, 6, 28, 3, "#8b5a33");
  p.rect(3, 9, 2, 4, "#3a3f4b");
  p.rect(25, 9, 2, 4, "#3a3f4b");
  return p.outline(OUTLINE);
}

export function busStop(label = "BEST", roofCol = "#c0392b"): Px {
  const p = new Px(56, 44);
  roof(p, 0, 0, 56, 14, "terrace", roofCol, 50);
  p.rect(2, 14, 2, 28, "#6f7f8c");
  p.rect(52, 14, 2, 28, "#6f7f8c");
  p.rect(6, 30, 44, 4, "#8a8a92");
  p.rect(18, 16, 20, 9, "#efe3c8");
  p.text(28 - textWidth(label) / 2, 18, label, roofCol);
  return p.outline(OUTLINE);
}

export function phoneBooth(): Px {
  // the yellow STD/ISD/PCO booth, everywhere until mobile phones took over
  const p = new Px(22, 40);
  p.rect(1, 2, 20, 36, "#f2c230");
  p.rect(1, 2, 20, 4, "#c0392b");
  p.rect(4, 10, 14, 16, "#2b2b36");
  p.text(3, 28, "STD", "#c0392b");
  return p.outline(OUTLINE);
}

export function hoarding(text: string, bg: Col): Px {
  const p = new Px(80, 52);
  p.rect(10, 30, 3, 22, "#5a5a66");
  p.rect(66, 30, 3, 22, "#5a5a66");
  p.rect(0, 0, 80, 32, "#3a3f4b");
  p.rect(2, 2, 76, 28, bg);
  p.rect(2, 2, 76, 6, lighten(bg, 0.2));
  p.text(40 - textWidth(text) / 2, 14, text, "#f3f1ea");
  return p.outline(OUTLINE);
}

export function waterTank(): Px {
  const p = new Px(20, 24);
  p.rect(2, 4, 16, 18, "#1f1f26");
  p.ellipse(10, 4, 8, 3, "#3a3a44");
  p.hline(2, 10, 16, "#2b2b33");
  p.hline(2, 16, 16, "#2b2b33");
  return p.outline(OUTLINE);
}

export function shrine(): Px {
  const p = new Px(26, 36);
  roof(p, 3, 6, 20, 10, "tiles", "#e0a526", 60);
  p.rect(5, 16, 16, 16, "#f3ead2");
  p.rect(9, 20, 8, 12, "#e86a2a");
  p.rect(12, 0, 1, 8, "#5a3a22");
  p.rect(13, 0, 6, 4, "#f28b3a"); // saffron flag
  return p.outline(OUTLINE);
}

export function pigeon(frame: 0 | 1): Px {
  const p = new Px(8, 7);
  p.rect(1, 2, 5, 3, "#8a8f9e");
  p.rect(5, 1, 2, 2, "#6b7080");
  p.px(7, 2, "#e0a526");
  p.rect(2, 3, 3, 1, "#6fa0a0");
  if (frame) p.rect(0, 0, 4, 2, "#a0a5b2");
  p.rect(2, 5, 1, 1, "#c0392b");
  p.rect(4, 5, 1, 1, "#c0392b");
  return p.outline(OUTLINE);
}

export function receipt(): Px {
  const p = new Px(10, 12);
  p.rect(1, 1, 8, 10, "#f3ead2");
  for (let y = 3; y < 10; y += 2) p.hline(2, y, 6, "#a89a7a");
  p.rect(1, 1, 8, 1, "#e0a526");
  return p.outline(OUTLINE);
}

export function handcart(): Px {
  const p = new Px(40, 22);
  p.rect(2, 4, 34, 8, "#8b5a33");
  p.rect(2, 4, 34, 2, "#a9744a");
  for (let i = 0; i < 6; i++) p.circle(7 + i * 5, 3, 2, ["#e8542f", "#f2c230", "#2e8b57"][i % 3]); // fruit
  p.rect(36, 6, 4, 2, "#5a3a22");
  p.circle(10, 16, 4, "#3a2a22");
  p.circle(28, 16, 4, "#3a2a22");
  return p.outline(OUTLINE);
}

export function dog(frame: 0 | 1): Px {
  const p = new Px(18, 12);
  p.rect(3, 4, 11, 5, "#c9a06a");
  p.rect(12, 1, 5, 5, "#c9a06a");
  p.px(15, 2, "#1c1c22");
  p.rect(16, 4, 2, 1, "#3a2a22");
  p.rect(1, 3, 3, 2, "#b38a55");
  p.rect(4, 9, 2, frame ? 2 : 3, "#a87f4c");
  p.rect(11, 9, 2, frame ? 3 : 2, "#a87f4c");
  return p.outline(OUTLINE);
}

/** A small home with a blue tarp roof, the kind that fills every gap in the city. */
export function hut(seed: number): Px {
  const p = new Px(56, 50);
  const r = rng(seed);
  roof(p, 0, 0, 56, 18, r() < 0.5 ? "tarp" : "tin", r() < 0.5 ? "#2f6fb3" : "#7d8590", seed);
  wall(p, 2, 18, 52, 30, ["#c9a77c", "#a9c2c9", "#e3b4a0"][Math.floor(r() * 3)], seed);
  p.rect(22, 28, 12, 20, "#5a3a22");
  p.rect(23, 29, 10, 19, "#2f6fb3"); // curtain door
  window(p, 6, 26, true, "#2e8b57");
  if (r() < 0.6) laundry(p, 4, 18, 48, seed);
  return p.outline(OUTLINE);
}

export function cricketBall(): Px {
  const p = new Px(4, 4);
  p.circle(2, 2, 1, "#c0392b");
  return p;
}

export function stumps(): Px {
  const p = new Px(8, 16);
  for (const x of [1, 3, 5]) p.rect(x, 2, 1, 13, "#f3ead2");
  p.rect(1, 1, 5, 1, "#c9a06a");
  return p.outline(OUTLINE);
}
