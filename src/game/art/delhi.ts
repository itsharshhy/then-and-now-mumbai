import { LOOKS, drawCharacter } from "./characters";
import { OUTLINE, Px, darken, lighten, mix, rng, textWidth, type Col } from "./px";

// Delhi's buildings and vehicles, in the same 3/4 top-down style as Mumbai.

const GLASS = "#9fc3d6";
const GLASS_LT = "#d6ecf5";
const TYRE = "#1d1a1f";
const HUB = "#8a8a92";

function wheel(p: Px, cx: number, cy: number, r = 4) {
  p.circle(cx, cy, r, TYRE);
  p.circle(cx, cy, Math.max(1, r - 2), HUB);
}
function glass(p: Px, x: number, y: number, w: number, h: number) {
  p.rect(x, y, w, h, GLASS);
  p.rect(x, y, w, 1, GLASS_LT);
}

function sign(p: Px, cx: number, y: number, text: string, bg: Col, fg: Col) {
  const w = textWidth(text) + 6;
  const x = Math.round(cx - w / 2);
  p.rect(x, y, w, 9, darken(bg, 0.35));
  p.rect(x + 1, y + 1, w - 2, 7, bg);
  p.text(x + 3, y + 2, text, fg);
}

function plaster(p: Px, x: number, y: number, w: number, h: number, col: Col, seed: number) {
  p.rect(x, y, w, h, col);
  p.rect(x, y, w, 3, darken(col, 0.3));
  p.rect(x, y + h - 3, w, 3, darken(col, 0.2));
  p.speckle(x, y + 3, w, h - 6, [darken(col, 0.08), lighten(col, 0.06)], 0.06, seed);
}

function flatRoof(p: Px, x: number, y: number, w: number, h: number, col: Col, seed: number) {
  p.rect(x, y, w, h, col);
  p.rect(x, y, w, 2, lighten(col, 0.2));
  p.rect(x, y + h - 2, w, 2, darken(col, 0.15));
  p.speckle(x + 2, y + 2, w - 4, h - 4, [darken(col, 0.1), lighten(col, 0.08)], 0.07, seed);
}

/** Arched window with a little jharokha balcony, the Old Delhi look. */
function archWindow(p: Px, x: number, y: number, frame: Col, balcony: boolean) {
  p.rect(x, y + 3, 12, 12, darken(frame, 0.3));
  p.ellipse(x + 6, y + 3, 6, 3, darken(frame, 0.3));
  p.rect(x + 2, y + 4, 8, 10, "#2b2b36");
  p.ellipse(x + 6, y + 4, 4, 2, "#2b2b36");
  p.rect(x + 2, y + 5, 8, 2, "#ffe29a");
  if (balcony) {
    p.rect(x - 2, y + 14, 16, 3, frame);
    for (let i = 0; i < 5; i++) p.vline(x - 1 + i * 3, y + 11, 3, frame);
    p.rect(x - 1, y + 17, 2, 2, darken(frame, 0.2));
    p.rect(x + 11, y + 17, 2, 2, darken(frame, 0.2));
  }
}

// ---------------------------------------------------------------- buildings
export function haveli(w: number, floors: number, col: Col, seed: number, shop?: { at: number; w: number; sign: string }): Px {
  const roofH = 26;
  const fh = 30;
  const p = new Px(w, roofH + floors * fh + 4);
  flatRoof(p, 0, 0, w, roofH, "#d8c8a8", seed);
  // a parapet with little domed kiosks (chhatris) at the corners
  p.rect(0, 0, w, 3, darken(col, 0.15));
  for (const cx of [10, w - 10]) {
    p.rect(cx - 5, 4, 10, 10, "#e9dcc4");
    p.ellipse(cx, 4, 6, 4, "#c9b08a");
    p.px(cx, -0, "#e0a526");
  }
  const r = rng(seed);
  if (r() < 0.6) {
    // a kite tangled on the roof: Delhi's skies are full of them in August
    p.rect(w / 2, 8, 6, 6, "#e8542f");
    p.px(w / 2 + 2, 10, "#f2c230");
  }
  plaster(p, 0, roofH, w, floors * fh + 4, col, seed);
  for (let f = 0; f < floors; f++) {
    const fy = roofH + 4 + f * fh;
    const ground = f === floors - 1;
    for (let x = 8; x < w - 14; x += 24) {
      if (ground && shop && x + 12 > shop.at && x < shop.at + shop.w) continue;
      if (ground) {
        // carved wooden doorway
        p.rect(x, fy + 4, 12, 22, "#5a3a22");
        p.ellipse(x + 6, fy + 4, 6, 4, "#5a3a22");
        p.rect(x + 2, fy + 6, 8, 20, "#8b5a33");
        p.vline(x + 6, fy + 6, 20, "#5a3a22");
      } else archWindow(p, x, fy, ["#2e8b57", "#7a4e2d", "#2f6fb3"][Math.floor(r() * 3)], r() < 0.55);
    }
  }
  if (shop) {
    const fy = roofH + 4 + (floors - 1) * fh;
    p.rect(shop.at, fy + 2, shop.w, 26, "#2b2226");
    p.rect(shop.at, fy + 2, shop.w, 3, "#9da3a8");
    for (let ly = fy + 7; ly < fy + 26; ly += 6) {
      p.hline(shop.at + 2, ly + 4, shop.w - 4, "#7a5a3a");
      for (let i = 0; i < (shop.w - 6) / 4; i++) p.rect(shop.at + 3 + i * 4, ly, 3, 4, ["#c23b3b", "#e0a526", "#2e8b57", "#2f6fb3", "#e9e6e0"][(i + ly) % 5]);
    }
    p.rect(shop.at - 10, fy + 18, 10, 9, "#d8c49a");
    p.rect(shop.at + shop.w, fy + 18, 10, 9, "#d8c49a");
    sign(p, shop.at + shop.w / 2, fy - 8, shop.sign, "#f2c230", "#1c1c22");
  }
  return p.outline(OUTLINE);
}

/** DDA flats: the four-storey government housing blocks across the city. */
export function ddaFlats(w: number, seed: number, year: number): Px {
  const floors = 4;
  const roofH = 22;
  const p = new Px(w, roofH + floors * 26 + 4);
  flatRoof(p, 0, 0, w, roofH, "#c9b9a0", seed);
  const r = rng(seed);
  for (let i = 0; i < Math.floor(w / 60); i++) p.rect(10 + Math.floor(r() * (w - 30)), 5, 12, 12, "#1f1f26"); // water tanks
  if (year >= 1999) for (let i = 0; i < Math.floor(w / 50); i++) p.circle(8 + Math.floor(r() * (w - 16)), 16, 3, "#d8d8dc");
  plaster(p, 0, roofH, w, floors * 26 + 4, "#d9a77c", seed);
  for (let f = 0; f < floors; f++) {
    const fy = roofH + 4 + f * 26;
    for (let x = 6; x < w - 16; x += 26) {
      p.rect(x, fy + 2, 16, 14, "#3a4a5c");
      p.rect(x + 1, fy + 3, 14, 3, r() < 0.4 ? "#ffe29a" : "#5f7a8a");
      p.rect(x - 2, fy + 16, 20, 3, "#b98a5e"); // balcony slab
      if (r() < 0.5) p.rect(x + 2, fy + 10, 3, 6, ["#c23b3b", "#2f6fb3", "#f2c230"][Math.floor(r() * 3)]); // drying clothes
      if (year >= 2008 && r() < 0.3) p.rect(x + 10, fy + 12, 8, 5, "#e9e6e0"); // AC unit
    }
  }
  return p.outline(OUTLINE);
}

/** A Mughal-era city gate in red sandstone, like Ajmeri or Kashmiri Gate. */
export function cityGate(): Px {
  const w = 150;
  const p = new Px(w, 130);
  const red = "#b5603f";
  const redDk = darken(red, 0.25);
  const sand = "#e3cfa6";
  p.rect(0, 30, w, 100, red);
  p.speckle(0, 30, w, 100, [redDk, lighten(red, 0.1)], 0.05, 5);
  p.rect(0, 26, w, 6, sand);
  for (let x = 0; x < w; x += 10) p.rect(x, 20, 6, 6, red); // battlements
  // the great arch
  p.rect(w / 2 - 22, 66, 44, 64, "#3a2a22");
  p.ellipse(w / 2, 66, 22, 18, "#3a2a22");
  p.rect(w / 2 - 26, 50, 4, 80, sand);
  p.rect(w / 2 + 22, 50, 4, 80, sand);
  p.ellipse(w / 2, 52, 26, 4, sand);
  // two little domed pavilions
  for (const cx of [26, w - 26]) {
    p.rect(cx - 12, 6, 24, 20, sand);
    p.ellipse(cx, 6, 13, 9, "#efe3c8");
    p.rect(cx - 1, -0, 2, 4, "#e0a526");
    p.rect(cx - 8, 12, 4, 12, "#3a2a22");
    p.rect(cx + 4, 12, 4, 12, "#3a2a22");
  }
  for (const x of [14, w - 34]) {
    p.rect(x, 74, 20, 26, redDk);
    p.ellipse(x + 10, 74, 10, 6, redDk);
  }
  return p.outline(OUTLINE);
}

export function gurudwara(): Px {
  const w = 130;
  const p = new Px(w, 140);
  const white = "#f3f1ea";
  p.rect(10, 60, w - 20, 80, white);
  p.speckle(10, 60, w - 20, 80, ["#e3e0d8"], 0.05, 9);
  // the dome and its golden finial
  p.ellipse(w / 2, 48, 28, 24, white);
  p.ellipse(w / 2 - 6, 40, 14, 12, "#ffffff");
  p.rect(w / 2 - 2, 14, 4, 12, "#e0a526");
  p.circle(w / 2, 14, 3, "#f2c230");
  for (const cx of [22, w - 22]) {
    p.ellipse(cx, 58, 10, 8, white);
    p.rect(cx - 1, 46, 2, 6, "#e0a526");
  }
  for (let i = 0; i < 4; i++) {
    const x = 22 + i * 24;
    p.rect(x, 92, 14, 30, "#5f8aa3");
    p.ellipse(x + 7, 92, 7, 5, "#5f8aa3");
  }
  p.rect(w / 2 - 10, 108, 20, 32, "#e0a526");
  // the Nishan Sahib: a tall pole with a saffron flag
  p.rect(w - 6, 0, 2, 120, "#c9c9cf");
  p.rect(w - 4, 2, 4, 2, "#e0a526");
  return p.outline(OUTLINE);
}

/** Elevated Delhi Metro station; before it opens, a fenced construction site. */
export function metroStation(year: number): Px {
  const w = 224;
  const p = new Px(w, 220);
  if (year < 2000) {
    // just an empty plot behind a wall
    p.rect(0, 150, w, 70, "#c9b9a0");
    for (let x = 0; x < w; x += 14) p.rect(x, 150, 12, 70, x % 28 ? "#d8c8a8" : "#c9b9a0");
    return p.outline(OUTLINE);
  }
  if (year < 2002) {
    // building the Metro: piers, a crane and a hoarding
    p.rect(30, 40, 16, 180, "#b9b3a8");
    p.rect(170, 40, 16, 180, "#b9b3a8");
    p.rect(10, 30, 200, 12, "#a9a091");
    p.rect(100, 0, 5, 140, "#e0a526");
    p.rect(60, 0, 120, 4, "#e0a526");
    for (let x = 0; x < w; x += 16) p.rect(x, 170, 16, 50, x % 32 ? "#2f6fb3" : "#e9e6e0");
    sign(p, w / 2, 186, "METRO COMING 2002", "#f2c230", "#1c1c22");
    return p.outline(OUTLINE);
  }
  // concourse box on pillars, glass and steel
  flatRoof(p, 0, 20, w, 40, "#c9ccd1", 17);
  p.rect(0, 60, w, 70, "#e9eef2");
  for (let x = 6; x < w - 10; x += 16) glass(p, x, 66, 12, 22);
  p.rect(0, 94, w, 8, "#c0392b"); // red line band
  p.rect(0, 130, w, 6, "#8f897e");
  for (const x of [16, 100, 190]) {
    p.rect(x, 136, 18, 84, "#c9c4b8");
    p.rect(x, 136, 4, 84, "#e3ded2");
  }
  // stairs down to the street and the entrance
  p.rect(60, 150, 56, 70, "#b9b3a8");
  for (let y = 152; y < 218; y += 6) p.hline(60, y, 56, "#9a948a");
  p.rect(130, 170, 40, 50, "#2c2a2f");
  p.rect(132, 172, 36, 48, "#ffe9a0");
  // the M logo and station board
  p.circle(30, 110, 9, "#c0392b");
  p.text(27, 108, "M", "#f3f1ea");
  sign(p, w / 2, 104, "METRO", "#c0392b", "#f3f1ea");
  return p.outline(OUTLINE);
}

export function chaiCart(year: number): Px {
  const p = new Px(76, 62);
  // steel counter under a striped tarp, kulhads and a kettle on a stove
  p.rect(2, 4, 72, 22, "#2e8b57");
  for (let x = 2; x < 74; x += 8) p.rect(x, 4, 4, 22, "#3fa36a");
  p.rect(2, 26, 72, 3, "#1f6b42");
  for (const x of [5, 68]) p.rect(x, 29, 3, 30, "#8a8a92");
  p.rect(10, 40, 56, 18, "#b9bcc4");
  p.rect(10, 40, 56, 3, "#d6d9de");
  p.rect(14, 30, 14, 10, "#c4c4c8");
  p.rect(14, 39, 14, 1, "#e05a2b");
  for (let i = 0; i < 6; i++) {
    p.rect(34 + i * 5, 34, 4, 6, "#b5603f"); // kulhads: clay cups
    p.rect(34 + i * 5, 34, 4, 1, "#7a3a20");
  }
  if (year >= 2016) p.rect(58, 32, 8, 8, "#f3f1ea"); // QR code
  sign(p, 38, 14, "CHAI", "#f2c230", "#1c1c22");
  return p.outline(OUTLINE);
}

export function samosaStall(): Px {
  const p = new Px(70, 60);
  p.rect(2, 4, 66, 20, "#c0392b");
  for (let x = 2; x < 68; x += 8) p.rect(x, 4, 4, 20, "#e8542f");
  p.rect(2, 24, 66, 3, "#8e2a1f");
  for (const x of [5, 62]) p.rect(x, 27, 3, 30, "#8a6a3a");
  p.rect(8, 38, 54, 20, "#8b5a33");
  p.rect(8, 38, 54, 3, "#a9744a");
  p.ellipse(22, 37, 11, 4, "#222"); // the karahi of hot oil
  for (let i = 0; i < 4; i++) p.rect(16 + i * 4, 34, 3, 3, "#d9a441");
  // a glass case of samosas
  p.rect(38, 28, 20, 10, GLASS);
  for (let i = 0; i < 4; i++) {
    p.rect(40 + i * 4, 32, 3, 3, "#d9a441");
    p.px(41 + i * 4, 31, "#e9c06a");
  }
  sign(p, 35, 12, "SAMOSA", "#f2c230", "#1c1c22");
  return p.outline(OUTLINE);
}

// ---------------------------------------------------------------- vehicles
/** DTC and the buses of Delhi: blue Blueline (to 2010), green CNG low-floor and red AC low-floor (2010+). */
export function delhiBus(kind: "blueline" | "green" | "red", left = false): Px {
  const H = 42;
  const p = new Px(96, H);
  const body = kind === "blueline" ? "#2f5fa8" : kind === "green" ? "#2e8b57" : "#c0392b";
  p.rect(4, 2, 86, 6, "#b9b3a8");
  for (let x = 14; x < 84; x += 18) p.rect(x, 4, 6, 3, "#8f897e");
  p.rect(3, 8, 89, 26, body);
  p.rect(3, 8, 89, 1, lighten(body, 0.3));
  p.rect(3, 31, 89, 3, darken(body, 0.25));
  for (let x = 8; x < 80; x += 11) glass(p, x, 11, 9, 9);
  p.hline(3, 22, 89, kind === "blueline" ? "#f2c230" : "#e9e6e0");
  for (const dx of [16, 70]) p.rect(dx, 11, 9, 20, "#3a2a2a");
  p.rect(86, 10, 5, 18, GLASS);
  p.rect(91, 28, 2, 2, "#ffe9a0");
  wheel(p, 20, H - 6, 5);
  wheel(p, 76, H - 6, 5);
  p.outline(OUTLINE);
  const out = left ? new Px(p.w, p.h).draw(p, 0, 0, true) : p;
  const label = kind === "blueline" ? "BLUELINE" : kind === "green" ? "DTC CNG" : "DTC AC";
  out.text(left ? p.w - 30 - textWidth(label) : 30, 25, label, "#f3f1ea");
  return out;
}

/** Delhi autos: black-and-yellow petrol autos, then green-and-yellow CNG from the early 2000s. */
export function delhiAuto(cng: boolean): Px {
  const p = new Px(36, 30);
  const body = cng ? "#3fa36a" : "#26262e";
  const hood = cng ? "#f2c230" : "#f2c230";
  p.rect(5, 2, 20, 4, lighten(hood, 0.2));
  p.rect(4, 5, 22, 11, hood);
  p.rect(7, 7, 12, 8, "#4a3a30");
  p.rect(7, 12, 12, 3, "#7a4e2d");
  p.rect(20, 6, 6, 7, GLASS);
  p.rect(3, 15, 26, 7, body);
  p.rect(24, 13, 8, 9, body);
  p.rect(3, 15, 26, 1, lighten(body, 0.3));
  p.rect(32, 16, 2, 2, "#ffe9a0");
  wheel(p, 8, 24, 3);
  wheel(p, 29, 24, 3);
  return p.outline(OUTLINE);
}

/** Cycle rickshaw with its rider: everywhere in Old Delhi. */
export function cycleRickshaw(): Px {
  const p = new Px(44, 40);
  const rider = drawCharacter(LOOKS.bittu, "side", 1);
  const top = new Px(rider.w, 20);
  top.g.drawImage(rider.c, 0, 0, rider.w, 20, 0, 0, rider.w, 20);
  p.draw(top, 22, 2);
  // passenger seat with a folding hood
  p.rect(2, 8, 18, 14, "#2f6fb3");
  p.rect(2, 8, 18, 3, lighten("#2f6fb3", 0.25));
  p.rect(4, 18, 14, 6, "#c23b3b");
  p.rect(18, 24, 18, 2, "#3a3a44");
  p.rect(30, 20, 2, 6, "#3a3a44");
  for (const [cx, cy, r] of [
    [8, 31, 6],
    [34, 31, 5],
  ] as const) {
    p.circle(cx, cy, r, TYRE);
    p.circle(cx, cy, r - 2, mix("#c9c9cf", "#3a3a44", 0.3));
    p.circle(cx, cy, r - 3, "#00000000");
  }
  return p.outline(OUTLINE);
}

/** Delhi Metro coach: stainless steel with a red stripe (Red Line, from 2002). */
export function delhiMetroCoach(): Px {
  const p = new Px(110, 32);
  p.rect(3, 2, 104, 5, "#b9bcc4");
  p.rect(2, 7, 106, 19, "#d6d9de");
  for (let x = 2; x < 108; x += 4) p.vline(x, 7, 19, "#c9ccd1"); // fluted steel
  p.rect(2, 7, 106, 1, "#ffffff");
  p.rect(2, 20, 106, 3, "#c0392b");
  for (let x = 8; x < 100; x += 14) glass(p, x, 10, 10, 7);
  for (const d of [30, 72]) p.rect(d, 9, 8, 13, "#5f8aa3");
  p.rect(2, 26, 106, 2, "#3a3a44");
  return p.outline(OUTLINE);
}

export function riverGhat(seed: number): Px {
  // stone steps down to the river
  const p = new Px(48, 40);
  const r = rng(seed);
  for (let i = 0; i < 5; i++) p.rect(0, i * 8, 48, 8, mix("#d8c8a8", "#a8987a", i / 5));
  for (let i = 0; i < 5; i++) p.hline(0, i * 8, 48, "#efe3c8");
  if (r() < 0.6) p.rect(30, 4, 8, 6, "#e86a2a"); // marigolds left after a puja
  return p.outline(OUTLINE);
}

/** The big plot on Delhi's main road: a single-screen cinema (to 2004), construction, then a mall (2010+). */
export function delhiPlot(year: number): Px {
  const w = 352;
  const p = new Px(w, 236);
  if (year < 2005) {
    flatRoof(p, 0, 30, w, 50, "#c9b9a0", 41);
    plaster(p, 0, 80, w, 156, "#e3cfa6", 41);
    // a marquee with a hand-painted film poster
    p.rect(60, 96, 232, 70, "#3a2a22");
    p.rect(64, 100, 224, 62, "#c0392b");
    p.rect(70, 104, 60, 54, "#f2c230");
    p.circle(100, 124, 14, "#e8a070");
    p.rect(140, 110, 140, 10, "#f3f1ea");
    p.rect(140, 128, 100, 8, "#f3f1ea");
    p.rect(140, 144, 120, 8, "#f3f1ea");
    sign(p, w / 2, 84, "PLAZA CINEMA", "#2f4f8f", "#f3f1ea");
    for (const x of [100, 220]) p.rect(x, 186, 32, 50, "#3a2a22");
  } else if (year < 2010) {
    p.rect(20, 60, w - 40, 120, "#7d7468");
    for (let x = 20; x < w - 20; x += 12) p.vline(x, 60, 120, "#a9a091");
    for (let y = 60; y < 180; y += 14) p.hline(20, y, w - 40, "#a9a091");
    p.rect(60, 0, 6, 120, "#e0a526");
    p.rect(20, 0, 160, 5, "#e0a526");
    for (let x = 0; x < w; x += 16) p.rect(x, 180, 16, 56, x % 32 ? "#2f6fb3" : "#e9e6e0");
    sign(p, w / 2, 196, "COMING SOON", "#f2c230", "#1c1c22");
  } else {
    flatRoof(p, 0, 0, w, 60, "#c9ccd1", 40);
    p.rect(0, 60, w, 176, "#5f8aa3");
    for (let y = 64; y < 200; y += 14) for (let x = 4; x < w - 4; x += 18) p.rect(x, y, 16, 12, (x + y) % 3 ? "#9fc3d6" : "#7fb0c8");
    p.rect(0, 196, w, 6, "#e9e6e0");
    p.rect(140, 206, 72, 30, "#ffe9a0");
    sign(p, w / 2, 182, "CITY MALL", "#c0392b", "#f3f1ea");
  }
  return p.outline(OUTLINE);
}
