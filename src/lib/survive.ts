import { data, itemById, macroAt, pointAt, type BuildingId } from "./data";

// "Can you survive the month?"
// Four weeks of street spending on a fixed budget. The budget is the same amount of real money in every
// year (₹3,000 in 2026 rupees, deflated with India's CPI), so the game asks one question honestly:
// did Mumbai's street prices outrun inflation? Every price comes from the dataset for the chosen year.

export const BUDGET_2026 = 3000;
export const START_MOOD = 3;
export const MAX_MOOD = 5;

/** Quantities of dataset items, e.g. { train: 10, vadapav: 5 }. */
export type Basket = Partial<Record<string, number>>;

export interface Option {
  id: string;
  label: string;
  detail: string;
  basket: Basket;
  mood: number;
}

export interface Card {
  id: string;
  building: BuildingId;
  title: string;
  prompt: string;
  options: Option[];
}

export interface Week {
  /** Kirana basics bought automatically at the start of the week. */
  basics: Basket;
  cards: Card[];
}

const commute = (week: number): Card => ({
  id: `commute-${week}`,
  building: "station",
  title: "Getting to work",
  prompt: "Five working days, there and back. Ten trips.",
  options: [
    { id: "train", label: "Local train", detail: "10 tickets at the minimum fare. Crowded, but it gets you there.", basket: { train: 10 }, mood: 0 },
    { id: "auto-train", label: "Auto to the station, then the train", detail: "10 minimum auto fares plus 10 tickets. You arrive dry and on time.", basket: { auto: 10, train: 10 }, mood: 1 },
    { id: "walk", label: "Walk the whole way", detail: "Free. You are late twice and your feet have opinions.", basket: {}, mood: -1 },
  ],
});

const lunch = (week: number): Card => ({
  id: `lunch-${week}`,
  building: "vadapav",
  title: "Lunch",
  prompt: "Five working lunches.",
  options: [
    { id: "two", label: "Two vada pav a day", detail: "10 vada pav. Properly full.", basket: { vadapav: 10 }, mood: 1 },
    { id: "one", label: "One vada pav a day", detail: "5 vada pav. Fine until four o'clock.", basket: { vadapav: 5 }, mood: 0 },
    { id: "tiffin", label: "Pack a tiffin from home", detail: "An extra kilo of onions for the week's sabzi. Cold by noon.", basket: { onion: 1 }, mood: -1 },
  ],
});

const chai = (week: number): Card => ({
  id: `chai-${week}`,
  building: "chai",
  title: "Chai",
  prompt: "Seven days. How much tapri time can you afford?",
  options: [
    { id: "twice", label: "Cutting chai twice a day", detail: "14 glasses. Morning and evening, with gossip.", basket: { chai: 14 }, mood: 1 },
    { id: "once", label: "Once a day", detail: "7 glasses.", basket: { chai: 7 }, mood: 0 },
    { id: "home", label: "Make it at home", detail: "An extra litre of milk. Nobody to talk to.", basket: { milk: 1 }, mood: -1 },
  ],
});

const EXTRAS: Card[] = [
  {
    id: "juhu",
    building: "station",
    title: "Sunday at Juhu",
    prompt: "Two friends want to go to the beach. You'd be paying for the snacks.",
    options: [
      { id: "go", label: "Go, and treat them", detail: "A return train ticket and 3 vada pav.", basket: { train: 2, vadapav: 3 }, mood: 2 },
      { id: "stay", label: "Stay home", detail: "Free. You see the photos later.", basket: {}, mood: -1 },
    ],
  },
  {
    id: "scooter",
    building: "autostand",
    title: "Uncle's scooter",
    prompt: "You can borrow it for the week's errands if you fill the tank.",
    options: [
      { id: "fill", label: "Put in 2 litres of petrol", detail: "Errands done in an evening.", basket: { petrol: 2 }, mood: 1 },
      { id: "foot", label: "Do the errands on foot", detail: "Free. It takes your whole Saturday.", basket: {}, mood: -1 },
    ],
  },
  {
    id: "monsoon",
    building: "autostand",
    title: "Monsoon evening",
    prompt: "Rain floods the tracks and the trains stop. You still need to get home.",
    options: [
      { id: "auto", label: "Take autos home", detail: "About 4 minimum fares, once you find one that will go.", basket: { auto: 4 }, mood: 0 },
      { id: "wait", label: "Wait it out at the station", detail: "Free. Three hours on a wet platform.", basket: {}, mood: -2 },
    ],
  },
  {
    id: "birthday",
    building: "chai",
    title: "Your friend's birthday",
    prompt: "Six of you at the tapri. Somebody has to pay.",
    options: [
      { id: "treat", label: "It's on you", detail: "6 cutting chai and 6 vada pav.", basket: { chai: 6, vadapav: 6 }, mood: 2 },
      { id: "split", label: "Just buy your own", detail: "1 chai and 1 vada pav.", basket: { chai: 1, vadapav: 1 }, mood: 0 },
      { id: "skip", label: "Say you're busy", detail: "Free. They notice.", basket: {}, mood: -2 },
    ],
  },
];

export const WEEKS: Week[] = EXTRAS.map((extra, i) => ({
  basics: { milk: 3.5, onion: 0.5 },
  cards: [commute(i + 1), lunch(i + 1), chai(i + 1), extra],
}));

export const budgetFor = (year: number) => (BUDGET_2026 * macroAt(year).cpi_index) / macroAt(data.meta.base_year).cpi_index;

export const priceOf = (id: string, year: number) => pointAt(itemById(id), year).price;

export const costOf = (basket: Basket, year: number) =>
  Object.entries(basket).reduce((sum, [id, qty]) => sum + priceOf(id, year) * (qty ?? 0), 0);

export type Step = { kind: "basics"; week: number } | { kind: "card"; week: number; card: number };

/** The ordered list of things that happen in a month. */
export const STEPS: Step[] = WEEKS.flatMap((w, week) => [
  { kind: "basics", week } as Step,
  ...w.cards.map((_, card) => ({ kind: "card", week, card }) as Step),
]);

export interface Spend {
  step: number;
  label: string;
  basket: Basket;
  cost: number;
  mood: number;
}

export interface State {
  year: number;
  budget: number;
  money: number;
  mood: number;
  step: number;
  log: Spend[];
  outcome: "playing" | "survived" | "broke" | "miserable";
}

export function newGame(year: number): State {
  const budget = budgetFor(year);
  return { year, budget, money: budget, mood: START_MOOD, step: 0, log: [], outcome: "playing" };
}

/** Pays for the current step (the week's basics, or the chosen option) and moves on. */
export function advance(s: State, optionId?: string): State {
  const step = STEPS[s.step];
  if (!step || s.outcome !== "playing") return s;

  let spend: Spend;
  if (step.kind === "basics") {
    const basket = WEEKS[step.week].basics;
    spend = { step: s.step, label: `Week ${step.week + 1} kirana basics`, basket, cost: costOf(basket, s.year), mood: 0 };
  } else {
    const card = WEEKS[step.week].cards[step.card];
    const opt = card.options.find((o) => o.id === optionId);
    if (!opt) return s;
    spend = { step: s.step, label: `${card.title}: ${opt.label}`, basket: opt.basket, cost: costOf(opt.basket, s.year), mood: opt.mood };
  }

  const money = s.money - spend.cost;
  const mood = Math.min(MAX_MOOD, s.mood + spend.mood);
  const next = { ...s, money, mood, step: s.step + 1, log: [...s.log, spend] };
  if (money < -0.005) return { ...next, outcome: "broke" };
  if (mood <= 0) return { ...next, outcome: "miserable" };
  if (next.step >= STEPS.length) return { ...next, outcome: "survived" };

  // If the next step can't be paid for by any option, the month is over now.
  const upcoming = STEPS[next.step];
  const cheapest =
    upcoming.kind === "basics"
      ? costOf(WEEKS[upcoming.week].basics, s.year)
      : Math.min(...WEEKS[upcoming.week].cards[upcoming.card].options.map((o) => costOf(o.basket, s.year)));
  if (cheapest > money + 0.005) return { ...next, outcome: "broke" };
  return next;
}

/** What the same choices would have cost in another year, in that year's rupees and as a share of its budget. */
export function replay(log: Spend[], year: number) {
  const cost = log.reduce((sum, l) => sum + costOf(l.basket, year), 0);
  return { year, cost, budget: budgetFor(year), share: cost / budgetFor(year) };
}

/** Total spend per item across the month, biggest first. */
export function spendByItem(log: Spend[], year: number) {
  const totals = new Map<string, number>();
  for (const l of log) for (const [id, qty] of Object.entries(l.basket)) totals.set(id, (totals.get(id) ?? 0) + priceOf(id, year) * (qty ?? 0));
  return [...totals.entries()].map(([id, cost]) => ({ item: itemById(id), cost })).sort((a, b) => b.cost - a.cost);
}
