import * as A from "../art/buildings";
import { Px, darken, lighten, rng } from "../art/px";
import type { BuildingId } from "@/lib/data";

// The Mumbai neighbourhood, laid out on a 16 px tile grid and seen from above at an angle.
// West to east: Arabian Sea, promenade, coastal road, the city blocks, the railway line, more city.

export const T = 16;
export const MAP_W = 104;
export const MAP_H = 72;
export const WORLD_W = MAP_W * T;
export const WORLD_H = MAP_H * T;

// Rows and columns (in tiles) that everything else hangs off.
export const SEA_X = 8; // water is x < SEA_X
export const NS_ROAD = { x0: 12, x1: 15 };
export const ROAD = { y0: 34, y1: 38 }; // main east-west road rows (inclusive); divider on row 36
export const FOOT_N = 32; // north footpath rows 32-33
export const FOOT_S = 39; // south footpath rows 39-40
export const TRACKS = [80, 86]; // each track is 2 tiles wide
export const PLATFORM = { x0: 82, x1: 85 };
export const CITY_X = 18;

export const LANE_WEST_Y = 572; // bottom edge of westbound vehicles (px)
export const LANE_EAST_Y = 620;
export const TRACK_X = TRACKS.map((t) => t * T + T); // centre x of each track (px)

type Tile = "W" | "R" | "P" | "A" | "F" | "G" | "D" | "B" | "L" | "C" | "S";

export function tileGrid(): Tile[][] {
  const g: Tile[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_W; x++) {
      let t: Tile = "C";
      if (x < SEA_X) t = "W";
      else if (x === SEA_X) t = "R";
      else if (x < NS_ROAD.x0) t = "P";
      else if (x <= NS_ROAD.x1) t = "A";
      else if (x < CITY_X) t = "F";
      else if (y >= ROAD.y0 && y <= ROAD.y1) t = "A";
      else if (y === FOOT_N || y === FOOT_N + 1 || y === FOOT_S || y === FOOT_S + 1) t = "F";
      if (x >= CITY_X && (y < ROAD.y0 || y > ROAD.y1)) {
        if (TRACKS.some((tx) => x === tx || x === tx + 1)) t = "B";
        else if (x >= PLATFORM.x0 && x <= PLATFORM.x1) t = y < ROAD.y0 ? "L" : "G";
      }
      if (x >= 18 && x <= 44 && y >= 59) t = y === 59 || x === 18 || x === 44 ? "G" : "D"; // the maidan
      if (x >= 89 && x <= 91 && y < FOOT_N) t = "G";
      row.push(t);
    }
    g[y] = row;
  }
  return g;
}

// ---------------------------------------------------------------- ground painting
function paintTile(p: Px, t: Tile, tx: number, ty: number, seed: number) {
  const x = tx * T;
  const y = ty * T;
  const s = seed + tx * 131 + ty * 977;
  switch (t) {
    case "A": {
      p.rect(x, y, T, T, "#4a4a52");
      p.speckle(x, y, T, T, ["#55555e", "#3f3f47", "#5e5e66"], 0.18, s);
      break;
    }
    case "F": {
      // paver blocks with dark grout
      p.rect(x, y, T, T, "#7d776c");
      for (let by = 0; by < T; by += 8)
        for (let bx = 0; bx < T; bx += 8) {
          const c = (bx + by + tx + ty) % 16 ? "#b3ad9f" : "#a39d90";
          p.rect(x + bx, y + by, 7, 7, c);
          p.hline(x + bx, y + by, 7, lighten(c, 0.12));
        }
      p.speckle(x, y, T, T, ["#8f897d"], 0.05, s);
      break;
    }
    case "G": {
      p.rect(x, y, T, T, "#5e9e4f");
      p.speckle(x, y, T, T, ["#4f8a43", "#74b45e", "#3f7a45"], 0.25, s);
      if (s % 7 === 0) p.px(x + (s % 13), y + (s % 11), "#f2c230");
      break;
    }
    case "D": {
      p.rect(x, y, T, T, "#c49a62");
      p.speckle(x, y, T, T, ["#b38a55", "#d4ab72", "#a87f4c"], 0.2, s);
      break;
    }
    case "P": {
      // sea-front promenade: big stone slabs
      p.rect(x, y, T, T, "#d8cdb4");
      p.hline(x, y, T, "#c2b79e");
      p.vline(x, y, T, "#c2b79e");
      p.speckle(x, y, T, T, ["#cbbfa6", "#e3d9c2"], 0.08, s);
      break;
    }
    case "R": {
      // tetrapods along the sea wall
      p.rect(x, y, T, T, "#8a8f96");
      p.circle(x + 5, y + 5, 4, "#a5aab1");
      p.circle(x + 11, y + 11, 4, "#9a9fa6");
      p.circle(x + 4, y + 13, 3, "#7d828a");
      p.px(x + 4, y + 3, "#c9cdd2");
      break;
    }
    case "B": {
      // ballast, sleepers and rails
      p.rect(x, y, T, T, "#8a8178");
      p.speckle(x, y, T, T, ["#9d948a", "#766d64", "#6b625a"], 0.35, s);
      for (let sy = 0; sy < T; sy += 5) p.rect(x, y + sy, T, 2, "#5a3a22");
      break;
    }
    case "L": {
      p.rect(x, y, T, T, "#c9c2b2");
      p.speckle(x, y, T, T, ["#b9b2a2", "#d6cfbf"], 0.1, s);
      break;
    }
    case "C": {
      // lane paving: worn concrete with patches of earth
      p.rect(x, y, T, T, "#b8ad97");
      p.speckle(x, y, T, T, ["#a99e88", "#c6bba5", "#9d927c"], 0.2, s);
      if (s % 5 === 0) p.ellipse(x + 8, y + 8, 5, 3, "#a89470");
      break;
    }
    default:
      p.rect(x, y, T, T, "#2f6f8f");
  }
}

export function drawGround(year: number): Px {
  const g = tileGrid();
  const p = new Px(WORLD_W, WORLD_H);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) paintTile(p, g[y][x], x, y, 7);

  // rails on the two tracks
  for (const tx of TRACKS) {
    const cx = tx * T + T;
    for (const rx of [cx - 9, cx + 7]) {
      p.rect(rx, 0, 2, WORLD_H, "#b9b9c2");
      p.vline(rx, 0, WORLD_H, "#e0e0e6");
    }
  }
  // platform edges: the yellow line you must stand behind
  p.rect(PLATFORM.x0 * T, 0, 2, ROAD.y0 * T - 32, "#f2c230");
  p.rect((PLATFORM.x1 + 1) * T - 2, 0, 2, ROAD.y0 * T - 32, "#f2c230");

  // main road markings
  const ry0 = ROAD.y0 * T;
  const ry1 = (ROAD.y1 + 1) * T;
  const roadX0 = CITY_X * T - 2 * T;
  p.rect(roadX0, 36 * T + 2, WORLD_W - roadX0, T - 4, "#c9c2b2"); // concrete divider
  for (let x = roadX0; x < WORLD_W; x += 16) p.rect(x, 36 * T + 2, 8, 2, x % 32 ? "#f2c230" : "#1c1c22");
  for (let x = roadX0; x < WORLD_W; x += 28) {
    p.rect(x, 35 * T, 14, 2, "#e8e1cf");
    p.rect(x, 37 * T + T, 14, 2, "#e8e1cf");
  }
  // kerbs painted black and yellow, as Mumbai does
  for (const ky of [ry0 - 3, ry1]) for (let x = roadX0; x < WORLD_W; x += 8) p.rect(x, ky, 8, 3, x % 16 ? "#1c1c22" : "#f2c230");
  // zebra crossings
  for (const zx of [27, 62]) for (let y = ry0; y < ry1; y += 6) p.rect(zx * T, y, 2 * T, 3, "#efe9dc");
  // coastal road centre line
  for (let y = 0; y < WORLD_H; y += 24) p.rect(14 * T - 1, y, 2, 12, "#e8e1cf");
  for (let y = 0; y < WORLD_H; y += 8) p.rect(NS_ROAD.x1 * T + T, y, 3, 8, y % 16 ? "#1c1c22" : "#f2c230");

  // the maidan: a dusty cricket pitch
  p.rect(28 * T, 63 * T, 6 * T, 2 * T, "#d9bd8a");
  for (const sx of [28 * T + 2, 34 * T - 4]) for (let i = 0; i < 3; i++) p.rect(sx, 63 * T + 8 + i * 4, 2, 2, "#f3ead2");

  // under the road bridge and around the station forecourt
  p.rect(66 * T, FOOT_N * T - 4, 14 * T, 4, darken("#b3ad9f", 0.25));
  if (year >= 2014) {
    // shadow of the metro viaduct falls across the road
    p.g.fillStyle = "rgba(20,10,30,0.18)";
    p.g.fillRect(CITY_X * T, 36 * T + 10, (TRACKS[0] - CITY_X) * T, 14);
  }
  return p;
}

/** A seamless 64x64 sea tile; the scene scrolls it for waves. */
export function seaTile(frame: number): Px {
  const p = new Px(64, 64);
  p.rect(0, 0, 64, 64, "#2f6f8f");
  const r = rng(91 + frame);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * 64);
    const y = Math.floor(r() * 64);
    p.hline(x, y, 5 + Math.floor(r() * 6), i % 3 ? "#3f86a6" : "#7fc0d6");
  }
  p.speckle(0, 0, 64, 64, ["#286180", "#3a7d9c"], 0.08, 5 + frame);
  return p;
}

/** White foam where the waves meet the tetrapods. */
export function foam(frame: number): Px {
  const p = new Px(10, 64);
  const r = rng(300 + frame);
  for (let y = 0; y < 64; y += 2) {
    const w = 2 + Math.floor(r() * 6);
    p.hline(10 - w, y, w, r() < 0.5 ? "#e8f4f8" : "#bfe0ea");
  }
  return p;
}

// ---------------------------------------------------------------- what stands on the ground
export interface Placement {
  id: string;
  x: number; // left edge (px)
  y: number; // bottom edge (px); also the depth for y-sorting
  /** Which drawing to use for a year; placements whose key doesn't change keep their texture. */
  key: (year: number) => string | null;
  draw: (year: number) => Px;
  /** Solid area as [x, y, w, h] relative to the bottom-left; default is the whole footprint band. */
  solid?: [number, number, number, number] | null;
  overhead?: boolean;
}

const era = (year: number, cuts: number[]) => cuts.filter((c) => year >= c).length;

export function placements(): Placement[] {
  const out: Placement[] = [];
  const add = (pl: Placement) => out.push(pl);
  const fixed = (id: string, x: number, y: number, draw: () => Px, solid?: Placement["solid"]) =>
    add({ id, x, y, key: () => id, draw, solid });

  // ---- north side of the main road
  const footN = FOOT_N * T; // buildings sit on the line where the footpath starts
  add({ id: "tapri", x: 320, y: footN + 4, key: (y) => `tapri${era(y, [2005])}`, draw: (y) => A.chaiTapri(y), solid: [0, -30, 76, 30] });
  add({
    id: "chawlA",
    x: 404,
    y: footN,
    key: (y) => `chawlA${era(y, [1999, 2006])}`,
    draw: (y) => A.chawl({ w: 236, floors: 4, plaster: "#d9c08f", roof: "tiles", year: y, seed: 11 }),
  });
  add({ id: "vadapav", x: 648, y: footN + 18, key: () => "vadapav", draw: () => A.vadaPavCart(), solid: [4, -20, 56, 20] });
  add({
    id: "chawlB",
    x: 720,
    y: footN,
    key: (y) => `chawlB${era(y, [1999, 2006])}`,
    draw: (y) =>
      A.chawl({ w: 272, floors: 3, plaster: "#a9c2c9", roof: "terrace", year: y, seed: 23, shop: { at: 104, w: 64, sign: "KIRANA STORES", signCol: "#f2c230", open: true, kind: "kirana" } }),
  });
  add({ id: "station", x: 1056, y: footN, key: (y) => `station${era(y, [2015])}`, draw: (y) => A.station(y) });

  // second row of chawls behind, then the skyline of towers that rises with the years
  add({ id: "chawlC", x: 296, y: 330, key: (y) => `chawlC${era(y, [1999, 2006])}`, draw: (y) => A.chawl({ w: 250, floors: 4, plaster: "#e3b4a0", roof: "terrace", year: y, seed: 31 }) });
  add({ id: "chawlD", x: 566, y: 326, key: (y) => `chawlD${era(y, [1999, 2006])}`, draw: (y) => A.chawl({ w: 240, floors: 3, plaster: "#d9c08f", roof: "tiles", year: y, seed: 41 }) });
  add({ id: "chawlE", x: 826, y: 330, key: (y) => `chawlE${era(y, [1999, 2006])}`, draw: (y) => A.chawl({ w: 210, floors: 4, plaster: "#c9d6a0", roof: "terrace", year: y, seed: 51 }) });
  const towers: [number, number, number, number, string][] = [
    [300, 2003, 64, 9, "#c9ccd1"],
    [380, 2009, 72, 10, "#e3d9c2"],
    [470, 1990, 56, 6, "#c9a77c"],
    [540, 2012, 70, 11, "#d6dde4"],
    [630, 2006, 60, 9, "#e9e6e0"],
    [710, 1990, 70, 6, "#d1b087"],
    [800, 2016, 80, 12, "#cfd8e0"],
    [900, 2001, 60, 8, "#e3b4a0"],
    [980, 2019, 66, 12, "#dfe7f2"],
  ];
  towers.forEach(([x, built, w, floors, col], i) =>
    add({ id: `tower${i}`, x, y: 180, key: (y) => (y >= built ? `tower${i}` : null), draw: () => A.tower(w, floors, col, 70 + i), solid: null }),
  );

  // ---- south side
  const footS = (FOOT_S + 2) * T; // first row below the south footpath
  add({ id: "plot", x: 320, y: footS + 236, key: (y) => `plot${era(y, [2004, 2009])}`, draw: (y) => A.bigPlot(y) });
  add({ id: "autostand", x: 720, y: footS + 84, key: (y) => `autostand${era(y, [2010])}`, draw: (y) => A.autoStand(y), solid: [0, -20, 160, 20] });
  fixed("busstop", 560, footS - 2, () => A.busStop(), [0, -10, 56, 10]);
  add({ id: "chawlS1", x: 900, y: 900, key: (y) => `chawlS1${era(y, [1999, 2006])}`, draw: (y) => A.chawl({ w: 180, floors: 4, plaster: "#e9d9a8", roof: "terrace", year: y, seed: 61 }) });
  add({ id: "chawlS2", x: 1096, y: 840, key: (y) => `chawlS2${era(y, [1999, 2006])}`, draw: (y) => A.chawl({ w: 170, floors: 3, plaster: "#d9c08f", roof: "tiles", year: y, seed: 71 }) });
  add({
    id: "hoarding",
    x: 1180,
    y: footS + 60,
    key: (y) => `hoarding${era(y, [2000, 2010, 2020])}`,
    draw: (y) => (y < 2000 ? A.hoarding("STD 1 RUPEE", "#c0392b") : y < 2010 ? A.hoarding("MOBILE 999", "#2f6fb3") : y < 2020 ? A.hoarding("4G IS HERE", "#7a4fb5") : A.hoarding("PAY BY UPI", "#2e8b57")),
    solid: [8, -6, 64, 6],
  });

  // ---- east of the tracks
  add({ id: "chawlE1", x: 1424, y: footN, key: (y) => `chawlE1${era(y, [1999, 2006])}`, draw: (y) => A.chawl({ w: 230, floors: 4, plaster: "#e3b4a0", roof: "tiles", year: y, seed: 81 }) });
  add({ id: "chawlE2", x: 1424, y: 880, key: (y) => `chawlE2${era(y, [1999, 2006])}`, draw: (y) => A.chawl({ w: 230, floors: 3, plaster: "#a9c2c9", roof: "terrace", year: y, seed: 91 }) });
  add({ id: "towerE", x: 1460, y: 300, key: (y) => (y >= 2011 ? "towerE" : null), draw: () => A.tower(90, 14, "#dfe7f2", 99), solid: null });

  // ---- sea front
  for (let y = 60; y < WORLD_H; y += 110) fixed(`palm${y}`, 140, y + 60, () => A.palm(y), [20, -4, 8, 4]);
  for (const y of [220, 520, 820]) fixed(`bench${y}`, 154, y, () => A.bench(), [0, -6, 30, 6]);

  // ---- street furniture
  const treeAt = (id: string, x: number, y: number, kind: "gulmohar" | "banyan" | "neem", seed: number) =>
    fixed(id, x, y, () => A.tree(kind, seed), [kind === "banyan" ? 26 : 20, -6, 12, 6]);
  treeAt("t1", 290, footN + 22, "gulmohar", 1);
  treeAt("t2", 600, footN + 24, "neem", 2);
  treeAt("t3", 1000, footN + 20, "banyan", 3);
  treeAt("t4", 470, footS + 6, "gulmohar", 4);
  treeAt("t5", 690, footS + 4, "neem", 5);
  treeAt("t6", 1010, footS + 8, "gulmohar", 6);
  treeAt("t7", 300, 1000, "banyan", 7);
  treeAt("t8", 650, 990, "gulmohar", 8);
  treeAt("t9", 1440, 1120, "neem", 9);
  treeAt("t10", 1600, footN + 22, "gulmohar", 10);
  treeAt("t11", 1580, 700, "banyan", 11);
  for (const x of [380, 760, 900, 1220]) fixed(`lamp${x}`, x, footN + 30, () => A.lamppost(), [5, -3, 4, 3]);
  for (const x of [420, 800, 1100]) fixed(`lampS${x}`, x, footS - 4, () => A.lamppost(), [5, -3, 4, 3]);
  add({ id: "booth", x: 1020, y: footS + 20, key: (y) => (y < 2012 ? "booth" : null), draw: () => A.phoneBooth(), solid: [0, -6, 22, 6] });
  fixed("shrine", 1010, footN - 6, () => A.shrine(), [0, -8, 26, 8]);
  fixed("tank", 1030, footN - 4, () => A.waterTank(), [0, -6, 20, 6]);

  // ---- filling the gaps: homes, carts, more trees
  const huts: [number, number][] = [
    [1070, 272], [1150, 282], [1220, 272], [1530, 400], [1600, 440], [1500, 1000], [1580, 1060], [1180, 1000], [1250, 1080], [880, 1060], [960, 1110], [1010, 990],
  ];
  huts.forEach(([x, y], i) => fixed(`hut${i}`, x, y, () => A.hut(200 + i), [0, -24, 56, 24]));
  const carts: [number, number][] = [[300, 470], [540, 670], [1340, 660]];
  carts.forEach(([x, y], i) => fixed(`cart${i}`, x, y, () => A.handcart(), [0, -10, 40, 10]));
  const more: [number, number, "gulmohar" | "banyan" | "neem"][] = [
    [760, 980, "neem"], [820, 1110, "gulmohar"], [1060, 1140, "banyan"], [1300, 1130, "neem"], [1640, 900, "gulmohar"], [1540, 260, "neem"], [1020, 240, "gulmohar"], [230, 1130, "neem"], [740, 760, "neem"], [1440, 760, "gulmohar"],
  ];
  more.forEach(([x, y, k], i) => treeAt(`tm${i}`, x, y, k, 40 + i));
  return out;
}

/** Places you can walk up to and press E. */
export interface Door {
  id: BuildingId;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  interior: "chai" | "kirana" | "station" | null; // null: the shop panel opens right there
}

export const DOORS: Door[] = [
  { id: "chai", label: "Chai tapri", x: 330, y: FOOT_N * T + 4, w: 56, h: 26, interior: "chai" },
  { id: "vadapav", label: "Vada pav stall", x: 650, y: FOOT_N * T + 18, w: 60, h: 24, interior: null },
  { id: "kirana", label: "Kirana store", x: 820, y: FOOT_N * T, w: 70, h: 24, interior: "kirana" },
  { id: "station", label: "Railway station", x: 1150, y: FOOT_N * T, w: 34, h: 26, interior: "station" },
  { id: "autostand", label: "Auto stand", x: 724, y: (FOOT_S + 2) * T + 84, w: 90, h: 24, interior: null },
];

export const SPAWN = { x: 360, y: FOOT_N * T + 22 };

/** Tiles you can't walk on (sea, rocks, rails, platforms seen from outside). */
export function blockedTiles(): boolean[][] {
  const g = tileGrid();
  return g.map((row, y) =>
    row.map((t, x) => {
      if (t === "W" || t === "R") return true;
      if ((t === "B" || t === "L") && !(y >= ROAD.y0 - 2 && y <= ROAD.y1 + 2)) return true;
      if (x >= PLATFORM.x0 && x <= PLATFORM.x1 && y > ROAD.y1 + 2) return true; // grass strip between tracks
      if (y < 2) return true;
      return false;
    }),
  );
}
