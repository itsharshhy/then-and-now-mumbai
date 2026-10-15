"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  answerQuestion,
  rejectQuestion,
  reviewQueue,
  reviewReport,
  unusual,
  type AnswerInput,
  type PendingQuestion,
  type PendingReport,
} from "@/lib/bazaar";
import { itemById, rupees } from "@/lib/data";

// The review queue. The key lives only in this tab's sessionStorage and is checked by the database on every call.
const KEY_STORE = "tnm-review-key";

export default function Review() {
  const [key, setKey] = useState("");
  const [draft, setDraft] = useState("");
  const [queue, setQueue] = useState<{ reports: PendingReport[]; questions: PendingQuestion[] } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async (k: string) => {
    setBusy(true);
    setError("");
    try {
      setQueue(await reviewQueue(k));
      setKey(k);
      try {
        sessionStorage.setItem(KEY_STORE, k);
      } catch {
        /* private mode: fine, just ask again next time */
      }
    } catch (e) {
      setError((e as Error).message);
      setKey("");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    try {
      const k = sessionStorage.getItem(KEY_STORE);
      if (k) void load(k);
    } catch {
      /* ignore */
    }
  }, []);

  const signOut = () => {
    try {
      sessionStorage.removeItem(KEY_STORE);
    } catch {
      /* ignore */
    }
    setKey("");
    setQueue(null);
  };

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      setQueue(await reviewQueue(key));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="bz">
      <header className="topbar">
        <h1>Then &amp; Now Mumbai</h1>
        <span className="who">Review queue</span>
        {key && (
          <button className="btn-analyst" onClick={signOut}>
            Lock
          </button>
        )}
        <Link href="/bazaar" className="btn-analyst">
          The bazaar
        </Link>
      </header>

      {!key ? (
        <section className="bz-panel bz-review-key">
          <h2>Review queue</h2>
          <p>Enter the review key to approve price reports and answer questions.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) void load(draft.trim());
            }}
          >
            <label htmlFor="rv-key">Review key</label>
            <div className="bz-ask-row">
              <input id="rv-key" type="password" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="current-password" />
              <button className="btn-go" type="submit" disabled={busy || !draft.trim()}>
                {busy ? "Checking…" : "Open"}
              </button>
            </div>
          </form>
          {error && (
            <p className="bz-error" role="alert">
              {error}
            </p>
          )}
        </section>
      ) : (
        <>
          {error && (
            <p className="bz-error bz-panel" role="alert">
              {error}
            </p>
          )}
          <section className="bz-section">
            <h2>Price reports ({queue?.reports.length ?? 0})</h2>
            {queue?.reports.length === 0 && <p className="bz-empty">Nothing waiting.</p>}
            <div className="rv-list">
              {queue?.reports.map((r) => {
                const it = itemById(r.item_id);
                const odd = unusual(r);
                return (
                  <article key={r.id} className="rv-card">
                    <h3>
                      {it.name}: {rupees(r.price)} <small>{it.unit}</small>
                    </h3>
                    <p>
                      Paid {r.paid_on}
                      {r.area ? ` in ${r.area}` : ""}. Sent {new Date(r.created_at).toLocaleString("en-IN")}.
                    </p>
                    {r.note && <p className="rv-note">&ldquo;{r.note}&rdquo;</p>}
                    {odd && <p className="rv-flag">Check this one: {odd}.</p>}
                    <div className="rv-actions">
                      <button className="btn-go" disabled={busy} onClick={() => act(() => reviewReport(key, r.id, true))}>
                        Approve
                      </button>
                      <button className="btn-ghost" disabled={busy} onClick={() => act(() => reviewReport(key, r.id, false))}>
                        Reject
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="bz-section">
            <h2>Questions ({queue?.questions.length ?? 0})</h2>
            {queue?.questions.length === 0 && <p className="bz-empty">Nothing waiting.</p>}
            <div className="rv-list">
              {queue?.questions.map((q) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  busy={busy}
                  onAnswer={(a) => act(() => answerQuestion(key, q.id, a))}
                  onReject={() => act(() => rejectQuestion(key, q.id))}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function QuestionCard({ q, busy, onAnswer, onReject }: { q: PendingQuestion; busy: boolean; onAnswer: (a: AnswerInput) => void; onReject: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ item_name: "", price: "", unit: "", year: "", place: "Mumbai", answer: "", source_title: "", source_url: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const price = Number(f.price);
  const year = Number(f.year);
  const valid = f.item_name.trim() && price > 0 && year >= 1850 && year <= 2100 && /^https?:\/\/\S+$/.test(f.source_url.trim());

  return (
    <article className="rv-card">
      <p className="bz-q">&ldquo;{q.question}&rdquo;</p>
      <p className="rv-meta">Asked {new Date(q.created_at).toLocaleString("en-IN")}</p>
      {!open ? (
        <div className="rv-actions">
          <button className="btn-go" onClick={() => setOpen(true)}>
            Answer with a source
          </button>
          <button className="btn-ghost" disabled={busy} onClick={onReject}>
            Reject
          </button>
        </div>
      ) : (
        <form
          className="bz-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            onAnswer({
              item_name: f.item_name.trim(),
              price,
              unit: f.unit.trim(),
              year,
              place: f.place.trim(),
              answer: f.answer.trim(),
              source_title: f.source_title.trim(),
              source_url: f.source_url.trim(),
            });
          }}
        >
          <div className="bz-row">
            <label className="bz-field">
              <span>Item</span>
              <input value={f.item_name} onChange={set("item_name")} maxLength={60} placeholder="Cinema ticket (single screen)" required />
            </label>
            <label className="bz-field">
              <span>Place</span>
              <input value={f.place} onChange={set("place")} maxLength={60} />
            </label>
          </div>
          <div className="bz-row">
            <label className="bz-field">
              <span>Price (₹)</span>
              <input inputMode="decimal" value={f.price} onChange={set("price")} required />
            </label>
            <label className="bz-field">
              <span>Unit</span>
              <input value={f.unit} onChange={set("unit")} maxLength={40} placeholder="per ticket, balcony" />
            </label>
            <label className="bz-field">
              <span>Year</span>
              <input inputMode="numeric" value={f.year} onChange={set("year")} maxLength={4} required />
            </label>
          </div>
          <label className="bz-field">
            <span>Short answer (optional)</span>
            <textarea value={f.answer} onChange={set("answer")} maxLength={600} rows={3} />
          </label>
          <div className="bz-row">
            <label className="bz-field">
              <span>Source title</span>
              <input value={f.source_title} onChange={set("source_title")} maxLength={160} placeholder="Times of India, 12 Mar 1998" />
            </label>
            <label className="bz-field">
              <span>Source link</span>
              <input type="url" value={f.source_url} onChange={set("source_url")} maxLength={500} placeholder="https://" required />
            </label>
          </div>
          <div className="rv-actions">
            <button className="btn-go" type="submit" disabled={busy || !valid}>
              Publish answer
            </button>
            <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
