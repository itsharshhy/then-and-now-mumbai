import raw from "../../public/data/series.json";
import rawDelhi from "../../public/data/series_delhi.json";

export type Confidence = "documented" | "reported" | "estimated" | "interpolated" | "unavailable";
export type City = "mumbai" | "delhi";
export const CITIES: { id: City; name: string; blurb: string }[] = [
  { id: "mumbai", name: "Mumbai", blurb: "Sea front, chawls, the local train" },
  { id: "delhi", name: "Delhi", blurb: "Old city gates, the Metro, chai and samosa" },
];

export interface Point {
  year: number;
  price: number;
  price_2026: number;
  minutes_of_work: number;
  kind: "anchor" | "interpolated" | "unavailable";
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
  /** First year the thing existed (the Delhi Metro opened in 2002). */
  available_from?: number;
  series: Point[];
  summary: {
    nominal_multiple: number;
    real_change_pct: number;
    minutes_1995: number;
    minutes_2026: number;
    cagr_pct: number;
    first_year?: number;
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
  meta: { title: string; city?: City; generated: string; years: number[]; base_year: number; work_hours_per_month: number };
  sources: Record<string, Source>;
  macro: Macro[];
  items: Item[];
}

export const data = raw as unknown as Dataset;
export const datasets: Record<City, Dataset> = { mumbai: data, delhi: rawDelhi as unknown as Dataset };
export const datasetFor = (city: City) => datasets[city];
/** Did this thing exist yet in that year? */
export const available = (item: Item, year: number) => !item.available_from || year >= item.available_from;
export const YEARS = data.meta.years;
export const FIRST_YEAR = YEARS[0];
export const LAST_YEAR = YEARS[YEARS.length - 1];

export const itemsFor = (b: BuildingId, ds: Dataset = data) => ds.items.filter((i) => i.building === b);
export const itemById = (id: string, ds: Dataset = data) => ds.items.find((i) => i.id === id)!;
export const pointAt = (item: Item, year: number) => item.series.find((p) => p.year === year)!;
export const macroAt = (year: number, ds: Dataset = data) => ds.macro.find((m) => m.year === year)!;

export const rupees = (n: number) =>
  n >= 100 ? `₹${Math.round(n).toLocaleString("en-IN")}` : `₹${Number.isInteger(n) ? n : n.toFixed(n < 10 ? 1 : 0)}`;

/** Nearest anchor (a real data point) at or before the year, for honest storytelling. */
export const anchorNear = (item: Item, year: number) =>
  [...item.series].reverse().find((p) => p.kind === "anchor" && p.year <= year) ?? item.series[0];

export const BUILDINGS_DELHI: Record<BuildingId, { name: string; keeper: string; blurb: string }> = {
  chai: { name: "Chai stall", keeper: "Sardar ji", blurb: "Kadak chai in a kulhad, by the old city gate." },
  vadapav: { name: "Samosa stall", keeper: "Bittu bhaiya", blurb: "Hot samosas, green chutney, no plate." },
  kirana: { name: "Kirana store", keeper: "Gupta ji", blurb: "Onions and Mother Dairy milk." },
  station: { name: "Metro station", keeper: "Metro staff", blurb: "The Delhi Metro, open since December 2002." },
  autostand: { name: "Auto stand", keeper: "Ramesh ji", blurb: "Green-and-yellow CNG autos and the petrol pump." },
};

export const buildingsFor = (city: City) => (city === "delhi" ? BUILDINGS_DELHI : BUILDINGS);

export const BUILDINGS: Record<BuildingId, { name: string; keeper: string; blurb: string }> = {
  chai: { name: "Chai tapri", keeper: "Raju bhau", blurb: "Cutting chai, the city's fuel." },
  vadapav: { name: "Vada pav stall", keeper: "Sunita tai", blurb: "Mumbai's burger, born outside Dadar station." },
  kirana: { name: "Kirana store", keeper: "Mehta uncle", blurb: "Onions and milk: the kitchen basics." },
  station: { name: "Railway station", keeper: "Booking clerk", blurb: "The local train, Mumbai's lifeline." },
  autostand: { name: "Auto stand", keeper: "Pappu bhai", blurb: "Minimum fares and the price of petrol." },
};
