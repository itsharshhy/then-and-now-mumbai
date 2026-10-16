import * as A from "../art/buildings";
import * as D from "../art/delhi";
import { FOOT_N, FOOT_S, T, WORLD_H, type Door, type Placement } from "./mumbai";

// Delhi uses the same street grid as Mumbai (river on the west instead of the sea, the Metro instead of the
// railway), with its own buildings, people and traffic.

const era = (year: number, cuts: number[]) => cuts.filter((c) => year >= c).length;

export function delhiPlacements(): Placement[] {
  const out: Placement[] = [];
  const add = (pl: Placement) => out.push(pl);
  const fixed = (id: string, x: number, y: number, draw: () => ReturnType<typeof A.bench>, solid?: Placement["solid"]) =>
    add({ id, x, y, key: () => `dl-${id}`, draw, solid });
  const footN = FOOT_N * T;
  const footS = (FOOT_S + 2) * T;

  // ---- north side: chai, havelis, samosa, the kirana and the Metro station
  add({ id: "chai", x: 320, y: footN + 4, key: (y) => `dl-chai${era(y, [2016])}`, draw: (y) => D.chaiCart(y), solid: [0, -30, 76, 30] });
  add({ id: "haveliA", x: 404, y: footN, key: () => "dl-haveliA", draw: () => D.haveli(236, 3, "#e7c9a0", 11) });
  add({ id: "samosa", x: 648, y: footN + 18, key: () => "dl-samosa", draw: () => D.samosaStall(), solid: [4, -20, 60, 20] });
  add({
    id: "haveliB",
    x: 720,
    y: footN,
    key: () => "dl-haveliB",
    draw: () => D.haveli(272, 3, "#c9d6c0", 23, { at: 104, w: 64, sign: "GUPTA KIRANA" }),
  });
  add({ id: "metro", x: 1056, y: footN, key: (y) => `dl-metro${era(y, [2000, 2002])}`, draw: (y) => D.metroStation(y) });

  // behind: the old city gate, the gurudwara, DDA flats, and offices that rise with the years
  add({ id: "gate", x: 300, y: 330, key: () => "dl-gate", draw: () => D.cityGate(), solid: [0, -60, 150, 60] });
  add({ id: "gurudwara", x: 470, y: 330, key: () => "dl-gurudwara", draw: () => D.gurudwara(), solid: [10, -60, 110, 60] });
  add({ id: "ddaA", x: 620, y: 326, key: (y) => `dl-ddaA${era(y, [1999, 2008])}`, draw: (y) => D.ddaFlats(220, 31, y) });
  add({ id: "ddaB", x: 860, y: 330, key: (y) => `dl-ddaB${era(y, [1999, 2008])}`, draw: (y) => D.ddaFlats(180, 41, y) });
  const offices: [number, number, number, number, string][] = [
    [640, 2006, 64, 8, "#d6dde4"],
    [740, 2012, 72, 10, "#c9ccd1"],
    [900, 2016, 66, 11, "#dfe7f2"],
    [990, 2003, 60, 7, "#e3d9c2"],
  ];
  offices.forEach(([x, built, w, floors, col], i) =>
    add({ id: `office${i}`, x, y: 170, key: (y) => (y >= built ? `dl-office${i}` : null), draw: () => A.tower(w, floors, col, 170 + i), solid: null }),
  );

  // ---- south side
  add({ id: "plot", x: 320, y: footS + 236, key: (y) => `dl-plot${era(y, [2005, 2010])}`, draw: (y) => D.delhiPlot(y) });
  add({ id: "autostand", x: 720, y: footS + 84, key: (y) => `dl-autostand${era(y, [2010])}`, draw: (y) => A.autoStand(y), solid: [0, -20, 160, 20] });
  fixed("busstop", 560, footS - 2, () => A.busStop("DTC", "#2e8b57"), [0, -10, 56, 10]);
  add({ id: "ddaS", x: 900, y: 900, key: (y) => `dl-ddaS${era(y, [1999, 2008])}`, draw: (y) => D.ddaFlats(190, 51, y) });
  add({ id: "haveliS", x: 1096, y: 840, key: () => "dl-haveliS", draw: () => D.haveli(170, 3, "#e3b4a0", 61) });
  add({
    id: "hoarding",
    x: 1180,
    y: footS + 60,
    key: (y) => `dl-hoarding${era(y, [2000, 2010, 2020])}`,
    draw: (y) => (y < 2000 ? A.hoarding("STD ISD PCO", "#c0392b") : y < 2010 ? A.hoarding("MOBILE 999", "#2f6fb3") : y < 2020 ? A.hoarding("4G IS HERE", "#7a4fb5") : A.hoarding("PAY BY UPI", "#2e8b57")),
    solid: [8, -6, 64, 6],
  });

  // ---- east: more DDA flats and a park instead of the railway
  add({ id: "ddaE1", x: 1424, y: footN, key: (y) => `dl-ddaE1${era(y, [1999, 2008])}`, draw: (y) => D.ddaFlats(230, 81, y) });
  add({ id: "ddaE2", x: 1424, y: 880, key: (y) => `dl-ddaE2${era(y, [1999, 2008])}`, draw: (y) => D.ddaFlats(230, 91, y) });

  // ---- the Yamuna bank: ghats and peepal trees
  for (let y = 120; y < WORLD_H; y += 170) fixed(`ghat${y}`, 140, y + 40, () => D.riverGhat(y), [0, -10, 48, 10]);
  for (const y of [260, 560, 880]) fixed(`bench${y}`, 154, y, () => A.bench(), [0, -6, 30, 6]);

  const treeAt = (id: string, x: number, y: number, kind: "gulmohar" | "banyan" | "neem", seed: number) =>
    fixed(id, x, y, () => A.tree(kind, seed), [kind === "banyan" ? 30 : 24, -6, 12, 6]);
  const trees: [number, number, "gulmohar" | "banyan" | "neem"][] = [
    [290, footN + 22, "neem"], [600, footN + 24, "banyan"], [1000, footN + 20, "neem"], [470, footS + 6, "neem"], [690, footS + 4, "gulmohar"],
    [1010, footS + 8, "neem"], [300, 1000, "banyan"], [650, 990, "neem"], [1440, 1120, "neem"], [1600, footN + 22, "banyan"], [1580, 700, "neem"],
    [1300, 400, "banyan"], [1340, 760, "neem"], [1320, 1000, "gulmohar"], [1380, 260, "neem"], [1250, 1120, "banyan"], [200, 400, "banyan"], [200, 980, "neem"],
  ];
  trees.forEach(([x, y, k], i) => treeAt(`t${i}`, x, y, k, 300 + i));
  for (const x of [380, 760, 900, 1220]) fixed(`lamp${x}`, x, footN + 30, () => A.lamppost(), [5, -3, 4, 3]);
  for (const x of [420, 800, 1100]) fixed(`lampS${x}`, x, footS - 4, () => A.lamppost(), [5, -3, 4, 3]);
  add({ id: "booth", x: 1020, y: footS + 20, key: (y) => (y < 2012 ? "dl-booth" : null), draw: () => A.phoneBooth(), solid: [0, -6, 22, 6] });
  fixed("tank", 1030, footN - 4, () => A.waterTank(), [0, -6, 20, 6]);
  const carts: [number, number][] = [
    [300, 470],
    [540, 670],
    [1340, 560],
  ];
  carts.forEach(([x, y], i) => fixed(`cart${i}`, x, y, () => A.handcart(), [0, -10, 40, 10]));
  return out;
}

export const DOORS_DELHI: Door[] = [
  { id: "chai", label: "Chai stall", x: 330, y: FOOT_N * T + 4, w: 56, h: 26, interior: "chai" },
  { id: "vadapav", label: "Samosa stall", x: 650, y: FOOT_N * T + 18, w: 60, h: 24, interior: null },
  { id: "kirana", label: "Kirana store", x: 820, y: FOOT_N * T, w: 70, h: 24, interior: "kirana" },
  { id: "station", label: "Metro station", x: 1186, y: FOOT_N * T, w: 40, h: 26, interior: "station" },
  { id: "autostand", label: "Auto stand", x: 724, y: (FOOT_S + 2) * T + 84, w: 90, h: 24, interior: null },
];
