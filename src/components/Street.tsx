"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { bus } from "@/lib/bus";
import { BUILDINGS, FIRST_YEAR, LAST_YEAR, itemById, pointAt, rupees, type BuildingId } from "@/lib/data";
import { PLAYER_FRAMES, SHIRTS, playerPalette } from "@/lib/sprites";
import GameCanvas from "./GameCanvas";
import Pixel from "./Pixel";
import ShopPanel from "./ShopPanel";

const ERA: [number, string][] = [
  [1995, "Mill chimneys still smoke. Padmini taxis everywhere."],
  [2004, "The mills are gone. Something is being built."],
  [2009, "A glass mall now stands where the market was."],
  [2014, "Metro Line 1 now runs above the street (opened 2014)."],
  [2021, "Petrol crosses ₹100 a litre."],
  [2023, "The last Padmini taxis retire. Towers on every horizon."],
];

export default function Street() {
  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [shirt, setShirt] = useState(SHIRTS[0]);
  const [year, setYear] = useState(LAST_YEAR);
  const [open, setOpen] = useState<BuildingId | null>(null);
  const [near, setNear] = useState<BuildingId | null>(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const offs = [bus.on("enter", (id: BuildingId) => setOpen(id)), bus.on("near", (id: BuildingId | null) => setNear(id))];
    return () => offs.forEach((o) => o());
  }, []);

  useEffect(() => bus.emit("year", year), [year]);
  useEffect(() => bus.emit("pause", !!open), [open]);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
  }, []);

  const play = () => {
    if (playing) return stop();
    setPlaying(true);
    setYear((y) => (y >= LAST_YEAR ? FIRST_YEAR : y));
    timer.current = setInterval(() => {
      setYear((y) => {
        if (y >= LAST_YEAR) {
          stop();
          return y;
        }
        return y + 1;
      });
    }, 550);
  };
  useEffect(() => stop, [stop]);

  const era = [...ERA].reverse().find(([y]) => year >= y)?.[1];
  const vada = pointAt(itemById("vadapav"), year).price;

  if (!started) {
    return (
      <main className="start">
        <div className="start-card">
          <h1>Then &amp; Now Mumbai</h1>
          <p className="start-lede">
            One street, thirty-one years of prices. Walk into a shop, ask what things cost, and drag the Time Machine to watch Mumbai change around you.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              bus.emit("player", { name, shirt });
              setStarted(true);
            }}
          >
            <div className="start-row">
              <div className="start-preview">
                <Pixel grid={PLAYER_FRAMES[0]} palette={playerPalette(shirt)} size={8} label="Your character" />
              </div>
              <div className="start-fields">
                <label htmlFor="pname">Your name</label>
                <input id="pname" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="Mumbaikar" autoComplete="off" />
                <fieldset>
                  <legend>Shirt</legend>
                  <div className="swatches">
                    {SHIRTS.map((s) => (
                      <button
                        type="button"
                        key={s}
                        aria-label={`Shirt colour ${s}`}
                        aria-pressed={shirt === s}
                        className={shirt === s ? "on" : ""}
                        style={{ background: s }}
                        onClick={() => setShirt(s)}
                      />
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>
            <button className="btn-go" type="submit">
              Step onto the street
            </button>
          </form>
          <p className="start-help">Arrow keys or A/D to walk. E to enter a shop. On a phone, use the buttons under the street.</p>
          <p className="start-more">
            <Link href="/survive">Can you survive a month in 1995?</Link>
            <Link href="/postcard">Make a price postcard</Link>
            <Link href="/analyst">Skip the game and read the analysis</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="street">
      <header className="topbar">
        <h1>Then &amp; Now Mumbai</h1>
        <span className="who">{name || "Mumbaikar"}</span>
        <nav className="topbar-links">
          <Link href="/survive" className="btn-analyst">
            Survive the month
          </Link>
          <Link href="/analyst" className="btn-analyst">
            Analyst Mode
          </Link>
        </nav>
      </header>

      <div className="stage">
        <GameCanvas year={year} shirt={shirt} />
        <p className="rotate-hint">Turn your phone sideways for a bigger street</p>
        {near && !open && (
          <div className="near-hint" aria-live="polite">
            {BUILDINGS[near].name}: {BUILDINGS[near].blurb}
          </div>
        )}
      </div>

      <div className="touch" aria-label="Touch controls">
        <button
          aria-label="Walk left"
          onPointerDown={() => bus.emit("move", -1)}
          onPointerUp={() => bus.emit("move", 0)}
          onPointerLeave={() => bus.emit("move", 0)}
        >
          ◀
        </button>
        <button className="touch-enter" disabled={!near} onClick={() => bus.emit("interact")}>
          {near ? `Enter ${BUILDINGS[near].name}` : "Walk to a shop"}
        </button>
        <button
          aria-label="Walk right"
          onPointerDown={() => bus.emit("move", 1)}
          onPointerUp={() => bus.emit("move", 0)}
          onPointerLeave={() => bus.emit("move", 0)}
        >
          ▶
        </button>
      </div>

      <section className="machine" aria-label="Time Machine">
        <div className="machine-year" aria-live="polite">
          {year}
        </div>
        <div className="machine-controls">
          <div className="machine-top">
            <label htmlFor="year">Time Machine</label>
            <span className="machine-era">{era}</span>
          </div>
          <div className="machine-slider">
            <button className="btn-play" onClick={play} aria-label={playing ? "Pause the Time Machine" : "Play through the years"}>
              {playing ? "❚❚" : "▶"}
            </button>
            <input
              id="year"
              type="range"
              min={FIRST_YEAR}
              max={LAST_YEAR}
              step={1}
              value={year}
              onChange={(e) => {
                stop();
                setYear(Number(e.target.value));
              }}
              onPointerUp={(e) => (e.target as HTMLInputElement).blur()}
              list="year-ticks"
              aria-valuetext={`${year}, vada pav ${rupees(vada)}`}
            />
            <datalist id="year-ticks">
              {[1995, 2000, 2005, 2010, 2015, 2020, 2026].map((y) => (
                <option key={y} value={y} label={String(y)} />
              ))}
            </datalist>
          </div>
          <div className="machine-ticks" aria-hidden>
            {[1995, 2000, 2005, 2010, 2015, 2020, 2026].map((y) => (
              <span key={y}>{y}</span>
            ))}
          </div>
        </div>
      </section>

      {open && <ShopPanel building={open} year={year} onClose={() => setOpen(null)} />}
    </main>
  );
}
