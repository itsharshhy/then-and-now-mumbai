import { OUTLINE, Px, darken, lighten, rng, textWidth, type Col } from "./px";

// Furniture and rooms for the walk-in interiors, same 3/4 view as the city.

export function checkerFloor(p: Px, x: number, y: number, w: number, h: number, a: Col, b: Col, size = 8) {
  for (let yy = 0; yy < h; yy += size)
    for (let xx = 0; xx < w; xx += size) p.rect(x + xx, y + yy, size, size, ((xx + yy) / size) % 2 ? a : b);
  p.speckle(x, y, w, h, [darken(a, 0.1), lighten(b, 0.05)], 0.02, 3);
}

export function stoneFloor(p: Px, x: number, y: number, w: number, h: number, col: Col, seed = 4) {
  p.rect(x, y, w, h, col);
  for (let yy = 0; yy < h; yy += 16) {
    p.hline(x, y + yy, w, darken(col, 0.15));
    for (let xx = (yy / 16) % 2 ? 8 : 0; xx < w; xx += 16) p.vline(x + xx, y + yy, 16, darken(col, 0.15));
  }
  p.speckle(x, y, w, h, [darken(col, 0.06), lighten(col, 0.06)], 0.08, seed);
}

export function woodFloor(p: Px, x: number, y: number, w: number, h: number, col: Col) {
  p.rect(x, y, w, h, col);
  for (let yy = 0; yy < h; yy += 6) {
    p.hline(x, y + yy, w, darken(col, 0.2));
    for (let xx = (yy * 7) % 40; xx < w; xx += 40) p.vline(x + xx, y + yy, 6, darken(col, 0.2));
  }
}

/** The wall you face when you walk in: a band across the top of the room. */
export function backWall(p: Px, x: number, y: number, w: number, h: number, col: Col, seed = 5) {
  p.rect(x, y, w, h, col);
  p.rect(x, y, w, 3, darken(col, 0.3));
  p.rect(x, y + h - 6, w, 6, darken(col, 0.25)); // skirting
  p.hline(x, y + h - 6, w, lighten(col, 0.1));
  p.speckle(x, y + 3, w, h - 9, [darken(col, 0.06), lighten(col, 0.05)], 0.05, seed);
}

export function sideWalls(p: Px, w: number, h: number, top: number, col: Col) {
  p.rect(0, top, 6, h - top, darken(col, 0.35));
  p.rect(w - 6, top, 6, h - top, darken(col, 0.35));
  p.rect(0, h - 6, w, 6, darken(col, 0.35));
}

export function doorMat(p: Px, cx: number, y: number, w = 36) {
  p.rect(cx - w / 2, y, w, 10, "#8a3a2c");
  p.rect(cx - w / 2 + 2, y + 2, w - 4, 6, "#b5533c");
}

export function board(lines: string[], bg = "#2b3a2e", fg = "#f3f1ea", frame = "#7a4e2d"): Px {
  const w = Math.max(...lines.map(textWidth)) + 12;
  const p = new Px(w, lines.length * 8 + 10);
  p.rect(0, 0, w, p.h, frame);
  p.rect(2, 2, w - 4, p.h - 4, bg);
  lines.forEach((l, i) => p.text(6, 5 + i * 8, l, i === 0 ? "#f2c230" : fg));
  return p.outline(OUTLINE);
}

export function calendar(year: number): Px {
  const p = new Px(20, 24);
  p.rect(1, 1, 18, 22, "#f3ead2");
  p.rect(1, 1, 18, 9, "#e8542f");
  p.circle(10, 5, 3, "#f2c230");
  p.text(3, 13, String(year).slice(2), "#1c1c22");
  return p.outline(OUTLINE);
}

export function radio(year: number): Px {
  const p = new Px(22, 14);
  if (year < 2008) {
    p.rect(1, 2, 20, 11, "#7a4e2d");
    p.rect(3, 4, 9, 7, "#d8c49a");
    p.circle(16, 7, 2, "#3a3a44");
  } else {
    p.rect(3, 3, 16, 10, "#1c1c22"); // a small TV
    p.rect(4, 4, 14, 8, "#5f8aa3");
  }
  return p.outline(OUTLINE);
}

export function chaiCounter(): Px {
  const p = new Px(120, 54);
  // a long wooden counter with the stove, the big kettle and a tray of glasses
  p.rect(0, 22, 120, 32, "#8b5a33");
  p.rect(0, 18, 120, 6, "#a9744a");
  p.rect(0, 50, 120, 4, "#6b4423");
  for (let x = 6; x < 120; x += 24) p.rect(x, 28, 16, 18, darken("#8b5a33", 0.12));
  p.rect(10, 8, 26, 12, "#3a3a44"); // stove
  p.rect(12, 18, 22, 2, "#e05a2b");
  p.rect(13, 0, 20, 12, "#c4c4c8"); // kettle
  p.rect(14, 1, 18, 2, "#e0e0e6");
  p.rect(33, 4, 6, 3, "#a5a5ab");
  for (let i = 0; i < 8; i++) {
    p.rect(50 + i * 6, 10, 4, 7, "#e8d9b5");
    p.rect(50 + i * 6, 13, 4, 4, "#b07a3a");
  }
  p.rect(100, 4, 12, 14, "#c23b3b"); // biscuit jar
  p.rect(101, 5, 10, 3, "#e0a526");
  return p.outline(OUTLINE);
}

export function cafeTable(): Px {
  const p = new Px(40, 34);
  // round marble-top table with two bentwood chairs
  p.rect(3, 14, 6, 16, "#5a3a22");
  p.rect(31, 14, 6, 16, "#5a3a22");
  p.ellipse(20, 12, 15, 8, "#e9e6e0");
  p.ellipse(20, 11, 13, 6, "#f7f5f0");
  p.rect(19, 18, 3, 12, "#3a3a44");
  p.rect(14, 30, 13, 2, "#3a3a44");
  p.rect(14, 8, 4, 5, "#e8d9b5");
  p.rect(14, 10, 4, 3, "#b07a3a");
  return p.outline(OUTLINE);
}

export function shelves(w: number, seed: number, year: number): Px {
  const h = 70;
  const p = new Px(w, h);
  p.rect(0, 0, w, h, "#7a4e2d");
  p.rect(2, 2, w - 4, h - 4, "#5a3a22");
  const r = rng(seed);
  const cols = ["#c23b3b", "#e0a526", "#2e8b57", "#2f6fb3", "#e9e6e0", "#e86a2a", "#7a4fb5"];
  for (let sy = 4; sy < h - 6; sy += 16) {
    p.rect(2, sy + 12, w - 4, 3, "#a9744a");
    for (let x = 4; x < w - 8; ) {
      const bw = 4 + Math.floor(r() * 5);
      const bh = 6 + Math.floor(r() * 6);
      const c = cols[Math.floor(r() * cols.length)];
      p.rect(x, sy + 12 - bh, bw, bh, c);
      p.rect(x, sy + 12 - bh, bw, 1, lighten(c, 0.3));
      x += bw + 1;
    }
  }
  if (year >= 2016) p.rect(w - 30, 6, 24, 10, "#f3f1ea"); // a QR code sticker for UPI
  if (year >= 2016) for (let i = 0; i < 4; i++) p.rect(w - 28 + i * 5, 8, 3, 6, "#1c1c22");
  return p.outline(OUTLINE);
}

export function sacks(): Px {
  const p = new Px(64, 30);
  const sack = (x: number, top: Col, label: string) => {
    p.rect(x, 8, 18, 20, "#d8c49a");
    p.rect(x, 8, 18, 3, "#bfa877");
    p.ellipse(x + 9, 8, 8, 3, top);
    p.text(x + 3, 16, label, "#7a5a3a");
  };
  sack(2, "#b5533c", "PY"); // pyaz: onions
  sack(23, "#f3f1ea", "CH"); // chawal: rice
  sack(44, "#e0a526", "DL"); // dal
  return p.outline(OUTLINE);
}

export function kiranaCounter(year: number): Px {
  const p = new Px(110, 44);
  p.rect(0, 14, 110, 30, "#6b4423");
  p.rect(0, 10, 110, 6, "#8b5a33");
  p.rect(8, 2, 22, 10, year >= 2008 ? "#e9e6e0" : "#9a9a9e"); // weighing scale: dial then digital
  if (year >= 2008) p.rect(12, 4, 14, 5, "#6fcf8f");
  else p.circle(19, 6, 3, "#f3f1ea");
  p.rect(70, 0, 30, 12, "#e9e6e0"); // milk packets in a crate
  for (let i = 0; i < 5; i++) p.rect(72 + i * 6, 2, 4, 8, "#2f6fb3");
  return p.outline(OUTLINE);
}

export function ticketWindows(year: number): Px {
  const w = 260;
  const p = new Px(w, 70);
  p.rect(0, 0, w, 70, "#d7c7a3");
  p.rect(0, 0, w, 4, "#b8a682");
  for (let i = 0; i < 3; i++) {
    const x = 20 + i * 84;
    p.rect(x, 18, 56, 40, "#5a3a22");
    p.rect(x + 3, 21, 50, 28, "#2b3a4b");
    p.rect(x + 3, 21, 50, 4, "#ffe29a");
    if (i === 1) p.clear(x + 3, 25, 50, 24); // open window: the clerk behind it shows through
    for (let gx = x + 6; gx < x + 52; gx += 5) p.vline(gx, 25, i === 1 ? 6 : 24, "#7a8a9a");
    p.rect(x + 16, 46, 24, 8, "#1c1c22"); // the little gap you slide money through
    p.text(x + 10, 8, `WINDOW ${i + 1}`, "#7a4e2d");
  }
  if (year >= 2015) {
    p.rect(w - 30, 20, 22, 10, "#2f6fb3");
    p.text(w - 28, 22, "UTS", "#f3f1ea"); // the ticketing app's signage
  }
  return p.outline(OUTLINE);
}

export function indicator(lines: string[]): Px {
  const w = Math.max(...lines.map(textWidth)) + 14;
  const p = new Px(w, lines.length * 8 + 12);
  p.rect(0, 0, w, p.h, "#3a3a44");
  p.rect(3, 3, w - 6, p.h - 6, "#0e0e12");
  lines.forEach((l, i) => p.text(7, 6 + i * 8, l, i === 0 ? "#f39c34" : "#e8542f"));
  p.rect(w / 2 - 1, -0, 2, 2, "#3a3a44");
  return p.outline(OUTLINE);
}

export function atvm(): Px {
  const p = new Px(22, 40);
  p.rect(1, 1, 20, 38, "#c0392b");
  p.rect(3, 4, 16, 12, "#5f8aa3");
  p.rect(4, 5, 14, 3, "#d6ecf5");
  p.rect(6, 20, 10, 4, "#1c1c22");
  p.rect(6, 28, 10, 2, "#3a3a44");
  return p.outline(OUTLINE);
}

export function stationBench(): Px {
  const p = new Px(52, 16);
  p.rect(1, 3, 50, 4, "#3a6fa3");
  p.rect(1, 8, 50, 4, "#2f5f93");
  for (const x of [4, 24, 44]) p.rect(x, 12, 3, 4, "#3a3a44");
  return p.outline(OUTLINE);
}

export function pillar(h: number): Px {
  const p = new Px(14, h);
  p.rect(2, 0, 10, h, "#c9c2b2");
  p.rect(2, 0, 3, h, "#e3dccc");
  p.rect(9, 0, 3, h, "#a9a291");
  p.rect(0, h - 6, 14, 6, "#a9a291");
  p.rect(0, 0, 14, 5, "#a9a291");
  return p.outline(OUTLINE);
}

export function stationTrain(coach: Px, cab: Px, n = 4): Px {
  const p = new Px(cab.w * 2 + coach.w * n + (n + 1) * 2, cab.h + 2);
  p.draw(cab, 0, 1, true);
  for (let i = 0; i < n; i++) p.draw(coach, cab.w + 2 + i * (coach.w + 2), 1);
  p.draw(cab, cab.w + 2 + n * (coach.w + 2), 1);
  return p;
}
