"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FIRST_YEAR, LAST_YEAR, YEARS, data, itemById, pointAt, rupees, type Item, type Point } from "@/lib/data";
import { CARD_H, CARD_W, drawPostcard, shareOrDownload, type PostcardSpec } from "@/lib/postcard";
import { KEEPERS } from "@/lib/sprites";

const quality = (p: Point) =>
  p.kind === "interpolated" ? "between two records" : p.confidence === "estimated" ? "estimate, source wanted" : `${p.confidence} in a dated source`;

export function itemPostcard(item: Item, from: number, to: number): PostcardSpec {
  const a = pointAt(item, from);
  const b = pointAt(item, to);
  const mult = b.price / a.price;
  const real = (b.price_2026 / a.price_2026 - 1) * 100;
  const realText =
    Math.abs(real) < 3 ? "about the same in real terms" : `${Math.abs(Math.round(real))}% ${real > 0 ? "dearer" : "cheaper"} after inflation`;
  const keeper = KEEPERS[item.building];
  return {
    kicker: "Greetings from Mumbai",
    title: `${item.name}, ${item.unit}`,
    left: { label: String(from), value: rupees(a.price), note: quality(a) },
    right: { label: String(to), value: rupees(b.price), note: quality(b) },
    verdict: `${mult >= 1.05 ? `${mult.toFixed(1)}x the price` : mult <= 0.95 ? `${mult.toFixed(2)}x the price` : "Barely moved"}, ${realText}.`,
    footer: "THEN & NOW MUMBAI  ·  every price sourced or flagged",
    sprite: keeper ? { grid: keeper.grid, palette: keeper.palette } : undefined,
  };
}

const clampYear = (v: string | null, fallback: number) => {
  const n = Number(v);
  return YEARS.includes(n) ? n : fallback;
};

export default function Postcard() {
  const params = useSearchParams();
  const [itemId, setItemId] = useState(() => (data.items.some((i) => i.id === params.get("item")) ? params.get("item")! : "vadapav"));
  const [[from, to], setYears] = useState(() => {
    const f = clampYear(params.get("from"), FIRST_YEAR);
    const t = clampYear(params.get("to"), LAST_YEAR);
    return f < t ? [f, t] : [FIRST_YEAR, LAST_YEAR];
  });
  const setFrom = (f: number) => setYears([f, to]);
  const setTo = (t: number) => setYears([from, t]);
  const [status, setStatus] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const item = itemById(itemId);
  const spec = itemPostcard(item, from, to);

  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => live && canvas.current && drawPostcard(canvas.current, spec));
    const q = new URLSearchParams({ item: itemId, from: String(from), to: String(to) });
    window.history.replaceState(null, "", `?${q}`);
    return () => {
      live = false;
    };
    // spec is derived from these three
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, from, to]);

  const share = async () => {
    if (!canvas.current) return;
    const result = await shareOrDownload(canvas.current, `mumbai-${itemId}-${from}-${to}.png`, `${spec.title}: ${spec.left.value} in ${from}, ${spec.right.value} in ${to}.`, window.location.href);
    setStatus(result === "shared" ? "Shared." : result === "downloaded" ? "Postcard saved as a PNG." : "");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy failed. The link is in your address bar.");
    }
  };

  return (
    <main className="pc">
      <header className="topbar">
        <h1>Then &amp; Now Mumbai</h1>
        <span className="who">Price postcards</span>
        <Link href="/" className="btn-analyst">
          Back to the street
        </Link>
      </header>

      <div className="pc-body">
        <div className="pc-controls">
          <h2>Make a price postcard</h2>
          <p>Pick something from the street and two years. The card shows both prices, what changed after inflation, and how good each number is.</p>
          <label htmlFor="pc-item">Item</label>
          <select id="pc-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {data.items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.unit})
              </option>
            ))}
          </select>
          <div className="pc-years">
            <div>
              <label htmlFor="pc-from">From</label>
              <select id="pc-from" value={from} onChange={(e) => setFrom(Number(e.target.value))}>
                {YEARS.filter((y) => y < to).map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pc-to">To</label>
              <select id="pc-to" value={to} onChange={(e) => setTo(Number(e.target.value))}>
                {YEARS.filter((y) => y > from).map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="pc-actions">
            <button className="btn-go" onClick={share}>
              Share postcard
            </button>
            <button className="btn-ghost" onClick={copy}>
              Copy link
            </button>
          </div>
          <p className="pc-status" aria-live="polite">
            {status}
          </p>
          <p className="pc-more">
            Want the method? <Link href="/analyst">Read Analyst Mode</Link>. Or <Link href="/survive">try to survive a month</Link> in {from}.
          </p>
        </div>

        <figure className="pc-preview">
          <canvas
            ref={canvas}
            width={CARD_W}
            height={CARD_H}
            role="img"
            aria-label={`Postcard: ${spec.title}. ${spec.left.label}: ${spec.left.value}. ${spec.right.label}: ${spec.right.value}. ${spec.verdict}`}
          />
          <figcaption>1200 × 630 PNG, sized for link previews and chat apps.</figcaption>
        </figure>
      </div>
    </main>
  );
}

/** For next/link, which adds the base path itself. */
export const postcardHref = (item: string, from: number, to: number) => `/postcard/?item=${item}&from=${from}&to=${to}`;
