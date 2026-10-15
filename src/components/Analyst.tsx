"use client";

import Link from "next/link";
import { useState } from "react";
import { data, rupees, type Item } from "@/lib/data";
import { fmtMin } from "@/lib/story";
import LineChart from "./LineChart";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const sorted = [...data.items].sort((a, b) => b.summary.real_change_pct - a.summary.real_change_pct);
const m95 = data.macro[0];
const m26 = data.macro[data.macro.length - 1];
const cpiMultiple = 100 / m95.cpi_index;
const incomeMultiple = m26.income_monthly / m95.income_monthly;

function RealChangeBars() {
  const W = 640;
  const row = 34;
  const H = sorted.length * row + 30;
  const L = 170;
  const max = Math.max(...sorted.map((i) => Math.abs(i.summary.real_change_pct)));
  const span = Math.ceil(max / 25) * 25 + 25; // headroom so value labels never hit the row names
  const zero = L + (W - L - 60) / 2;
  const sx = (v: number) => zero + (v / span) * ((W - L - 60) / 2);
  return (
    <figure className="fig">
      <figcaption>Change in real price, 1995 to 2026 (prices restated in 2026 rupees)</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Real price change by item, 1995 to 2026">
        {[-span, -span / 2, 0, span / 2, span].map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={6} y2={H - 22} className={t === 0 ? "lc-base" : "lc-grid"} />
            <text x={sx(t)} y={H - 6} textAnchor="middle" className="lc-tick">
              {t > 0 ? "+" : ""}
              {t}%
            </text>
          </g>
        ))}
        {sorted.map((it, i) => {
          const v = it.summary.real_change_pct;
          const y = 10 + i * row;
          const x = Math.min(sx(0), sx(v));
          const w = Math.abs(sx(v) - sx(0));
          return (
            <g key={it.id}>
              <text x={L - 12} y={y + 15} textAnchor="end" className="bar-label">
                {it.name}
              </text>
              <rect x={x} y={y + 4} width={Math.max(w, 1)} height={16} rx={3} fill={v >= 0 ? "var(--pole-up)" : "var(--pole-down)"}>
                <title>{`${it.name}: ${v > 0 ? "+" : ""}${v}% in real terms`}</title>
              </rect>
              <text x={v >= 0 ? sx(v) + 6 : sx(v) - 6} y={y + 16} textAnchor={v >= 0 ? "start" : "end"} className="bar-value">
                {v > 0 ? "+" : ""}
                {v}%
              </text>
            </g>
          );
        })}
      </svg>
      <p className="fig-note">
        Right of zero: rose faster than general inflation. Left of zero: got cheaper in real terms. Prices across the economy rose about{" "}
        {cpiMultiple.toFixed(1)}x over the period.
      </p>
    </figure>
  );
}

function WorkDumbbell() {
  const W = 640;
  const row = 34;
  const items = [...data.items].sort((a, b) => b.summary.minutes_1995 - a.summary.minutes_1995);
  const H = items.length * row + 30;
  const L = 170;
  const max = Math.ceil(Math.max(...items.map((i) => i.summary.minutes_1995)) / 60) * 60;
  const sx = (v: number) => L + (v / max) * (W - L - 170);
  const ticks = Array.from({ length: max / 60 + 1 }, (_, i) => i * 60);
  return (
    <figure className="fig">
      <figcaption>Minutes of paid work needed to buy one unit, 1995 and 2026</figcaption>
      <div className="lc-legend" aria-hidden>
        <span>
          <i style={{ background: "var(--muted)" }} />
          1995
        </span>
        <span>
          <i style={{ background: "var(--series-1)" }} />
          2026
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Minutes of work per item, 1995 versus 2026">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={6} y2={H - 22} className={t === 0 ? "lc-base" : "lc-grid"} />
            <text x={sx(t)} y={H - 6} textAnchor="middle" className="lc-tick">
              {t === 0 ? "0" : `${t / 60}h`}
            </text>
          </g>
        ))}
        {items.map((it, i) => {
          const y = 22 + i * row;
          const a = sx(it.summary.minutes_1995);
          const b = sx(it.summary.minutes_2026);
          return (
            <g key={it.id}>
              <text x={L - 12} y={y + 4} textAnchor="end" className="bar-label">
                {it.name}
              </text>
              <line x1={b} x2={a} y1={y} y2={y} stroke="var(--grid-strong)" strokeWidth={2} />
              <circle cx={a} cy={y} r={5} fill="var(--muted)" stroke="var(--surface)" strokeWidth={2}>
                <title>{`${it.name}, 1995: ${fmtMin(it.summary.minutes_1995)}`}</title>
              </circle>
              <circle cx={b} cy={y} r={5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2}>
                <title>{`${it.name}, 2026: ${fmtMin(it.summary.minutes_2026)}`}</title>
              </circle>
              <text x={a + 10} y={y + 4} className="bar-value">
                {fmtMin(it.summary.minutes_1995)} → {fmtMin(it.summary.minutes_2026)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="fig-note">
        Uses Maharashtra&apos;s average per capita income as the wage. That average grew about {incomeMultiple.toFixed(0)}x and is pulled up by high
        earners, so a daily-wage worker&apos;s story is far less rosy. See the caveats below.
      </p>
    </figure>
  );
}

function SmallMultiple({ item }: { item: Item }) {
  const [real, setReal] = useState(false);
  const series = [
    {
      id: "nominal",
      label: "Price paid",
      color: "var(--series-1)",
      anchors: true,
      points: item.series.map((p) => ({ x: p.year, y: p.price, confidence: p.confidence })),
    },
    {
      id: "real",
      label: "In 2026 ₹",
      color: "var(--series-2)",
      points: item.series.map((p) => ({ x: p.year, y: p.price_2026 })),
    },
  ];
  const s = item.summary;
  return (
    <article className="sm">
      <header>
        <h3>{item.name}</h3>
        <span>{item.unit}</span>
      </header>
      <p className="sm-line">
        {rupees(item.series[0].price)} in 1995, {rupees(item.series[item.series.length - 1].price)} in 2026: {s.nominal_multiple}x, or{" "}
        {s.cagr_pct}% a year.
      </p>
      <LineChart series={series} format={(v) => rupees(v)} height={190} />
      <p className="sm-quality">
        {s.anchor_counts.reported + s.anchor_counts.documented} sourced points, {s.anchor_counts.estimated} estimates
        <button className="link" onClick={() => setReal(!real)} aria-expanded={real}>
          {real ? "Hide notes" : "Show notes"}
        </button>
      </p>
      {real && (
        <ul className="sm-notes">
          {item.series
            .filter((p) => p.kind === "anchor")
            .map((p) => (
              <li key={p.year}>
                <b>{p.year}</b> {rupees(p.price)} <span className={`conf conf-${p.confidence}`}>{p.confidence}</span>
                {p.note ? ` ${p.note}` : ""}
                {p.source_id && (
                  <>
                    {" "}
                    <a href={data.sources[p.source_id].url} target="_blank" rel="noreferrer">
                      source
                    </a>
                  </>
                )}
              </li>
            ))}
        </ul>
      )}
    </article>
  );
}

export default function Analyst() {
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const totals = data.items.reduce(
    (a, i) => ({
      sourced: a.sourced + i.summary.anchor_counts.reported + i.summary.anchor_counts.documented,
      est: a.est + i.summary.anchor_counts.estimated,
    }),
    { sourced: 0, est: 0 },
  );

  return (
    <main className="analyst">
      <nav className="an-nav">
        <Link href="/">Back to the street</Link>
        <span>
          <a href={`${base}/data/mumbai_prices_1995_2026.csv`} download>
            Download CSV
          </a>
          <a href={`${base}/data/series.json`} download>
            Download JSON
          </a>
        </span>
      </nav>

      <header className="an-head">
        <h1>What a Mumbai street cost, 1995 to 2026</h1>
        <p>
          Seven everyday prices from one imagined street: tea, vada pav, the local train, autos, petrol, onions and milk. Each is compared three ways:
          the rupees paid, the same price in 2026 rupees, and the minutes of work it took to afford.
        </p>
      </header>

      <section className="findings" aria-label="Key findings">
        <p>
          <strong>{top.name} outran inflation.</strong> It rose {top.summary.nominal_multiple}x while general prices rose {cpiMultiple.toFixed(1)}x, a
          real increase of {top.summary.real_change_pct}%.
        </p>
        <p>
          <strong>The {bottom.name.toLowerCase()} got {Math.abs(bottom.summary.real_change_pct)}% cheaper in real terms.</strong> The minimum fare
          moved from about ₹3 to ₹5 in three decades.
        </p>
        <p>
          <strong>Onions are the volatile one.</strong> Retail prices spiked in 1998, 2013 and 2019, when Mumbai shoppers paid up to ₹140 a kilo.
        </p>
      </section>

      <section className="an-section">
        <h2>Did it beat inflation?</h2>
        <RealChangeBars />
      </section>

      <section className="an-section">
        <h2>How long you work to buy it</h2>
        <WorkDumbbell />
      </section>

      <section className="an-section">
        <h2>Item by item</h2>
        <p className="an-intro">
          Blue is what people actually paid. Orange restates every year&apos;s price in 2026 rupees, so a flat orange line means the item only kept pace
          with inflation. Filled dots are figures from a dated source; hollow dots are estimates still waiting for one.
        </p>
        <div className="sm-grid">
          {data.items.map((it) => (
            <SmallMultiple key={it.id} item={it} />
          ))}
        </div>
      </section>

      <section className="an-section an-method">
        <h2>Method and caveats</h2>
        <h3>Where the numbers come from</h3>
        <p>
          Street prices like chai and vada pav were never published as a series. Each item is built from anchor years: a price stated in a dated news
          report, or, where none was found yet, an estimate. Right now the dataset has {totals.sourced} sourced anchors and {totals.est} estimates. Every
          anchor carries its confidence level in the CSV.
        </p>
        <h3>Filling the gaps</h3>
        <p>
          Years between anchors are filled by log-linear interpolation, which assumes a steady percentage change. Those years are marked
          &ldquo;interpolated&rdquo; and the shopkeepers say so out loud. Real spikes between anchors, like a one-month onion shock, are invisible unless an
          anchor captures them.
        </p>
        <h3>Inflation adjustment</h3>
        <p>
          Prices are restated in 2026 rupees using India&apos;s annual consumer price inflation (World Bank). That is a national index; Mumbai&apos;s own
          cost of living, especially rent, rose faster. 2025 and 2026 inflation are estimates.
        </p>
        <h3>Minutes of work</h3>
        <p>
          Wage = Maharashtra per capita state income ÷ 12 months ÷ {data.meta.work_hours_per_month} working hours. Per capita income is an average across
          all residents and is skewed by high earners, so these minutes understate the burden for most households. The income anchors are themselves
          estimates pending verification against the Economic Survey of Maharashtra. A better wage series (minimum wage, or PLFS earnings) is planned.
        </p>
        <h3>What&apos;s next</h3>
        <p>
          Replace every hollow dot with a sourced figure: newspaper archives, Railway Board fare notifications, RTA fare charts and the Department of
          Consumer Affairs daily retail prices for Mumbai.
        </p>
      </section>

      <section className="an-section">
        <h2>Sources</h2>
        <ol className="sources">
          {Object.values(data.sources).map((s) => (
            <li key={s.source_id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>
              <span>
                {" "}
                {s.publisher}
                {s.date ? `, ${s.date}` : ""}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="an-foot">
        Data built {data.meta.generated} by <code>scripts/build_data.py</code>. Spotted a wrong price, or have an old receipt? Open an issue on GitHub.
      </footer>
    </main>
  );
}
