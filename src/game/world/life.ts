import { data, itemById, macroAt, pointAt, rupees, type BuildingId } from "@/lib/data";

// The people who stand around the city and what they say. Lines are written from the dataset where they
// mention prices, so they change with the Time Machine and stay honest.

export interface Talker {
  id: string;
  look: string;
  x: number;
  y: number;
  facing: "down" | "up" | "left" | "right";
  name: string;
  lines: (year: number) => string[];
  /** Only around in these years. */
  from?: number;
  to?: number;
}

const price = (id: string, year: number) => rupees(pointAt(itemById(id), year).price);

export const TALKERS: Talker[] = [
  {
    id: "dabbawala",
    look: "dabbawala",
    x: 1130,
    y: 548,
    facing: "down",
    name: "Dabbawala",
    lines: (y) => [
      "Lunch from home to office, every working day. The dabbawalas have done it since 1890.",
      `My route starts on the local. A second-class ticket is ${price("train", y)} in ${y}.`,
      "We hardly ever mix up a dabba. The colour codes on the lids tell us where each one goes.",
    ],
  },
  {
    id: "koli",
    look: "koli",
    x: 176,
    y: 420,
    facing: "right",
    name: "Koli fisherwoman",
    lines: (y) => [
      "The Kolis were fishing these waters long before there was a Bombay.",
      `Onions? ${price("onion", y)} a kilo in ${y}. ${[1998, 2013, 2019].includes(y) ? "A bad year. Everyone is complaining." : "Not bad, not good."}`,
    ],
  },
  {
    id: "dada",
    look: "dada",
    x: 170,
    y: 830,
    facing: "right",
    name: "Retired clerk",
    lines: (y) => {
      const m = macroAt(y);
      return [
        "I come to the sea front every evening. Fifty years now.",
        `They say the average Maharashtrian earns about ${rupees(m.income_monthly)} a month in ${y}. Averages hide a lot, beta.`,
        "Go into the station. Watch a local pull in at peak hour, then tell me you're in a hurry.",
      ];
    },
  },
  {
    id: "student",
    look: "student",
    x: 560,
    y: 990,
    facing: "down",
    name: "School kid",
    lines: (y) => [
      "Want to play? We need a fielder. The ball always goes in the gutter though.",
      `A vada pav after school is ${price("vadapav", y)}. I'm saving for two.`,
    ],
  },
  {
    id: "college",
    look: "college",
    x: 1210,
    y: 548,
    facing: "left",
    name: "College student",
    lines: (y) =>
      y >= 2015
        ? ["Metro, then local, then a share auto. Three apps and one very long day.", `The auto minimum is ${price("auto", y)} now.`]
        : [`The auto minimum is ${price("auto", y)}. I take the bus when I can.`, "My mother says buses used to be double-deckers everywhere."],
  },
  {
    id: "techie",
    look: "techie",
    x: 860,
    y: 760,
    facing: "left",
    name: "Commuter",
    from: 2008,
    lines: (y) => [`Petrol is ${price("petrol", y)} a litre. I'm thinking of switching to the Metro.`, "Have you found any of the old receipts lying around? People drop them everywhere."],
  },
  {
    id: "office",
    look: "office",
    x: 520,
    y: 660,
    facing: "up",
    name: "Office-goer",
    lines: (y) => [
      "Waiting for the BEST bus. It comes when it comes.",
      y < 2023 ? "If a double-decker comes, I'm sitting upstairs at the front." : "The last double-deckers retired in 2023. I still look up when a red bus comes.",
    ],
  },
];

/** People walking up and down the footpaths. */
export const WALKER_LOOKS = ["office", "aunty", "dabbawala", "student", "college", "dada", "techie", "koli"];

export interface Receipt {
  id: string;
  x: number;
  y: number;
  item: string;
  year: number;
}

// Old receipts are hidden around the map; each one is a real anchor from the dataset with its source.
const SPOTS: [number, number][] = [
  [600, 470],
  [1044, 486],
  [210, 300],
  [700, 1060],
  [1540, 560],
  [980, 760],
  [300, 690],
  [1230, 920],
];

export function receipts(): Receipt[] {
  const anchors = data.items.flatMap((it) =>
    it.series.filter((p) => p.kind === "anchor" && p.source_id && p.confidence !== "estimated").map((p) => ({ item: it.id, year: p.year })),
  );
  return SPOTS.slice(0, anchors.length).map(([x, y], i) => {
    const a = anchors[(i * 3) % anchors.length];
    return { id: `r${i}`, x, y, item: a.item, year: a.year };
  });
}

export function receiptText(r: Receipt) {
  const it = itemById(r.item);
  const p = pointAt(it, r.year);
  const src = p.source_id ? data.sources[p.source_id] : null;
  return {
    title: `${it.name}, ${r.year}: ${rupees(p.price)}`,
    body: `${it.unit}. ${src ? `Source: ${src.publisher}${src.date ? `, ${src.date.slice(0, 4)}` : ""}.` : ""}`,
    url: src?.url ?? null,
  };
}

export const SHOP_OF: Record<string, BuildingId> = { chai: "chai", kirana: "kirana", station: "station" };
