import { FIRST_YEAR, LAST_YEAR, data, itemById, pointAt, type Item } from "./data";
import { getSupabase } from "./supabase";

// Phase 4: the bazaar.
//   Ask the Bazaar  - questions about any item. Dataset items are answered instantly from the sourced data;
//                     anything else goes into a review queue and is published only once answered with a source.
//   Price reports   - players report what they paid recently. Reports are published only after review and are
//                     always shown apart from the sourced dataset: they are a live signal, not a historical record.
// Every write goes through Supabase with row-level security; see supabase/migrations/*_bazaar.sql.

export const ITEM_IDS = data.items.map((i) => i.id);

export interface Report {
  item_id: string;
  price: number;
  paid_on: string;
  area: string | null;
  note: string | null;
}

export interface Answer {
  id: string;
  question: string;
  item_name: string;
  price: number;
  unit: string | null;
  year: number;
  place: string | null;
  answer: string | null;
  source_title: string | null;
  source_url: string;
  answered_at: string;
}

export interface PendingReport extends Report {
  id: string;
  created_at: string;
}
export interface PendingQuestion {
  id: string;
  question: string;
  created_at: string;
}

/** Turns a Supabase/PostgREST error into one plain sentence for the page. */
const plain = (e: { message?: string } | null | undefined) => {
  const m = e?.message ?? "";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "Couldn't reach the bazaar. Check your connection and try again.";
  if (/Too many|busy|queue is full|last two years|longer question|Wrong review key/.test(m)) return m;
  if (/check constraint|violates/i.test(m)) return "Something in that entry isn't valid. Please check it and try again.";
  return "Something went wrong. Please try again.";
};

export class BazaarError extends Error {}

// ------------------------------------------------------------------ public reads
export async function fetchReports(days = 365): Promise<Report[]> {
  const sb = await getSupabase();
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const { data: rows, error } = await sb
    .from("price_reports")
    .select("item_id, price, paid_on, area, note")
    .gte("paid_on", since)
    .order("paid_on", { ascending: false })
    .limit(1000);
  if (error) throw new BazaarError(plain(error));
  return (rows ?? []).map((r) => ({ ...r, price: Number(r.price) }));
}

let reportsCache: Promise<Report[]> | null = null;
/** Reports fetched once per page load, for places that just show a summary (shops, Analyst Mode). */
export function cachedReports() {
  reportsCache ??= fetchReports().catch((e) => {
    reportsCache = null;
    throw e;
  });
  return reportsCache;
}

export async function fetchAnswers(): Promise<Answer[]> {
  const sb = await getSupabase();
  const { data: rows, error } = await sb
    .from("bazaar_questions")
    .select("id, question, item_name, price, unit, year, place, answer, source_title, source_url, answered_at")
    .order("answered_at", { ascending: false })
    .limit(300);
  if (error) throw new BazaarError(plain(error));
  return (rows ?? []).map((r) => ({ ...r, price: Number(r.price) })) as Answer[];
}

// ------------------------------------------------------------------ public writes (always land in the review queue)
export async function submitReport(r: Report) {
  const sb = await getSupabase();
  const { error } = await sb.from("price_reports").insert(r);
  if (error) throw new BazaarError(plain(error));
}

export async function askQuestion(question: string) {
  const sb = await getSupabase();
  const { error } = await sb.from("bazaar_questions").insert({ question });
  if (error) throw new BazaarError(plain(error));
}

// ------------------------------------------------------------------ review (needs the review key)
export async function reviewQueue(key: string): Promise<{ reports: PendingReport[]; questions: PendingQuestion[] }> {
  const sb = await getSupabase();
  const { data: q, error } = await sb.rpc("review_queue", { key });
  if (error) throw new BazaarError(plain(error));
  return { reports: (q.reports ?? []).map((r: PendingReport) => ({ ...r, price: Number(r.price) })), questions: q.questions ?? [] };
}

export async function reviewReport(key: string, report_id: string, approve: boolean) {
  const sb = await getSupabase();
  const { error } = await sb.rpc("review_report", { key, report_id, approve });
  if (error) throw new BazaarError(plain(error));
}

export interface AnswerInput {
  item_name: string;
  price: number;
  unit: string;
  year: number;
  place: string;
  answer: string;
  source_title: string;
  source_url: string;
}

export async function answerQuestion(key: string, question_id: string, a: AnswerInput) {
  const sb = await getSupabase();
  const { error } = await sb.rpc("review_answer", { key, question_id, ...a });
  if (error) throw new BazaarError(plain(error));
}

export async function rejectQuestion(key: string, question_id: string) {
  const sb = await getSupabase();
  const { error } = await sb.rpc("review_reject_question", { key, question_id });
  if (error) throw new BazaarError(plain(error));
}

// ------------------------------------------------------------------ matching a question to the dataset
const KEYWORDS: Record<string, RegExp> = {
  chai: /\b(chai|tea|cutting)\b/i,
  vadapav: /\bvada[\s-]?pav\b|\bvada\b|\bwada[\s-]?pav\b/i,
  train: /\b(local train|train|railway|rail ticket|local ticket|second class)\b/i,
  auto: /\b(auto|rickshaw|autorickshaw|auto-rickshaw)\b/i,
  petrol: /\b(petrol|fuel|gasoline)\b/i,
  onion: /\b(onions?|kanda|pyaz|pyaaz)\b/i,
  milk: /\b(milk|doodh)\b/i,
};

export interface DatasetMatch {
  item: Item;
  year: number | null;
}

/** Items from the dataset a question is about, and the year it asks about if any. */
export function matchDataset(question: string): DatasetMatch[] {
  const y = question.match(/\b(19[5-9]\d|20[0-4]\d)\b/);
  const year = y ? Number(y[1]) : null;
  return Object.entries(KEYWORDS)
    .filter(([, re]) => re.test(question))
    .map(([id]) => ({ item: itemById(id), year }));
}

export const yearInData = (y: number | null): y is number => y !== null && y >= FIRST_YEAR && y <= LAST_YEAR;
export const datasetPrice = (item: Item, year: number) => pointAt(item, year);

const STOP = new Set("the a an of in to for and or was is what how much did does do cost costs price prices rs rupees mumbai bombay".split(" "));
const words = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? [];

/** Answered community questions that look like the same question, best first. */
export function similarAnswers(question: string, answers: Answer[], max = 3) {
  const q = new Set(words(question));
  if (!q.size) return [];
  return answers
    .map((a) => {
      const w = new Set(words(`${a.question} ${a.item_name} ${a.place ?? ""} ${a.year}`));
      let shared = 0;
      q.forEach((x) => w.has(x) && shared++);
      return { a, score: shared / q.size };
    })
    .filter((s) => s.score >= 0.34)
    .sort((x, y) => y.score - x.score)
    .slice(0, max)
    .map((s) => s.a);
}

// ------------------------------------------------------------------ summarising reports
export interface ReportSummary {
  item: Item;
  count: number;
  median: number;
  low: number;
  high: number;
  latest: string;
  datasetNow: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Per-item summary of approved reports from the last `days` days. */
export function summarise(reports: Report[], days = 90): ReportSummary[] {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  return data.items
    .map((item) => {
      const rs = reports.filter((r) => r.item_id === item.id && r.paid_on >= since);
      if (!rs.length) return null;
      const prices = rs.map((r) => r.price);
      return {
        item,
        count: rs.length,
        median: median(prices),
        low: Math.min(...prices),
        high: Math.max(...prices),
        latest: rs.map((r) => r.paid_on).sort().at(-1)!,
        datasetNow: pointAt(item, LAST_YEAR).price,
      };
    })
    .filter((s): s is ReportSummary => !!s);
}

/** Reviewer hint: is a report far from the dataset's current price? */
export function unusual(r: Report) {
  const now = pointAt(itemById(r.item_id), LAST_YEAR).price;
  const ratio = r.price / now;
  return ratio < 0.4 || ratio > 2.5 ? `${ratio < 1 ? "well below" : "well above"} the dataset's ${LAST_YEAR} price of ₹${now}` : null;
}
