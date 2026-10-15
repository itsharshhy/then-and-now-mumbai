"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BUILDINGS, FIRST_YEAR, LAST_YEAR, data, itemsFor, pointAt, rupees, type BuildingId } from "@/lib/data";
import { KEEPERS } from "@/lib/sprites";
import { fmtMin, storyFor } from "@/lib/story";
import LineChart from "./LineChart";
import Pixel from "./Pixel";
import { postcardHref } from "./Postcard";
import { ShopReports } from "./LiveReports";

type Mode = "price" | "real" | "work";
const MODES: { id: Mode; label: string }[] = [
  { id: "price", label: "Price then" },
  { id: "real", label: "In 2026 ₹" },
  { id: "work", label: "Minutes of work" },
];

export default function ShopPanel({ building, year, onClose }: { building: BuildingId; year: number; onClose: () => void }) {
  const items = itemsFor(building);
  const [itemIdx, setItemIdx] = useState(0);
  const item = items[Math.min(itemIdx, items.length - 1)];
  const [mode, setMode] = useState<Mode>("price");
  const lines = useMemo(() => storyFor(item, year), [item, year]);
  const [line, setLine] = useState(0);
  const [shown, setShown] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const b = BUILDINGS[building];
  const keeper = KEEPERS[building];

  useEffect(() => {
    setLine(0);
    setShown(0);
  }, [item, year]);

  // typewriter
  useEffect(() => {
    const text = lines[line] ?? "";
    if (shown >= text.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(text.length);
      return;
    }
    const t = setTimeout(() => setShown((s) => s + 2), 18);
    return () => clearTimeout(t);
  }, [shown, line, lines]);

  const advance = () => {
    const text = lines[line];
    if (shown < text.length) setShown(text.length);
    else if (line < lines.length - 1) {
      setLine(line + 1);
      setShown(0);
    }
  };

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement)?.dataset?.dialogue !== undefined) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const p = pointAt(item, year);
  const series = [
    {
      id: item.id,
      label: item.name,
      color: "var(--series-1)",
      anchors: true,
      points: item.series.map((q) => ({
        x: q.year,
        y: mode === "price" ? q.price : mode === "real" ? q.price_2026 : q.minutes_of_work,
        confidence: q.confidence,
        note: q.note,
      })),
    },
  ];
  const format = mode === "work" ? (v: number) => (v >= 90 ? `${Math.round(v / 60)}h` : `${Math.round(v)}m`) : (v: number) => rupees(v);
  const anchors = item.series.filter((q) => q.kind === "anchor");
  const sources = [...new Set(anchors.map((q) => q.source_id).filter(Boolean))].map((id) => data.sources[id!]);
  const text = lines[line] ?? "";
  const done = shown >= text.length && line === lines.length - 1;

  return (
    <div className="shop-backdrop" onClick={onClose}>
      <section className="shop" role="dialog" aria-modal="true" aria-labelledby="shop-title" onClick={(e) => e.stopPropagation()}>
        <header className="shop-sign">
          <h2 id="shop-title">{b.name}</h2>
          <span className="shop-year">{year}</span>
          <button ref={closeRef} className="shop-close" onClick={onClose} aria-label="Leave the shop">
            Leave
          </button>
        </header>

        {items.length > 1 && (
          <div className="shop-items" role="tablist" aria-label="What this shop sells">
            {items.map((it, i) => (
              <button key={it.id} role="tab" aria-selected={i === itemIdx} className={i === itemIdx ? "on" : ""} onClick={() => setItemIdx(i)}>
                {it.name} <b>{rupees(pointAt(it, year).price)}</b>
              </button>
            ))}
          </div>
        )}

        <div className="shop-body">
          <div className="shop-chart">
            <div className="shop-figures">
              <div>
                <span>{year} price</span>
                <strong>{rupees(p.price)}</strong>
                <small>{item.unit}</small>
              </div>
              <div>
                <span>In 2026 rupees</span>
                <strong>{rupees(p.price_2026)}</strong>
                <small>inflation-adjusted</small>
              </div>
              <div>
                <span>Work to afford it</span>
                <strong>{fmtMin(p.minutes_of_work)}</strong>
                <small>at average income</small>
              </div>
            </div>
            <div className="seg" role="radiogroup" aria-label="Chart measure">
              {MODES.map((m) => (
                <button key={m.id} role="radio" aria-checked={mode === m.id} className={mode === m.id ? "on" : ""} onClick={() => setMode(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
            <LineChart series={series} format={format} markerX={year} height={210} title={`${item.name}, ${item.unit}, 1995–2026`} />
            <ShopReports item={item} />
            <p className="shop-legend">
              <span className="dot solid" /> reported in a dated source <span className="dot hollow" /> estimate, source wanted
            </p>
          </div>

          <div className="dialogue" tabIndex={0} data-dialogue onClick={advance} aria-live="polite">
            <div className="portrait">
              <Pixel grid={keeper.grid} palette={keeper.palette} size={6} label={b.keeper} />
              <span>{b.keeper}</span>
            </div>
            <div className="dialogue-log">
              {lines.slice(0, line).map((l, i) => (
                <p key={i} className="past">
                  {l}
                </p>
              ))}
            </div>
            <p>
              {text.slice(0, shown)}
              <span className="caret" aria-hidden>
                {done ? "" : "▼"}
              </span>
            </p>
            <div className="dialogue-nav">
              <span>
                {line + 1}/{lines.length}
              </span>
              {!done ? <span>Click or press Enter</span> : <span>Esc to leave</span>}
            </div>
          </div>
        </div>

        <footer className="shop-sources">
          <Link className="shop-postcard" href={postcardHref(item.id, FIRST_YEAR, year === FIRST_YEAR ? LAST_YEAR : year)}>
            Make a postcard
          </Link>
          {sources.length > 0 && <>
            Sources:{" "}
            {sources.map((s, i) => (
              <span key={s.source_id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.publisher}
                  {s.date ? ` (${s.date.slice(0, 4)})` : ""}
                </a>
                {i < sources.length - 1 ? ", " : ""}
              </span>
            ))}
          </>}
        </footer>
      </section>
    </div>
  );
}
