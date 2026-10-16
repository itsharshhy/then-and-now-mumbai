import { LOOKS, drawCharacter } from "./characters";
import { OUTLINE, Px, darken, lighten, type Col } from "./px";

// Vehicles in the same 3/4 "drone" view as the city: you see the roof from above and the side facing you.
// All face right; the scene mirrors them for traffic going left.

const TYRE = "#1d1a1f";
const HUB = "#8a8a92";
const GLASS = "#9fc3d6";
const GLASS_LT = "#d6ecf5";
const HEAD = "#ffe9a0";
const TAIL = "#d03a2a";

function wheel(p: Px, cx: number, cy: number, r = 4) {
  p.circle(cx, cy, r, TYRE);
  p.circle(cx, cy, Math.max(1, r - 2), HUB);
  p.px(cx, cy, "#c9c9cf");
}

function glass(p: Px, x: number, y: number, w: number, h: number) {
  p.rect(x, y, w, h, GLASS);
  p.rect(x, y, w, 1, GLASS_LT);
  p.rect(x + 1, y + 1, 1, Math.max(0, h - 2), GLASS_LT);
}

/** Premier Padmini, the black-and-yellow Mumbai taxi (retired in 2023). */
export function taxiOld(): Px {
  const p = new Px(48, 28);
  const Y = "#f2c230";
  const K = "#26262e";
  // roof (seen from above) + cabin
  p.rect(13, 3, 20, 4, lighten(Y, 0.25));
  p.rect(12, 6, 22, 1, Y);
  p.rect(18, 1, 9, 2, Y); // roof sign
  p.rect(19, 1, 7, 1, lighten(Y, 0.4));
  p.rect(11, 7, 24, 6, Y);
  glass(p, 13, 8, 8, 4);
  glass(p, 23, 8, 7, 4);
  p.rect(31, 8, 3, 4, GLASS);
  // body
  p.rect(3, 13, 42, 8, K);
  p.rect(2, 14, 44, 6, K);
  p.rect(4, 13, 40, 1, lighten(K, 0.25));
  p.hline(3, 16, 42, "#6a6a75"); // chrome strip
  p.vline(22, 13, 7, darken(K, 0.4)); // door line
  p.rect(44, 14, 2, 2, HEAD);
  p.rect(2, 14, 1, 2, TAIL);
  p.rect(1, 18, 46, 2, "#b9b9c2"); // bumpers
  wheel(p, 11, 22);
  wheel(p, 36, 22);
  return p.outline(OUTLINE);
}

/** The newer black-and-yellow cab (hatchbacks, from about 2010). */
export function taxiNew(): Px {
  const p = new Px(46, 28);
  const Y = "#f2c230";
  const K = "#26262e";
  p.rect(10, 3, 22, 4, lighten(Y, 0.25));
  p.rect(9, 6, 25, 7, Y);
  glass(p, 11, 7, 9, 5);
  glass(p, 22, 7, 8, 5);
  p.rect(31, 7, 4, 5, GLASS);
  p.rect(3, 13, 40, 8, K);
  p.rect(4, 13, 38, 1, lighten(K, 0.25));
  p.rect(38, 11, 6, 3, K); // short bonnet
  p.vline(21, 13, 7, darken(K, 0.4));
  p.rect(42, 14, 2, 2, HEAD);
  p.rect(3, 14, 1, 2, TAIL);
  p.rect(2, 18, 43, 2, "#3a3a44");
  wheel(p, 11, 22);
  wheel(p, 35, 22);
  return p.outline(OUTLINE);
}

export const CAR_COLOURS = ["#e9e6e0", "#b9bcc4", "#c23b3b", "#2f6fb3", "#2e8b57", "#3a3a44"];

export function car(colour: Col, sedan = true): Px {
  const p = new Px(50, 28);
  const lt = lighten(colour, 0.3);
  const dk = darken(colour, 0.25);
  const len = sedan ? 46 : 40;
  p.rect(12, 3, sedan ? 22 : 20, 4, lt);
  p.rect(10, 6, sedan ? 26 : 24, 7, colour);
  glass(p, 12, 7, 9, 5);
  glass(p, 23, 7, sedan ? 9 : 7, 5);
  p.rect(2, 13, len, 8, colour);
  p.rect(3, 13, len - 2, 1, lt);
  p.rect(2, 19, len, 2, dk);
  p.vline(22, 13, 6, dk);
  p.rect(len, 14, 2, 2, HEAD);
  p.rect(2, 14, 1, 2, TAIL);
  wheel(p, 11, 22);
  wheel(p, len - 9, 22);
  return p.outline(OUTLINE);
}

/** Auto-rickshaw: black hood, yellow body; green CNG trim once the fleet switched to CNG (around 2005). */
export function auto(cng: boolean): Px {
  const p = new Px(36, 30);
  const Y = "#f2c230";
  const K = "#26262e";
  const trim = cng ? "#2e8b57" : darken(Y, 0.3);
  // hood (roof from above) and canopy
  p.rect(5, 2, 20, 4, "#3a3a44");
  p.rect(6, 2, 18, 1, "#55555f");
  p.rect(4, 5, 22, 11, K);
  p.rect(7, 7, 12, 8, "#4a3a30"); // open side: seat inside
  p.rect(7, 12, 12, 3, "#7a4e2d");
  p.rect(20, 6, 6, 7, GLASS); // windshield
  p.rect(21, 6, 1, 6, GLASS_LT);
  // body
  p.rect(3, 15, 26, 7, Y);
  p.rect(24, 13, 8, 9, Y); // nose
  p.rect(30, 15, 3, 5, Y);
  p.rect(3, 15, 26, 1, lighten(Y, 0.3));
  p.hline(3, 19, 28, trim);
  p.rect(32, 16, 2, 2, HEAD);
  p.rect(26, 10, 3, 3, "#c0392b"); // meter flag
  wheel(p, 8, 24, 3);
  wheel(p, 29, 24, 3);
  return p.outline(OUTLINE);
}

/** BEST bus: the red city bus. Double-deckers ran on Mumbai roads until 2023. */
export function bestBus(double: boolean, left = false): Px {
  const H = double ? 56 : 42;
  const p = new Px(96, H);
  const R = "#c0392b";
  const Rd = darken(R, 0.25);
  const cream = "#efe3c8";
  const top = 2;
  p.rect(4, top, 86, 6, "#b9b3a8"); // roof from above
  p.rect(5, top, 84, 1, "#d8d2c6");
  for (let x = 14; x < 84; x += 18) p.rect(x, top + 2, 6, 3, "#8f897e"); // vents
  const bodyTop = top + 6;
  const bodyBot = H - 8;
  p.rect(3, bodyTop, 89, bodyBot - bodyTop, R);
  p.rect(3, bodyTop, 89, 1, lighten(R, 0.25));
  p.rect(3, bodyBot - 3, 89, 3, Rd);
  const rows = double ? [bodyTop + 3, bodyTop + 18] : [bodyTop + 3];
  for (const wy of rows) {
    for (let x = 8; x < 80; x += 11) glass(p, x, wy, 9, 8);
    p.hline(3, wy + 10, 89, cream);
    p.hline(3, wy + 11, 89, cream);
  }
  // doors (darker, people inside)
  const doorY = rows.at(-1)!;
  for (const dx of [16, 70]) {
    p.rect(dx, doorY, 9, bodyBot - doorY, "#3a2a2a");
    p.rect(dx + 2, doorY + 2, 4, 4, "#a86b3c"); // a passenger's head
  }
  // front: windscreen and route board
  p.rect(86, bodyTop + 2, 5, double ? 34 : 18, GLASS);
  p.rect(84, bodyTop + 1, 7, 3, "#1d1a1f");
  p.text(85, bodyTop + 1, "", "#f39c34");
  p.rect(85, bodyTop + 2, 5, 1, "#f39c34");
  p.rect(91, bodyBot - 6, 2, 2, HEAD);
  p.rect(2, bodyBot - 6, 1, 2, TAIL);
  wheel(p, 20, H - 6, 5);
  wheel(p, 76, H - 6, 5);
  p.outline(OUTLINE);
  // the BEST lettering goes on last, after any mirroring, so it always reads the right way round
  const out = left ? new Px(p.w, p.h).draw(p, 0, 0, true) : p;
  out.text(left ? p.w - 36 - 15 : 36, bodyBot - 9, "BEST", "#f3f1ea");
  return out;
}

export function scooter(look = LOOKS.biker): Px {
  const p = new Px(32, 34);
  const rider = drawCharacter(look, "side", 0);
  // rider sits: paste the top two-thirds
  const top = new Px(rider.w, 20);
  top.g.drawImage(rider.c, 0, 0, rider.w, 20, 0, 0, rider.w, 20);
  p.draw(top, 6, 2);
  const B = "#3a6fa3";
  p.rect(5, 20, 20, 6, B);
  p.rect(20, 14, 5, 8, B);
  p.rect(22, 12, 4, 2, "#3a3a44"); // handlebar
  p.rect(6, 20, 18, 1, lighten(B, 0.3));
  p.rect(25, 17, 2, 2, HEAD);
  wheel(p, 7, 28, 3);
  wheel(p, 24, 28, 3);
  return p.outline(OUTLINE);
}

export type TrainLivery = "old" | "new";

/** One Mumbai local coach, side view (for station platforms). */
export function localCoach(livery: TrainLivery, motor: boolean, crowd = 0.6, seed = 1): Px {
  const p = new Px(132, 46);
  const body = livery === "old" ? "#7b2a2a" : "#e9e6e0";
  const band = livery === "old" ? "#e9d9a8" : "#6b2d5c";
  const stripe = livery === "old" ? "#e9d9a8" : "#f2c230";
  p.rect(4, 2, 124, 6, "#9a9a9e"); // roof
  p.rect(5, 2, 122, 1, "#c4c4c8");
  for (let x = 14; x < 120; x += 22) p.rect(x, 4, 8, 2, "#7a7a80");
  if (motor) {
    p.rect(56, 0, 2, 2, "#3a3a44");
    p.rect(50, -1, 14, 1, "#3a3a44"); // pantograph
  }
  p.rect(2, 8, 128, 30, body);
  p.rect(2, 8, 128, 1, lighten(body, 0.25));
  p.rect(2, 13, 128, 10, band);
  p.hline(2, 30, 128, stripe);
  p.hline(2, 31, 128, stripe);
  // windows with grills
  for (let x = 8; x < 124; x += 12) {
    if ([28, 68, 108].some((d) => Math.abs(d - x) < 10)) continue;
    p.rect(x, 14, 8, 7, "#3a3f4b");
    for (let gx = x + 1; gx < x + 8; gx += 2) p.vline(gx, 14, 7, "#7a7f8b");
  }
  // open doors with commuters hanging out, the Mumbai way
  let s = seed;
  for (const d of [24, 64, 104]) {
    p.rect(d, 12, 12, 24, "#2a2226");
    for (let i = 0; i < 3; i++) {
      s = (s * 9301 + 49297) % 233280;
      if (s / 233280 < crowd) {
        const hx = d + 1 + i * 4;
        p.rect(hx, 14 + (i % 2) * 3, 3, 3, ["#8d5524", "#a86b3c", "#6b4423"][i]);
        p.rect(hx, 17 + (i % 2) * 3, 3, 6, ["#dfe7f2", "#2f6fb3", "#c23b3b"][(i + seed) % 3]);
      }
    }
  }
  p.rect(2, 38, 128, 3, "#2b2b33");
  for (const b of [16, 40, 92, 116]) wheel(p, b, 41, 4);
  return p.outline(OUTLINE);
}

/** Front cab of a local (the coach at either end), side view. */
export function localCab(livery: TrainLivery): Px {
  const p = localCoach(livery, true, 0.4, 7);
  const g = p.g;
  // cut a sloped nose on the right
  g.clearRect(124, 0, 8, 12);
  const body = livery === "old" ? "#7b2a2a" : "#e9e6e0";
  p.rect(120, 10, 8, 26, body);
  glass(p, 121, 12, 6, 8);
  p.rect(126, 30, 2, 3, HEAD);
  p.text(108, 26, "", "#000");
  return p.outline(OUTLINE);
}

/** A local seen from straight above, for the city map where the line runs north-south. */
export function localRoof(livery: TrainLivery, coaches = 6): Px {
  const L = 60;
  const p = new Px(22, coaches * (L + 2) + 4);
  const edge = livery === "old" ? "#7b2a2a" : "#e9e6e0";
  for (let i = 0; i < coaches; i++) {
    const y = 2 + i * (L + 2);
    p.rect(2, y, 18, L, edge);
    p.rect(4, y + 1, 14, L - 2, "#9a9a9e");
    p.rect(5, y + 1, 12, 1, "#c4c4c8");
    for (let v = y + 6; v < y + L - 6; v += 12) p.rect(7, v, 8, 4, "#7a7a80");
    if (i % 3 === 0) p.rect(10, y + L / 2 - 4, 2, 8, "#3a3a44");
  }
  return p.outline(OUTLINE);
}

/** Mumbai Metro Line 1 coach (opened 2014), side view for the viaduct. */
export function metroCoach(): Px {
  const p = new Px(110, 32);
  p.rect(3, 2, 104, 5, "#b9bcc4");
  p.rect(2, 7, 106, 19, "#e9eef2");
  p.rect(2, 7, 106, 1, "#ffffff");
  p.rect(2, 19, 106, 3, "#2f6fb3");
  for (let x = 8; x < 100; x += 14) glass(p, x, 10, 10, 7);
  for (const d of [30, 72]) p.rect(d, 9, 8, 13, "#5f8aa3");
  p.rect(2, 26, 106, 2, "#3a3a44");
  return p.outline(OUTLINE);
}
