import { data, macroAt, pointAt, rupees, type Item } from "./data";

const first = (i: Item) => i.series[0];

/** The shopkeeper's lines for one item in one year, written from the data. */
export function storyFor(item: Item, year: number): string[] {
  const p = pointAt(item, year);
  const p0 = first(item);
  const now = year === data.meta.base_year;
  const name = item.name.toLowerCase();
  const lines: string[] = [];

  lines.push(
    now
      ? `Today, ${name} here costs ${rupees(p.price)} (${item.unit}).`
      : `It's ${year}. ${cap(name)} here costs ${rupees(p.price)} (${item.unit}).`,
  );

  if (year > p0.year) {
    const mult = p.price / p0.price;
    lines.push(
      mult >= 1.05
        ? `In 1995 it was ${rupees(p0.price)}. That's ${mult.toFixed(1)}x the price.`
        : `In 1995 it was ${rupees(p0.price)}. It has barely moved since.`,
    );
    // the 1995 price restated in the chosen year's rupees (CPI-adjusted)
    const in_this_year = p0.price_2026 * (p.price / p.price_2026);
    lines.push(
      `But rupees shrink too. The 1995 ${name} is worth ${rupees(in_this_year)} in ${year} money, so in real terms it got ${
        p.price > in_this_year * 1.03 ? "dearer" : p.price < in_this_year * 0.97 ? "cheaper" : "no dearer"
      }.`,
    );
    lines.push(
      `Measured in work: about ${fmtMin(p.minutes_of_work)} of the average Maharashtrian's paid time, against ${fmtMin(p0.minutes_of_work)} in 1995.`,
    );
  } else {
    const m = macroAt(year);
    lines.push(
      `That is ${fmtMin(p.minutes_of_work)} of work for someone on the state's average income of ${rupees(m.income_monthly)} a month.`,
    );
  }

  lines.push(...flavour(item, year));
  lines.push(honesty(item, year));
  return lines;
}

function flavour(item: Item, year: number): string[] {
  switch (item.id) {
    case "vadapav":
      return ["Fun fact: the first vada pav, sold outside Dadar station in the 1970s, cost 25 paise."];
    case "train":
      return ["The local is the one thing this city kept cheap. Same ticket, three decades."];
    case "onion":
      if ([1998, 2013, 2019].includes(year)) return ["This was a crisis year. Onion prices can bring down governments here, beta."];
      return ["Watch 1998, 2013 and 2019 on the chart. Onions have a temper."];
    case "auto":
      return ["Every fare hike is a government notice, so my numbers are the best-documented on this street."];
    case "petrol":
      return year >= 2021 ? ["Petrol crossed ₹100 a litre in Mumbai in 2021."] : [];
    case "chai":
      return ["Truth? Nobody wrote chai prices down. These are my best memory. Help me find a source!"];
    default:
      return [];
  }
}

function honesty(item: Item, year: number): string {
  const p = pointAt(item, year);
  if (p.kind === "interpolated") {
    const before = [...item.series].reverse().find((q) => q.kind === "anchor" && q.year < year);
    const after = item.series.find((q) => q.kind === "anchor" && q.year > year);
    return `Honest note: I have no record for exactly ${year}. This sits between my ${before?.year} and ${after?.year} figures.`;
  }
  if (p.confidence === "estimated") return `Honest note: the ${year} figure is an estimate. It still needs a printed source.`;
  const src = p.source_id ? data.sources[p.source_id] : null;
  return src ? `Source: ${src.publisher}${src.date ? `, ${src.date.slice(0, 4)}` : ""}.` : "Source on record.";
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
function fmtMin(m: number) {
  if (m < 1) return `${Math.round(m * 60)} seconds`;
  if (m < 90) return `${m < 10 ? m.toFixed(1) : Math.round(m)} minutes`;
  return `${(m / 60).toFixed(1)} hours`;
}
export { fmtMin };
