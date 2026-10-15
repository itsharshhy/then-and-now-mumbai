// Pixel sprites as text grids. One character = one pixel; "." is transparent.
// Shared by the Phaser world (textures) and the React UI (SVG portraits).

export type Palette = Record<string, string>;

export const SKIN_TONES = ["#8d5524", "#a86b3c", "#c68642", "#6b4423"];
export const SHIRTS = ["#2f6fb3", "#c23b3b", "#2e8b57", "#e0a526", "#7a4fb5"];

export const PLAYER_FRAMES: string[][] = [
  // idle
  [
    "...HHHH...",
    "..HHHHHH..",
    "..HSSSSS..",
    "..SSSSES..",
    "..SSSSSS..",
    "...SSSS...",
    "..TTTTTT..",
    ".TTTTTTTT.",
    ".STTTTTTS.",
    ".STTTTTTS.",
    "..TTTTTT..",
    "..PPPPPP..",
    "..PPPPPP..",
    "..PP..PP..",
    "..PP..PP..",
    "..BB..BB..",
  ],
  // walk A
  [
    "...HHHH...",
    "..HHHHHH..",
    "..HSSSSS..",
    "..SSSSES..",
    "..SSSSSS..",
    "...SSSS...",
    "..TTTTTT..",
    ".TTTTTTTT.",
    ".STTTTTTS.",
    "..STTTTTS.",
    "..TTTTTT..",
    "..PPPPPP..",
    "..PPPPPP..",
    "..PP.PP...",
    ".PP...PP..",
    ".BB...BB..",
  ],
  // walk B
  [
    "...HHHH...",
    "..HHHHHH..",
    "..HSSSSS..",
    "..SSSSES..",
    "..SSSSSS..",
    "...SSSS...",
    "..TTTTTT..",
    ".TTTTTTTT.",
    ".STTTTTTS.",
    ".STTTTTT..",
    "..TTTTTT..",
    "..PPPPPP..",
    "...PPPP...",
    "...PPP....",
    "...PPP....",
    "...BBB....",
  ],
];

export const playerPalette = (shirt: string, skin = SKIN_TONES[1]): Palette => ({
  H: "#1d1a1f",
  S: skin,
  E: "#1d1a1f",
  T: shirt,
  P: "#2b3148",
  B: "#5a3a22",
});

// 12x12 shopkeeper portraits for the dialogue panel.
const FACE = [
  "...HHHHHH...",
  "..HHHHHHHH..",
  ".HHSSSSSSHH.",
  ".HSSSSSSSSH.",
  ".SSEESSEESS.",
  ".SSSSSSSSSS.",
  ".SSSSNNSSSS.",
  ".SSMMMMMMSS.",
  "..SSSSSSSS..",
  "...SSSSSS...",
  "..CCCCCCCC..",
  ".CCCCCCCCCC.",
];

export interface Keeper {
  grid: string[];
  palette: Palette;
}

const keeperPalette = (o: Partial<Palette>): Palette => ({
  H: "#1d1a1f",
  S: "#a86b3c",
  E: "#1d1a1f",
  N: "#8d5524",
  M: "#6b2e1f",
  C: "#2f6fb3",
  D: "#c23b3b",
  W: "#e9e6e0",
  G: "#7d7d7d",
  ...o,
});

export const KEEPERS: Record<string, Keeper> = {
  // Raju bhau: grey moustache, white vest
  chai: {
    grid: FACE.map((r, i) => (i === 7 ? ".SGGGGGGGGS." : i === 0 ? "............" : i === 1 ? "...GGGGGG..." : r.replace(/H/g, i < 4 ? "G" : "H"))),
    palette: keeperPalette({ C: "#e9e6e0", S: "#8d5524", N: "#6b4423" }),
  },
  // Sunita tai: long hair, bindi, red saree
  vadapav: {
    grid: FACE.map((r, i) => (i === 3 ? ".HSSSDSSSSH." : i >= 4 && i <= 8 ? "H" + r.slice(1, 11) + "H" : r)),
    palette: keeperPalette({ C: "#c23b3b", M: "#a5383c" }),
  },
  // Mehta uncle: bald top, glasses
  kirana: {
    grid: FACE.map((r, i) => (i === 0 || i === 1 ? "............" : i === 4 ? ".SGEGSSGEGS." : r)),
    palette: keeperPalette({ C: "#e0a526", S: "#c68642", N: "#a86b3c" }),
  },
  // Booking clerk: navy cap
  station: {
    grid: FACE.map((r, i) => (i === 0 ? "..CCCCCCCC.." : i === 1 ? ".CCCCCCCCCC." : i === 2 ? "CCCCCCCCCCCC" : r)),
    palette: keeperPalette({ C: "#24345c" }),
  },
  // Pappu bhai: khaki uniform, stubble
  autostand: {
    grid: FACE.map((r, i) => (i === 8 ? "..SGSGSGSS.." : r)),
    palette: keeperPalette({ C: "#a08a4f", S: "#6b4423", N: "#4f321a" }),
  },
};
