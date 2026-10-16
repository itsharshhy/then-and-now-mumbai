import * as I from "../art/interiors";
import { Px } from "../art/px";
import { datasets, itemById, pointAt, rupees, type BuildingId, type City } from "@/lib/data";
import type { Talker } from "./life";

// The rooms you can walk into. Each is a background (floor + back wall), furniture that y-sorts with you,
// walls you can't walk through, a way out, and the person behind the counter.

export type InteriorKind = "chai" | "kirana" | "station";

export interface Prop {
  x: number;
  y: number; // bottom edge
  key: (year: number) => string;
  draw: (year: number) => Px;
  solid?: [number, number, number, number] | null; // relative to bottom-left; default bottom 12 px
}

export interface InteriorSpec {
  kind: InteriorKind;
  title: string;
  w: number;
  h: number;
  bg: (year: number) => Px;
  bgKey: (year: number) => string;
  props: Prop[];
  walls: [number, number, number, number][];
  exit: { x: number; y: number; w: number; h: number; label: string };
  spawn: { x: number; y: number };
  keeper: { look: string; x: number; y: number; shop: BuildingId; name: string };
  talkers: Talker[];
}

const pr = (id: string, y: number) => rupees(pointAt(itemById(id), y).price);
const era = (y: number, cuts: number[]) => cuts.filter((c) => y >= c).length;

// ---------------------------------------------------------------- chai shop
const CHAI_W = 336;
const CHAI_H = 224;
export const CHAI: InteriorSpec = {
  kind: "chai",
  title: "Chai tapri",
  w: CHAI_W,
  h: CHAI_H,
  bgKey: (y) => `chai-bg${era(y, [2008])}`,
  bg: (y) => {
    const p = new Px(CHAI_W, CHAI_H);
    I.checkerFloor(p, 0, 0, CHAI_W, CHAI_H, "#2b2b33", "#e9e6e0", 12); // Irani-cafe floor
    I.backWall(p, 0, 0, CHAI_W, 64, "#e3d2a6");
    p.rect(0, 40, CHAI_W, 2, "#7a4e2d"); // dado rail
    p.draw(I.calendar(y), 24, 10);
    p.draw(I.radio(y), 60, 22);
    // an old photograph of the city on the wall
    p.rect(250, 10, 40, 26, "#5a3a22");
    p.rect(253, 13, 34, 20, "#c9b28a");
    p.rect(256, 22, 8, 11, "#8a7a5a");
    p.rect(268, 18, 6, 15, "#8a7a5a");
    p.rect(278, 25, 6, 8, "#8a7a5a");
    I.sideWalls(p, CHAI_W, CHAI_H, 64, "#e3d2a6");
    I.doorMat(p, CHAI_W / 2, CHAI_H - 16);
    return p;
  },
  props: [
    { x: 150, y: 92, key: () => "chai-counter", draw: () => I.chaiCounter(), solid: [0, -34, 120, 34] },
    { x: 104, y: 36, key: (y) => `chai-menu${y}`, draw: (y) => I.board(["MENU", `CHAI ${pr("chai", y)}`, `VADA PAV ${pr("vadapav", y)}`]), solid: null },
    { x: 30, y: 140, key: () => "table", draw: () => I.cafeTable(), solid: [4, -14, 32, 14] },
    { x: 100, y: 176, key: () => "table", draw: () => I.cafeTable(), solid: [4, -14, 32, 14] },
    { x: 250, y: 150, key: () => "table", draw: () => I.cafeTable(), solid: [4, -14, 32, 14] },
    { x: 250, y: 200, key: () => "table", draw: () => I.cafeTable(), solid: [4, -14, 32, 14] },
  ],
  walls: [
    [0, 0, CHAI_W, 70],
    [0, 0, 8, CHAI_H],
    [CHAI_W - 8, 0, 8, CHAI_H],
  ],
  exit: { x: CHAI_W / 2 - 20, y: CHAI_H - 14, w: 40, h: 14, label: "Back to the street" },
  spawn: { x: CHAI_W / 2, y: CHAI_H - 24 },
  keeper: { look: "raju", x: 210, y: 66, shop: "chai", name: "Raju bhau" },
  talkers: [
    {
      id: "chai-regular",
      look: "dada",
      x: 50,
      y: 150,
      facing: "right",
      name: "A regular",
      lines: (y) => [
        `I've had my cutting chai here every morning since 1995. It was ${pr("chai", 1995)} then. ${y > 1995 ? `Now it's ${pr("chai", y)}.` : ""}`,
        "Nobody wrote chai prices down, you know. If you find an old menu card, tell the bazaar.",
      ],
    },
    {
      id: "chai-student",
      look: "college",
      x: 268,
      y: 212,
      facing: "up",
      name: "Student",
      lines: (y) => [y >= 2016 ? "I paid by UPI. Raju bhau got a QR code sticker last year." : "Chai and a bun maska before lectures. Every single day.", "Have you tried the Time Machine? Go to 1995 and look at the board."],
    },
  ],
};

// ---------------------------------------------------------------- kirana
const KIR_W = 304;
const KIR_H = 208;
export const KIRANA: InteriorSpec = {
  kind: "kirana",
  title: "Kirana store",
  w: KIR_W,
  h: KIR_H,
  bgKey: () => "kirana-bg",
  bg: () => {
    const p = new Px(KIR_W, KIR_H);
    I.woodFloor(p, 0, 0, KIR_W, KIR_H, "#9a6a42");
    I.backWall(p, 0, 0, KIR_W, 76, "#d6c49a");
    I.sideWalls(p, KIR_W, KIR_H, 76, "#d6c49a");
    I.doorMat(p, KIR_W / 2, KIR_H - 16);
    return p;
  },
  props: [
    { x: 8, y: 78, key: (y) => `shelfA${era(y, [2016])}`, draw: (y) => I.shelves(140, 3, y), solid: null },
    { x: 156, y: 78, key: (y) => `shelfB${era(y, [2016])}`, draw: (y) => I.shelves(140, 8, y), solid: null },
    { x: 96, y: 126, key: (y) => `kcounter${era(y, [2008])}`, draw: (y) => I.kiranaCounter(y), solid: [0, -30, 110, 30] },
    { x: 20, y: 176, key: () => "sacks", draw: () => I.sacks(), solid: [0, -18, 64, 18] },
    { x: 236, y: 200, key: (y) => `kboard${y}`, draw: (y) => I.board(["TODAY", `ONION ${pr("onion", y)}/KG`, `MILK ${pr("milk", y)}/L`], "#f3ead2", "#1c1c22", "#c0392b"), solid: [0, -8, 60, 8] },
  ],
  walls: [
    [0, 0, KIR_W, 82],
    [0, 0, 8, KIR_H],
    [KIR_W - 8, 0, 8, KIR_H],
  ],
  exit: { x: KIR_W / 2 - 20, y: KIR_H - 14, w: 40, h: 14, label: "Back to the street" },
  spawn: { x: KIR_W / 2, y: KIR_H - 24 },
  keeper: { look: "mehta", x: 150, y: 96, shop: "kirana", name: "Mehta uncle" },
  talkers: [
    {
      id: "kirana-aunty",
      look: "aunty",
      x: 248,
      y: 140,
      facing: "left",
      name: "Neighbour",
      lines: (y) => [
        `Onions at ${pr("onion", y)} a kilo! ${[1998, 2013, 2019].includes(y) ? "In my whole life I have not seen such prices." : "Thik hai, I'll take two kilos."}`,
        `And a litre of milk is ${pr("milk", y)}. My mother paid ${pr("milk", 1995)} in 1995.`,
      ],
    },
  ],
};

// ---------------------------------------------------------------- railway station
const ST_W = 760;
const ST_H = 448;
export const PLATFORM_Y = 236; // platform top
export const PLATFORM_EDGE = 300; // yellow line
export const TRACK_BOTTOM = 352; // where train wheels sit
export const STATION: InteriorSpec = {
  kind: "station",
  title: "Railway station",
  w: ST_W,
  h: ST_H,
  bgKey: () => "station-bg",
  bg: () => {
    const p = new Px(ST_W, ST_H);
    I.stoneFloor(p, 0, 0, ST_W, PLATFORM_Y, "#cfc4ab");
    I.backWall(p, 0, 0, ST_W, 70, "#d7c7a3");
    // railing between booking hall and platform, with a gap to walk through
    for (let x = 0; x < ST_W; x += 6) if (x < 340 || x > 420) p.vline(x, PLATFORM_Y - 14, 12, "#3a3f4b");
    p.hline(0, PLATFORM_Y - 14, 340, "#3a3f4b");
    p.hline(420, PLATFORM_Y - 14, ST_W - 420, "#3a3f4b");
    // platform 1
    p.rect(0, PLATFORM_Y, ST_W, PLATFORM_EDGE - PLATFORM_Y, "#c9c2b2");
    p.speckle(0, PLATFORM_Y, ST_W, PLATFORM_EDGE - PLATFORM_Y, ["#b9b2a2", "#d6cfbf"], 0.08, 9);
    p.rect(0, PLATFORM_EDGE - 6, ST_W, 4, "#f2c230");
    p.rect(0, PLATFORM_EDGE - 2, ST_W, 4, "#8a8178");
    // track
    p.rect(0, PLATFORM_EDGE + 2, ST_W, TRACK_BOTTOM - PLATFORM_EDGE + 10, "#8a8178");
    p.speckle(0, PLATFORM_EDGE + 2, ST_W, TRACK_BOTTOM - PLATFORM_EDGE + 10, ["#9d948a", "#766d64", "#6b625a"], 0.3, 10);
    for (let x = 0; x < ST_W; x += 6) p.rect(x, PLATFORM_EDGE + 26, 3, 30, "#5a3a22");
    for (const ry of [PLATFORM_EDGE + 30, PLATFORM_EDGE + 50]) {
      p.rect(0, ry, ST_W, 2, "#c9c9cf");
      p.hline(0, ry, ST_W, "#e0e0e6");
    }
    // far platform with its crowd, beyond the track
    p.rect(0, TRACK_BOTTOM + 12, ST_W, ST_H - TRACK_BOTTOM - 12, "#c9c2b2");
    p.rect(0, TRACK_BOTTOM + 12, ST_W, 4, "#f2c230");
    p.text(20, TRACK_BOTTOM + 24, "PLATFORM 2", "#7a6a5a");
    p.text(20, PLATFORM_Y + 8, "PLATFORM 1", "#7a6a5a");
    p.rect(0, 70, 6, PLATFORM_Y - 70, "#a8946c");
    p.rect(ST_W - 6, 70, 6, PLATFORM_Y - 70, "#a8946c");
    // exit to the street on the left
    p.rect(0, 120, 6, 50, "#2b2226");
    p.text(10, 126, "EXIT", "#2b2226");
    return p;
  },
  props: [
    { x: 250, y: 74, key: (y) => `windows${era(y, [2015])}`, draw: (y) => I.ticketWindows(y), solid: null },
    {
      x: 560,
      y: 54,
      key: (y) => `indicator${y}`,
      draw: (y) => I.indicator([`SLOW  ${y >= 2015 ? "12 CAR" : "9 CAR"}`, `TICKET ${pr("train", y)}`]),
      solid: null,
    },
    { x: 40, y: 200, key: () => "sbench", draw: () => I.stationBench(), solid: [0, -6, 52, 6] },
    { x: 600, y: 200, key: () => "sbench", draw: () => I.stationBench(), solid: [0, -6, 52, 6] },
    { x: 150, y: 290, key: () => "sbench", draw: () => I.stationBench(), solid: [0, -6, 52, 6] },
    { x: 520, y: 290, key: () => "sbench", draw: () => I.stationBench(), solid: [0, -6, 52, 6] },
    { x: 120, y: 226, key: () => "pillar", draw: () => I.pillar(120), solid: [0, -8, 14, 8] },
    { x: 640, y: 226, key: () => "pillar", draw: () => I.pillar(120), solid: [0, -8, 14, 8] },
    { x: 200, y: 120, key: (y) => (y >= 2010 ? "atvm" : "none"), draw: () => I.atvm(), solid: [0, -8, 22, 8] },
    { x: 226, y: 120, key: (y) => (y >= 2010 ? "atvm" : "none"), draw: () => I.atvm(), solid: [0, -8, 22, 8] },
  ],
  walls: [
    [0, 0, ST_W, 78],
    [0, PLATFORM_Y - 16, 340, 6],
    [420, PLATFORM_Y - 16, ST_W - 420, 6],
    [0, PLATFORM_EDGE - 6, ST_W, ST_H],
    [ST_W - 8, 0, 8, ST_H],
    [0, 0, 6, 118],
    [0, 172, 6, ST_H],
  ],
  exit: { x: 0, y: 120, w: 12, h: 50, label: "Exit to the street" },
  spawn: { x: 30, y: 150 },
  keeper: { look: "clerk", x: 376, y: 66, shop: "station", name: "Booking clerk" },
  talkers: [
    {
      id: "st-commuter",
      look: "office",
      x: 470,
      y: 268,
      facing: "down",
      name: "Daily commuter",
      lines: (y) => [
        `${pr("train", y)} for a second-class ticket. ${y > 1995 ? `It was ${pr("train", 1995)} in 1995.` : ""} The cheapest thing in this city.`,
        "Peak hour, nine-car train, and still everyone gets in. Somehow.",
      ],
    },
    {
      id: "st-dabba",
      look: "dabbawala",
      x: 300,
      y: 262,
      facing: "right",
      name: "Dabbawala",
      lines: () => ["Luggage compartment, second from the front. That's where the dabbas ride.", "We use the local for the long part of every route."],
    },
  ],
};

export const INTERIORS: Record<InteriorKind, InteriorSpec> = { chai: CHAI, kirana: KIRANA, station: STATION };

// ---------------------------------------------------------------- Delhi: same rooms, different city
const dpr = (id: string, y: number) => rupees(pointAt(itemById(id, datasets.delhi), y).price);

export const CHAI_DELHI: InteriorSpec = {
  ...CHAI,
  title: "Chai stall",
  bgKey: (y) => `dl-chai-bg${era(y, [2008])}`,
  bg: (y) => {
    // a dhaba-style room: cement floor, a green wall, a calendar and the radio
    const p = new Px(CHAI_W, CHAI_H);
    I.stoneFloor(p, 0, 0, CHAI_W, CHAI_H, "#b9b2a2", 21);
    I.backWall(p, 0, 0, CHAI_W, 64, "#8fbf9a");
    p.rect(0, 40, CHAI_W, 2, "#5a7a5f");
    p.draw(I.calendar(y), 24, 10);
    p.draw(I.radio(y), 60, 22);
    p.rect(250, 8, 44, 30, "#e0a526"); // a framed photo of the Golden Temple
    p.rect(253, 11, 38, 24, "#5fb3c6");
    p.rect(262, 18, 20, 12, "#f2c230");
    p.rect(270, 14, 4, 4, "#f2c230");
    I.sideWalls(p, CHAI_W, CHAI_H, 64, "#8fbf9a");
    I.doorMat(p, CHAI_W / 2, CHAI_H - 16);
    return p;
  },
  props: CHAI.props.map((pr0, i) =>
    i === 1
      ? { ...pr0, key: (y: number) => `dl-chai-menu${y}`, draw: (y: number) => I.board(["MENU", `CHAI ${dpr("chai", y)}`, `SAMOSA ${dpr("samosa", y)}`]) }
      : pr0,
  ),
  keeper: { ...CHAI.keeper, look: "sardar", name: "Sardar ji" },
  talkers: [
    {
      id: "dl-chai-regular",
      look: "dada",
      x: 50,
      y: 150,
      facing: "right",
      name: "A regular",
      lines: (y) => [
        `Chai in a kulhad, then you smash the cup. ${y > 1995 ? `It was ${dpr("chai", 1995)} in 1995, ${dpr("chai", y)} now.` : ""}`,
        "Nobody ever wrote chai prices down. If you find an old menu, tell the bazaar.",
      ],
    },
    {
      id: "dl-chai-student",
      look: "salwar",
      x: 268,
      y: 212,
      facing: "up",
      name: "Student",
      lines: (y) => [y >= 2002 ? "One chai, then the Metro to college. Rajiv Chowk at nine is a sport." : "One chai, then two buses to college. Every single day.", "Sardar ji's samosas run out by eleven."],
    },
  ],
};

export const KIRANA_DELHI: InteriorSpec = {
  ...KIRANA,
  props: KIRANA.props.map((pr0, i) =>
    i === 4 ? { ...pr0, key: (y: number) => `dl-kboard${y}`, draw: (y: number) => I.board(["TODAY", `ONION ${dpr("onion", y)}/KG`, `MILK ${dpr("milk", y)}/L`], "#f3ead2", "#1c1c22", "#c0392b") } : pr0,
  ),
  keeper: { ...KIRANA.keeper, look: "gupta", name: "Gupta ji" },
  talkers: [
    {
      id: "dl-kirana-aunty",
      look: "aunty",
      x: 248,
      y: 140,
      facing: "left",
      name: "Neighbour",
      lines: (y) => [
        `Onions at ${dpr("onion", y)} a kilo! ${[1998, 2010, 2013, 2015, 2019].includes(y) ? "In 1998 onions brought down a government, you know." : "Fine, two kilos."}`,
        `Mother Dairy toned milk: ${dpr("milk", y)} a litre. My mother paid ${dpr("milk", 1995)} in 1995.`,
      ],
    },
  ],
};

export const STATION_DELHI: InteriorSpec = {
  ...STATION,
  title: "Metro station",
  bgKey: () => "dl-station-bg",
  bg: (y) => {
    // white floor tiles and steel: the Delhi Metro look
    const p = STATION.bg(y);
    I.checkerFloor(p, 6, 70, ST_W - 12, PLATFORM_Y - 84, "#e9eef2", "#dfe5ea", 16);
    p.text(10, 126, "EXIT", "#2b2226");
    return p;
  },
  props: STATION.props.map((pr0, i) =>
    i === 1
      ? { ...pr0, key: (y: number) => `dl-indicator${y}`, draw: (y: number) => I.indicator(["NEXT TRAIN 3 MIN", `TICKET ${dpr("metro", y)}`]) }
      : pr0,
  ),
  keeper: { ...STATION.keeper, look: "metrostaff", name: "Metro staff" },
  talkers: [
    {
      id: "dl-st-commuter",
      look: "office",
      x: 470,
      y: 268,
      facing: "down",
      name: "Daily commuter",
      lines: (y) => [`${dpr("metro", y)} for the shortest ride. Smart card saves a bit.`, "Stand behind the yellow line. Let them get off first. Then push."],
    },
    {
      id: "dl-st-aunty",
      look: "salwar",
      x: 300,
      y: 262,
      facing: "right",
      name: "Commuter",
      lines: () => ["The first coach is for women. I always walk to the front of the platform.", "Before the Metro it was two buses and an hour and a half. Now it's forty minutes."],
    },
  ],
};

export const INTERIORS_BY_CITY: Record<City, Record<InteriorKind, InteriorSpec>> = {
  mumbai: INTERIORS,
  delhi: { chai: CHAI_DELHI, kirana: KIRANA_DELHI, station: STATION_DELHI },
};
