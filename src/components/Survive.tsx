"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BUILDINGS, FIRST_YEAR, LAST_YEAR, pointAt, rupees, itemById } from "@/lib/data";
import { KEEPERS } from "@/lib/sprites";
import {
  BUDGET_2026,
  MAX_MOOD,
  STEPS,
  WEEKS,
  advance,
  budgetFor,
  costOf,
  newGame,
  replay,
  spendByItem,
  type Basket,
  type State,
} from "@/lib/survive";
import { postcardHref } from "./Postcard";
import Pixel from "./Pixel";

const QUICK_YEARS = [1995, 2005, 2013, 2019, 2026];
const COMPARE_YEARS = [1995, 2005, 2015, 2026];

const basketText = (b: Basket, year: number) =>
  Object.entries(b)
    .map(([id, q]) => `${q} × ${itemById(id).name.toLowerCase()} at ${rupees(pointAt(itemById(id), year).price)}`)
    .join(", ");

export default function Survive() {
  const [year, setYear] = useState(2019);
  const [game, setGame] = useState<State | null>(null);
  const focus = useRef<HTMLHeadingElement>(null);

  // move focus to the new card so keyboard and screen-reader players follow the month
  useEffect(() => focus.current?.focus(), [game?.step, game?.outcome]);

  return (
    <main className="sv">
      <header className="topbar">
        <h1>Then &amp; Now Mumbai</h1>
        <span className="who">Can you survive the month?</span>
        <Link href="/" className="btn-analyst">
          Back to the street
        </Link>
      </header>
      {!game ? (
        <Intro year={year} setYear={setYear} onStart={() => setGame(newGame(year))} />
      ) : game.outcome === "playing" ? (
        <Play game={game} onChoose={(id) => setGame(advance(game, id))} headingRef={focus} />
      ) : (
        <End game={game} headingRef={focus} onAgain={(y) => (y ? setGame(newGame(y)) : setGame(null))} />
      )}
    </main>
  );
}

function Intro({ year, setYear, onStart }: { year: number; setYear: (y: number) => void; onStart: () => void }) {
  return (
    <section className="sv-card sv-intro">
      <h2>Can you survive the month?</h2>
      <p>
        Four weeks in Mumbai. Every week you buy milk and onions, get to work, eat lunch, drink chai and deal with whatever the city throws at you. Run
        out of money or out of good mood and the month wins.
      </p>
      <p>
        Your budget is the same real money in every year: <b>{rupees(BUDGET_2026)} in 2026 rupees</b>, adjusted back with India&apos;s inflation index. So the
        only thing that changes between years is street prices. Did they outrun inflation? Play and find out.
      </p>
      <div className="sv-year">
        <label htmlFor="sv-year">Pick your year</label>
        <div className="sv-year-row">
          <strong>{year}</strong>
          <input id="sv-year" type="range" min={FIRST_YEAR} max={LAST_YEAR} value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <div className="sv-quick">
          {QUICK_YEARS.map((y) => (
            <button key={y} className={y === year ? "on" : ""} aria-pressed={y === year} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </div>
        <p className="sv-budget">
          Your {year} budget: <b>{rupees(budgetFor(year))}</b> for the month.
        </p>
      </div>
      <button className="btn-go" onClick={onStart}>
        Start the month
      </button>
      <p className="sv-fine">
        Prices come from the dataset for {year}, including its estimates and in-between years. Fares are minimum fares, so real commutes cost more.
      </p>
    </section>
  );
}

function Hud({ game }: { game: State }) {
  const step = STEPS[Math.min(game.step, STEPS.length - 1)];
  const left = Math.max(0, game.money / game.budget);
  return (
    <div className="sv-hud" aria-label="Your month so far">
      <div className="sv-hud-year">{game.year}</div>
      <div className="sv-hud-week">
        Week {step.week + 1}
        <small>of {WEEKS.length}</small>
      </div>
      <div className="sv-hud-money">
        <span>
          Money left <b>{rupees(Math.max(0, game.money))}</b> of {rupees(game.budget)}
        </span>
        <div className="sv-bar" role="meter" aria-valuemin={0} aria-valuemax={game.budget} aria-valuenow={Math.round(game.money)} aria-label="Money left">
          <i style={{ width: `${left * 100}%` }} className={left < 0.2 ? "low" : ""} />
        </div>
      </div>
      <div className="sv-hud-mood">
        <span>Mood</span>
        <div className="sv-mood" role="meter" aria-valuemin={0} aria-valuemax={MAX_MOOD} aria-valuenow={game.mood} aria-label={`Mood ${game.mood} of ${MAX_MOOD}`}>
          {Array.from({ length: MAX_MOOD }, (_, i) => (
            <i key={i} className={i < game.mood ? "on" : ""} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Play({ game, onChoose, headingRef }: { game: State; onChoose: (id?: string) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const step = STEPS[game.step];
  const week = WEEKS[step.week];

  if (step.kind === "basics") {
    const cost = costOf(week.basics, game.year);
    return (
      <>
        <Hud game={game} />
        <section className="sv-card">
          <Keeper building="kirana" />
          <div className="sv-card-main">
            <h2 ref={headingRef} tabIndex={-1}>
              Week {step.week + 1}: the kirana run
            </h2>
            <p>
              {BUILDINGS.kirana.keeper} rings up the basics: half a litre of milk a day and half a kilo of onions. {basketText(week.basics, game.year)}.
            </p>
            <button className="sv-pay" onClick={() => onChoose()}>
              Pay {rupees(cost)}
            </button>
          </div>
        </section>
        <Log game={game} />
      </>
    );
  }

  const card = week.cards[step.card];
  return (
    <>
      <Hud game={game} />
      <section className="sv-card">
        <Keeper building={card.building} />
        <div className="sv-card-main">
          <h2 ref={headingRef} tabIndex={-1}>
            {card.title}
          </h2>
          <p>{card.prompt}</p>
          <div className="sv-options">
            {card.options.map((o) => {
              const cost = costOf(o.basket, game.year);
              const short = cost > game.money + 0.005;
              return (
                <button key={o.id} className="sv-option" disabled={short} onClick={() => onChoose(o.id)}>
                  <span className="sv-option-top">
                    <b>{o.label}</b>
                    <span className="sv-price">{cost === 0 ? "Free" : rupees(cost)}</span>
                  </span>
                  <span className="sv-option-detail">{short ? "You can't afford this any more." : o.detail}</span>
                  <span className={`sv-delta ${o.mood > 0 ? "up" : o.mood < 0 ? "down" : ""}`}>
                    {o.mood > 0 ? `Mood +${o.mood}` : o.mood < 0 ? `Mood ${o.mood}` : "Mood unchanged"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      <Log game={game} />
    </>
  );
}

function Keeper({ building }: { building: keyof typeof BUILDINGS }) {
  const k = KEEPERS[building];
  return (
    <div className="portrait sv-portrait">
      <Pixel grid={k.grid} palette={k.palette} size={6} label={BUILDINGS[building].keeper} />
      <span>{BUILDINGS[building].keeper}</span>
    </div>
  );
}

function Log({ game }: { game: State }) {
  if (!game.log.length) return null;
  return (
    <details className="sv-log">
      <summary>Receipts so far ({game.log.length})</summary>
      <ol>
        {game.log.map((l) => (
          <li key={l.step}>
            <span>{l.label}</span>
            <b>{l.cost === 0 ? "Free" : rupees(l.cost)}</b>
          </li>
        ))}
      </ol>
    </details>
  );
}

const HEADLINE: Record<Exclude<State["outcome"], "playing">, string> = {
  survived: "You survived the month.",
  broke: "You ran out of money.",
  miserable: "You ran out of good mood.",
};

function End({ game, onAgain, headingRef }: { game: State; onAgain: (y?: number) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const [copied, setCopied] = useState("");
  const outcome = game.outcome as Exclude<State["outcome"], "playing">;
  const spent = game.budget - game.money;
  // the week the month ended in (a broke month ends on the step nobody could pay for)
  const week = STEPS[Math.min(game.step, STEPS.length - 1)].week + 1;
  const compare = COMPARE_YEARS.map((y) => replay(game.log, y));
  const top = spendByItem(game.log, game.year)[0];
  const otherYear = game.year >= 2010 ? FIRST_YEAR : LAST_YEAR;
  const maxShare = Math.max(1, ...compare.map((c) => c.share));

  const summary =
    outcome === "survived"
      ? `I survived a month in ${game.year} Mumbai with ${rupees(game.money)} to spare and mood ${game.mood}/${MAX_MOOD}.`
      : outcome === "broke"
        ? `I went broke in week ${week} of a ${game.year} Mumbai month.`
        : `Mumbai ${game.year} wore me down by week ${week}.`;

  const share = async () => {
    const url = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/survive/`;
    const text = `${summary} Can you? ${url}`;
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(text);
        setCopied("Copied to your clipboard.");
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <>
      <Hud game={game} />
      <section className={`sv-card sv-end sv-${outcome}`}>
        <div className="sv-card-main">
          <h2 ref={headingRef} tabIndex={-1}>
            {HEADLINE[outcome]}
          </h2>
          <p className="sv-end-lede">
            {outcome === "survived"
              ? `You spent ${rupees(spent)} of your ${rupees(game.budget)} and finished with ${rupees(game.money)} left and a mood of ${game.mood} out of ${MAX_MOOD}.`
              : outcome === "broke"
                ? `You spent all of your ${rupees(game.budget)} before the month was out. ${top ? `${top.item.name} took the biggest bite: ${rupees(top.cost)}.` : ""}`
                : `Saving every rupee has a cost too. You had ${rupees(game.money)} left but nothing to look forward to.`}
          </p>

          <h3>The same choices in other years</h3>
          <p className="sv-fine">
            Each bar is what your exact choices{outcome === "survived" ? "" : " up to the point the month ended"} would cost, as a share of that year&apos;s
            budget (always {rupees(BUDGET_2026)} in 2026 money).
          </p>
          <ul className="sv-compare">
            {compare.map((c) => (
              <li key={c.year} className={c.year === game.year ? "you" : ""}>
                <span className="sv-compare-year">{c.year}</span>
                <span className="sv-compare-bar">
                  <i style={{ width: `${(c.share / maxShare) * 100}%` }} className={c.share > 1 ? "over" : ""} />
                  {c.share > 1 && <em style={{ left: `${(1 / maxShare) * 100}%` }} aria-hidden />}
                </span>
                <span className="sv-compare-val">
                  {rupees(c.cost)} <small>({Math.round(c.share * 100)}% of {rupees(c.budget)})</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="sv-fine">
            A bar past the marker means the month would have broken you. Street food got dearer than inflation while the train got cheaper, so commuters and
            snackers feel different years differently.
          </p>

          <div className="sv-end-actions">
            <button className="btn-go" onClick={() => onAgain(game.year)}>
              Play {game.year} again
            </button>
            <button className="btn-ghost" onClick={() => onAgain(otherYear)}>
              Try {otherYear}
            </button>
            <button className="btn-ghost" onClick={() => onAgain()}>
              Pick another year
            </button>
          </div>
          <div className="sv-end-actions">
            <button className="btn-ghost" onClick={share}>
              Share your result
            </button>
            {top && (
              <Link className="btn-ghost" href={postcardHref(top.item.id, Math.min(game.year, otherYear), Math.max(game.year, otherYear))}>
                Make a {top.item.name.toLowerCase()} postcard
              </Link>
            )}
            <span aria-live="polite" className="sv-fine">
              {copied}
            </span>
          </div>
        </div>
      </section>
      <Log game={game} />
    </>
  );
}
