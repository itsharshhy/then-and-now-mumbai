"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  askQuestion,
  datasetPrice,
  fetchAnswers,
  fetchReports,
  matchDataset,
  similarAnswers,
  submitReport,
  summarise,
  yearInData,
  type Answer,
  type DatasetMatch,
  type Report,
} from "@/lib/bazaar";
import { BUILDINGS, FIRST_YEAR, LAST_YEAR, data, itemById, rupees } from "@/lib/data";
import { KEEPERS } from "@/lib/sprites";
import { supabaseConfigured } from "@/lib/supabase";
import Pixel from "./Pixel";
import { postcardHref } from "./Postcard";

type Tab = "ask" | "report";

const CONF_LABEL: Record<string, string> = {
  documented: "documented in an official record",
  reported: "reported in a dated news source",
  estimated: "an estimate that still needs a source",
  interpolated: "filled in between two records",
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const fmtDate = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function Bazaar() {
  const [tab, setTab] = useState<Tab>("ask");
  const [reportItem, setReportItem] = useState("vadapav");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get("report");
    if (r && data.items.some((i) => i.id === r)) {
      setReportItem(r);
      setTab("report");
    }
    if (!supabaseConfigured()) {
      setLoadError("The bazaar isn't connected on this copy of the site.");
      return;
    }
    Promise.all([fetchReports(), fetchAnswers()])
      .then(([rs, as]) => {
        setReports(rs);
        setAnswers(as);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  const summaries = useMemo(() => (reports ? summarise(reports) : []), [reports]);

  return (
    <main className="bz">
      <header className="topbar">
        <h1>Then &amp; Now Mumbai</h1>
        <span className="who">The bazaar</span>
        <Link href="/play" className="btn-analyst">
          Back to the street
        </Link>
      </header>

      <section className="bz-hero">
        <div className="bz-hero-keeper" aria-hidden>
          <Pixel grid={KEEPERS.kirana.grid} palette={KEEPERS.kirana.palette} size={7} />
        </div>
        <div>
          <h2>The bazaar</h2>
          <p>
            Ask what anything cost in Mumbai, or tell us what you paid this week. {BUILDINGS.kirana.keeper} checks every report and every answer before it
            goes up, and every answer comes with a source.
          </p>
        </div>
      </section>

      <div className="bz-tabs" role="tablist" aria-label="Bazaar">
        <button role="tab" aria-selected={tab === "ask"} className={tab === "ask" ? "on" : ""} onClick={() => setTab("ask")}>
          Ask the bazaar
        </button>
        <button role="tab" aria-selected={tab === "report"} className={tab === "report" ? "on" : ""} onClick={() => setTab("report")}>
          Report a price
        </button>
      </div>

      {tab === "ask" ? <Ask answers={answers ?? []} /> : <ReportForm item={reportItem} setItem={setReportItem} />}

      <section className="bz-section" aria-labelledby="bz-live">
        <h2 id="bz-live">Live from the street</h2>
        <p className="bz-intro">
          What players paid in the last 90 days, after review. These are kept apart from the sourced dataset: a handful of reports is a signal, not a
          record.
        </p>
        {loadError ? (
          <p className="bz-empty">{loadError}</p>
        ) : !reports ? (
          <p className="bz-empty">Loading reports…</p>
        ) : summaries.length === 0 ? (
          <p className="bz-empty">
            No reviewed reports yet. <button className="link" onClick={() => setTab("report")}>Be the first to report a price.</button>
          </p>
        ) : (
          <div className="bz-live">
            {summaries.map((s) => (
              <article key={s.item.id} className="bz-live-card">
                <h3>{s.item.name}</h3>
                <p className="bz-live-price">
                  {rupees(s.median)} <small>median, {s.item.unit}</small>
                </p>
                <p>
                  {s.count} report{s.count === 1 ? "" : "s"}, {s.count > 1 ? `${rupees(s.low)}–${rupees(s.high)}, ` : ""}latest {fmtDate(s.latest)}
                </p>
                <p className="bz-live-vs">
                  Dataset {LAST_YEAR}: {rupees(s.datasetNow)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bz-section" aria-labelledby="bz-answered">
        <h2 id="bz-answered">Answered by the bazaar</h2>
        {loadError ? null : !answers ? (
          <p className="bz-empty">Loading answers…</p>
        ) : answers.length === 0 ? (
          <p className="bz-empty">No questions answered yet. Ask one above: once it&apos;s answered with a source, it shows up here.</p>
        ) : (
          <div className="bz-answers">
            {answers.map((a) => (
              <AnswerCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// ------------------------------------------------------------------ ask
function Ask({ answers }: { answers: Answer[] }) {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");
  const [sent, setSent] = useState<"" | "sending" | "sent">("");
  const [error, setError] = useState("");

  const matches = useMemo(() => (asked ? matchDataset(asked) : []), [asked]);
  const similar = useMemo(() => (asked ? similarAnswers(asked, answers) : []), [asked, answers]);

  const send = async () => {
    setSent("sending");
    setError("");
    try {
      await askQuestion(asked);
      setSent("sent");
    } catch (e) {
      setSent("");
      setError((e as Error).message);
    }
  };

  return (
    <section className="bz-panel" aria-label="Ask the bazaar">
      <form
        className="bz-ask"
        onSubmit={(e) => {
          e.preventDefault();
          const t = q.trim().replace(/\s+/g, " ");
          if (t.length < 5) return;
          setAsked(t);
          setSent("");
          setError("");
        }}
      >
        <label htmlFor="bz-q">What do you want to know?</label>
        <div className="bz-ask-row">
          <input
            id="bz-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={200}
            placeholder="e.g. What did a cinema ticket cost in 1998?"
            autoComplete="off"
          />
          <button className="btn-go" type="submit" disabled={q.trim().length < 5}>
            Ask
          </button>
        </div>
      </form>

      {asked && (
        <div className="bz-results" aria-live="polite">
          {matches.map((m) => (
            <DatasetAnswer key={m.item.id} m={m} />
          ))}
          {similar.map((a) => (
            <AnswerCard key={a.id} a={a} />
          ))}

          {matches.length === 0 && similar.length === 0 && (
            <p className="bz-none">The bazaar doesn&apos;t have a sourced answer for that yet.</p>
          )}

          <div className="bz-send">
            {sent === "sent" ? (
              <p>
                <b>Sent.</b> Your question is in the review queue. When someone answers it with a source, it will appear under &ldquo;Answered by the
                bazaar&rdquo;.
              </p>
            ) : (
              <>
                <p>
                  {matches.length || similar.length ? "Not quite what you asked?" : "Want a real answer?"} Send it to the bazaar. Nothing is published
                  until it has a price, a year and a source.
                </p>
                <button className="btn-ghost" onClick={send} disabled={sent === "sending"}>
                  {sent === "sending" ? "Sending…" : "Send to the bazaar"}
                </button>
              </>
            )}
            {error && (
              <p className="bz-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function DatasetAnswer({ m }: { m: DatasetMatch }) {
  const { item, year } = m;
  const first = item.series[0];
  const last = item.series.at(-1)!;
  const p = yearInData(year) ? datasetPrice(item, year) : null;
  const src = p?.source_id ? data.sources[p.source_id] : null;
  return (
    <article className="bz-answer bz-answer-data">
      <span className="bz-tag">From the dataset</span>
      {p ? (
        <>
          <h3>
            {item.name} in {year}: {rupees(p.price)} <small>{item.unit}</small>
          </h3>
          <p>
            That figure is {CONF_LABEL[p.confidence]}. In today&apos;s money it&apos;s about {rupees(p.price_2026)}.
          </p>
          {src && (
            <p className="bz-source">
              Source:{" "}
              <a href={src.url} target="_blank" rel="noreferrer">
                {src.publisher}
                {src.date ? `, ${src.date.slice(0, 4)}` : ""}
              </a>
            </p>
          )}
        </>
      ) : (
        <>
          <h3>
            {item.name}: {rupees(first.price)} in {FIRST_YEAR}, {rupees(last.price)} in {LAST_YEAR} <small>{item.unit}</small>
          </h3>
          <p>
            {year !== null
              ? `The dataset covers ${FIRST_YEAR} to ${LAST_YEAR}, so it can't say for ${year}. Send the question below and the bazaar will look for a source.`
              : "Add a year to your question for that year's price."}
          </p>
        </>
      )}
      <p className="bz-links">
        <Link href={postcardHref(item.id, FIRST_YEAR, p ? Math.max(year!, FIRST_YEAR + 1) : LAST_YEAR)}>Make a postcard</Link>
        <Link href="/analyst">See the full series</Link>
      </p>
    </article>
  );
}

function AnswerCard({ a }: { a: Answer }) {
  let host = "";
  try {
    host = new URL(a.source_url).hostname.replace(/^www\./, "");
  } catch {
    /* validated server-side; keep the card even if the URL is odd */
  }
  return (
    <article className="bz-answer">
      <span className="bz-tag bz-tag-community">Answered by the bazaar, reviewed</span>
      <p className="bz-q">&ldquo;{a.question}&rdquo;</p>
      <h3>
        {a.item_name}
        {a.place ? `, ${a.place}` : ""}, {a.year}: {rupees(a.price)} {a.unit && <small>{a.unit}</small>}
      </h3>
      {a.answer && <p>{a.answer}</p>}
      <p className="bz-source">
        Source:{" "}
        <a href={a.source_url} target="_blank" rel="noreferrer nofollow ugc">
          {a.source_title || host || "link"}
        </a>
        {a.source_title && host ? ` (${host})` : ""}
      </p>
    </article>
  );
}

// ------------------------------------------------------------------ report
function ReportForm({ item, setItem }: { item: string; setItem: (s: string) => void }) {
  const today = new Date();
  const [price, setPrice] = useState("");
  const [paidOn, setPaidOn] = useState(isoDay(today));
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"" | "sending" | "sent">("");
  const [error, setError] = useState("");
  const it = itemById(item);
  const n = Number(price);
  const valid = Number.isFinite(n) && n > 0 && n < 100000;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setState("sending");
    setError("");
    try {
      await submitReport({ item_id: item, price: Math.round(n * 100) / 100, paid_on: paidOn, area: area.trim() || null, note: note.trim() || null });
      setState("sent");
    } catch (err) {
      setState("");
      setError((err as Error).message);
    }
  };

  if (state === "sent")
    return (
      <section className="bz-panel" aria-live="polite">
        <h3 className="bz-thanks">Thank you. Your report is in the review queue.</h3>
        <p>Once it&apos;s checked it counts towards &ldquo;Live from the street&rdquo; below and in the {BUILDINGS[it.building].name.toLowerCase()}.</p>
        <button
          className="btn-ghost"
          onClick={() => {
            setState("");
            setPrice("");
            setNote("");
          }}
        >
          Report another price
        </button>
      </section>
    );

  return (
    <section className="bz-panel" aria-label="Report a price">
      <form className="bz-form" onSubmit={submit}>
        <div className="bz-field">
          <label htmlFor="bz-item">What did you buy?</label>
          <select id="bz-item" value={item} onChange={(e) => setItem(e.target.value)}>
            {data.items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.unit})
              </option>
            ))}
          </select>
        </div>
        <div className="bz-row">
          <div className="bz-field">
            <label htmlFor="bz-price">What you paid (₹, {it.unit})</label>
            <input id="bz-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder={String(datasetPrice(it, LAST_YEAR).price)} required />
          </div>
          <div className="bz-field">
            <label htmlFor="bz-date">When</label>
            <input id="bz-date" type="date" value={paidOn} max={isoDay(today)} min={isoDay(new Date(today.getTime() - 729 * 864e5))} onChange={(e) => setPaidOn(e.target.value)} required />
          </div>
        </div>
        <div className="bz-field">
          <label htmlFor="bz-area">Where (optional)</label>
          <input id="bz-area" value={area} onChange={(e) => setArea(e.target.value)} maxLength={40} placeholder="Neighbourhood, e.g. Dadar West" autoComplete="off" />
        </div>
        <div className="bz-field">
          <label htmlFor="bz-note">Anything else? (optional)</label>
          <input id="bz-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="e.g. Butter vada pav, or station stall" autoComplete="off" />
        </div>
        <p className="bz-fine">Please don&apos;t include names, phone numbers or anything personal. Reports are published without any details about you.</p>
        <button className="btn-go" type="submit" disabled={!valid || state === "sending"}>
          {state === "sending" ? "Sending…" : "Send report"}
        </button>
        {error && (
          <p className="bz-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
