import type Phaser from "phaser";
import { PLAYER_FRAMES, playerPalette, type Palette } from "@/lib/sprites";

/** Paint a text-grid sprite into a Phaser canvas texture. Spaces and dots are transparent. */
export function makeTexture(scene: Phaser.Scene, key: string, grid: string[], palette: Palette) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const w = Math.max(...grid.map((r) => r.length));
  const h = grid.length;
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const c = palette[ch];
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  tex.refresh();
}

const V: Palette = {
  Y: "#f2c230", // taxi yellow
  K: "#1c1c22", // taxi black
  G: "#9fc3d6", // glass
  D: "#33333d", // shadowed interior
  W: "#141418", // tyre
  h: "#8a8a92", // hub
  L: "#ffe9a0", // headlight
  R: "#c0392b", // tail light / BEST red
  C: "#efe3c8", // BEST cream band
  S: "#b8bcc4", // steel
  B: "#2f6fb3", // car body (swapped per colour)
  b: "#24548a",
  T: "#3b3b46",
};

const TAXI_PADMINI = [
  "       YYYYYYYYY       ",
  "      YGGGGYGGGGY      ",
  "     YYGGGGYGGGGYY     ",
  "  KKKKKKKKKKKKKKKKKKK  ",
  " RKKKKKKKKKKKKKKKKKKKL ",
  "  KKKKKKKKKKKKKKKKKKK  ",
  "  KWWWKKKKKKKKKKWWWKK  ",
  "   WhW          WhW    ",
];

const TAXI_HATCH = [
  "      KYYYYYYYYY       ",
  "     KGGGGGYGGGGGY     ",
  "    KKGGGGGYGGGGGYY    ",
  "   KKKKKKKKKKKKKKKKKY  ",
  "  RKKKKKKKKKKKKKKKKKKL ",
  "   KKKKKKKKKKKKKKKKKK  ",
  "   KWWWKKKKKKKKWWWKK   ",
  "    WhW        WhW     ",
];

const AUTO = [
  "   YYYYYYYYYYYY   ",
  "  YYYYYYYYYYYYYY  ",
  "  YDDDDDDDDDDDDYG ",
  "  YDDDDDDDDDDDDYG ",
  "  KKKKKKKKKKKKKKG ",
  " RKKKKKKKKKKKKKKKL",
  "  KKKKKKKKKKKKKKK ",
  "  KWWWKKKKKKKKWWW ",
  "   WhW        WhW ",
];

const BUS = [
  " RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR ",
  "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
  "RRGGGGRGGGGRGGGGRGGGGRGGGGRGGGGRGGGGGR",
  "RRGGGGRGGGGRGGGGRGGGGRGGGGRGGGGRGGGGGR",
  "RRGGGGRGGGGRGGGGRGGGGRGGGGRGGGGRGGGGGR",
  "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
  "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRDDDRR",
  "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRDDDRL",
  "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRDDDRR",
  "RRRWWWRRRRRRRRRRRRRRRRRRRRRRWWWRRRRRRR",
  "   WhW                      WhW       ",
];

const CAR = [
  "        bbbbbbbb       ",
  "       bGGGGbGGGGb     ",
  "      bGGGGGbGGGGGb    ",
  "  BBBBBBBBBBBBBBBBBBB  ",
  " RBBBBBBBBBBBBBBBBBBBL ",
  "  BBBBBBBBBBBBBBBBBBB  ",
  "  BWWWBBBBBBBBBBWWWBB  ",
  "   WhW          WhW    ",
];

const SCOOTER = [
  "      SS  ",
  "  TT  S   ",
  " TTTTTS   ",
  " BBBBBB   ",
  "BBBBBBBBL ",
  "WW    WW  ",
  "hW    Wh  ",
];

const METRO = [
  "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
  "SGGGSSGGGSSGGGSSDSSGGGSSGGGSSGGGSSDSSGGGSSGGGSSGGGSSDSSGGGSSGGGSSGGGSSDSSGGGSSGGGSSGGGSSGGGS",
  "SGGGSSGGGSSGGGSSDSSGGGSSGGGSSGGGSSDSSGGGSSGGGSSGGGSSDSSGGGSSGGGSSGGGSSDSSGGGSSGGGSSGGGSSGGGS",
  "SSSSSSSSSSSSSSSSDSSSSSSSSSSSSSSSSSDSSSSSSSSSSSSSSSSSDSSSSSSSSSSSSSSSSSDSSSSSSSSSSSSSSSSSSSSS",
  "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
];

export const CAR_COLOURS: [string, string][] = [
  ["#e9e9ee", "#bdbdc6"],
  ["#c23b3b", "#8f2a2a"],
  ["#2f6fb3", "#24548a"],
  ["#8a8f99", "#686c74"],
  ["#2e8b57", "#226a42"],
];

export function buildTextures(scene: Phaser.Scene, shirt: string, skin?: string) {
  PLAYER_FRAMES.forEach((f, i) => makeTexture(scene, `player${i}`, f, playerPalette(shirt, skin)));
  // NPC walkers share the player frames with other palettes
  const npcShirts = ["#d98f3a", "#8c5bb5", "#3a9a8a", "#c23b3b", "#e9e6e0"];
  npcShirts.forEach((s, n) =>
    PLAYER_FRAMES.forEach((f, i) =>
      makeTexture(scene, `npc${n}_${i}`, f, { ...playerPalette(s, ["#8d5524", "#c68642", "#6b4423", "#a86b3c", "#8d5524"][n]), P: n % 2 ? "#5b4636" : "#2b3148" }),
    ),
  );
  makeTexture(scene, "taxi_old", TAXI_PADMINI, V);
  makeTexture(scene, "taxi_new", TAXI_HATCH, V);
  makeTexture(scene, "auto", AUTO, V);
  makeTexture(scene, "bus", BUS, V);
  makeTexture(scene, "scooter", SCOOTER, { ...V, B: "#2f6fb3", T: "#2b2b33" });
  makeTexture(scene, "metro", METRO, { ...V, B: "#2f6fb3" });
  CAR_COLOURS.forEach(([b, d], i) => makeTexture(scene, `car${i}`, CAR, { ...V, B: b, b: d }));
}
