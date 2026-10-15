import raw from "../../public/data/series.json";

export type Confidence = "documented" | "reported" | "estimated" | "interpolated";

export interface Point {
  year: number;
  price: number;
  price_2026: number;
  minutes_of_work: number;
  kind: "anchor" | "interpolated";
  confidence: Confidence;
  source_id: string | null;
  note: string | null;
}

export interface Item {
  id: string;
  name: string;
  unit: string;
  building: BuildingId;
  place: string;
  keeper: string;
  series: Point[];
  summary: {
    nominal_multiple: number;
    real_change_pct: number;
    minutes_1995: number;
    minutes_2026: number;
    cagr_pct: number;
    anchor_counts: Record<"documented" | "reported" | "estimated", number>;
  };
}

export interface Source {
  source_id: string;
  title: string;
  publisher: string;
  date: string;
  url: string;
}

export interface Macro {
  year: number;
  inflation_pct: number;
  inflation_confidence: string;
  cpi_index: number;
  income_monthly: number;
  income_confidence: string;
  hourly_wage: number;
}

export type BuildingId = "chai" | "vadapav" | "kirana" | "station" | "autostand";

export interface Dataset {
  meta: { title: string; generated: string; years: number[]; base_year: number; work_hours_per_month: number };
  sources: Record<string, Source>;
  macro: Macro[];
  items: Item[];
}

export const data = raw as unknown as Dataset;
export const YEARS = data.meta.years;
export const FIRST_YEAR = YEARS[0];
export const LAST_YEAR = YEARS[YEARS.length - 1];

export const itemsFor = (b: BuildingId) => data.items.filter((i) => i.building === b);
export const itemById = (id: string) => data.items.find((i) => i.id === id)!;
export const pointAt = (item: Item, year: number) => item.series.find((p) => p.year === year)!;
export const macroAt = (year: number) => data.macro.find((m) => m.year === year)!;

export const rupees = (n: number) =>
  n >= 100 ? `₹${Math.round(n).toLocaleString("en-IN")}` : `₹${Number.isInteger(n) ? n : n.toFixed(n < 10 ? 1 : 0)}`;

/** Nearest anchor (a real data point) at or before the year, for honest storytelling. */
export const anchorNear = (item: Item, year: number) =>
  [...item.series].reverse().find((p) => p.kind === "anchor" && p.year <= year) ?? item.series[0];

export const BUILDINGS: Record<BuildingId, { name: string; keeper: string; blurb: string }> = {
  chai: { name: "Chai tapri", keeper: "Raju bhau", blurb: "Cutting chai, the city's fuel." },
  vadapav: { name: "Vada pav stall", keeper: "Sunita tai", blurb: "Mumbai's burger, born outside Dadar station." },
  kirana: { name: "Kirana store", keeper: "Mehta uncle", blurb: "Onions and milk: the kitchen basics." },
  station: { name: "Railway station", keeper: "Booking clerk", blurb: "The local train, Mumbai's lifeline." },
  autostand: { name: "Auto stand", keeper: "Pappu bhai", blurb: "Minimum fares and the price of petrol." },
};
