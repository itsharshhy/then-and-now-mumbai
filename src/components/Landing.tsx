"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useInstall } from "./Pwa";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

const FEATURES: { img: string; title: string; text: string }[] = [
  { img: "mumbai", title: "A city from above", text: "Fly over a Mumbai neighbourhood like a drone: the sea front, chawls with washing on the galleries, BEST buses, kaali-peeli taxis. Zoom right in or pull right back." },
  { img: "chai", title: "Walk inside", text: "Step into the chai shop, the kirana and the station. Talk to the people behind the counter and hear what everything cost, then and now." },
  { img: "station", title: "Trains, buses, the lot", text: "Locals pull into the platform and the crowd squeezes on. Double-deckers, Padmini taxis and the Metro come and go with the years." },
  { img: "delhi", title: "Mumbai and Delhi", text: "Cross to Delhi: Old Delhi havelis, the Yamuna ghats, Blueline buses, green CNG autos and a Metro that opens in 2002." },
];

export default function Landing() {
  const router = useRouter();
  const { canPrompt, installed, platform, prompt } = useInstall();
  const [help, setHelp] = useState(false);
  const [done, setDone] = useState(false);

  // old invite links pointed at the home page: send them to the game
  useEffect(() => {
    const q = window.location.search;
    if (/[?&](room|city)=/.test(q)) router.replace(`/play/${q}`);
  }, [router]);

  const download = async () => {
    if (installed) return router.push("/play/");
    if (canPrompt) {
      const r = await prompt();
      if (r === "accepted") setDone(true);
      return;
    }
    setHelp(true);
  };

  return (
    <main className="ld">
      <header className="ld-nav">
        <span className="ld-brand">
          <img src={`${base}/icons/icon-192.png`} alt="" width={28} height={28} />
          Then &amp; Now
        </span>
        <nav>
          <Link href="/analyst">The data</Link>
          <Link href="/bazaar">Bazaar</Link>
          <Link href="/play" className="ld-nav-play">
            Play
          </Link>
        </nav>
      </header>

      <section className="ld-hero">
        <div className="ld-hero-text">
          <p className="ld-kicker">A pixel game about real prices</p>
          <h1>
            Walk thirty years of <em>Indian street prices</em>.
          </h1>
          <p className="ld-lede">
            Fly over Mumbai and Delhi, walk into the chai shop, catch the local, and drag the Time Machine from 1995 to today. Every price on every
            board is sourced, or honestly marked as an estimate.
          </p>
          <div className="ld-cta">
            <button className="ld-download" onClick={download}>
              {installed ? "Open the app" : done ? "Installed. Open it from your home screen" : "Download now"}
            </button>
            <Link href="/play" className="ld-play">
              Play in your browser
            </Link>
          </div>
          <p className="ld-small">Free. No sign-up. Works offline once installed, on phones and computers.</p>
        </div>
        <div className="ld-hero-art">
          <figure className="ld-screen">
            <img src={`${base}/landing/mumbai.webp`} alt="Mumbai from above in the game: chawls, a BEST bus stop, the Metro over the road" width={1400} height={752} />
          </figure>
          <figure className="ld-phone">
            <img src={`${base}/landing/phone.webp`} alt="The game on a phone, with the joystick and the Time Machine" width={390} height={664} />
          </figure>
        </div>
      </section>

      <section className="ld-strip" aria-label="What is in the game">
        <span>Time Machine 1995–2026</span>
        <span>2 cities</span>
        <span>Walk-in shops and stations</span>
        <span>Play with friends</span>
        <span>Every price sourced or flagged</span>
      </section>

      <section className="ld-features">
        {FEATURES.map((f, i) => (
          <article key={f.img} className={`ld-feature ${i % 2 ? "flip" : ""}`}>
            <img src={`${base}/landing/${f.img}.webp`} alt="" width={1400} height={752} loading="lazy" />
            <div>
              <h2>{f.title}</h2>
              <p>{f.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="ld-honest">
        <h2>Honest about every number</h2>
        <p>
          Street prices were never published as a series, so each one is pinned to a dated source: a fare notice, a news report, a price board. Where
          nobody wrote it down (chai, mostly), the game says so and draws it as a hollow dot. Players can report what they paid today; nothing goes up
          until it&apos;s reviewed.
        </p>
        <div className="ld-honest-links">
          <Link href="/analyst">Read the analysis</Link>
          <Link href="/bazaar">Ask the bazaar</Link>
          <Link href="/survive">Can you survive a month in 1995?</Link>
        </div>
      </section>

      <section className="ld-install" id="install">
        <h2>Install it like an app</h2>
        <div className="ld-install-grid">
          <div>
            <h3>Android</h3>
            <p>Tap Download now and then Install. Or in Chrome&apos;s menu, choose Add to Home screen.</p>
          </div>
          <div>
            <h3>iPhone and iPad</h3>
            <p>Open this page in Safari, tap the Share button, then Add to Home Screen.</p>
          </div>
          <div>
            <h3>Computer</h3>
            <p>In Chrome or Edge, tap Download now, or the install icon at the right of the address bar.</p>
          </div>
        </div>
      </section>

      <footer className="ld-foot">
        <span>Then &amp; Now. Shop names are generic and no brand logos are used.</span>
        <nav>
          <Link href="/privacy">Privacy</Link>
          <Link href="/postcard">Postcards</Link>
          <a href="https://github.com/itsharshhy/then-and-now-mumbai" target="_blank" rel="noreferrer">
            Source and data
          </a>
        </nav>
      </footer>

      {help && (
        <div className="ld-modal" role="dialog" aria-modal="true" aria-labelledby="ld-help-title" onClick={() => setHelp(false)}>
          <div className="ld-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 id="ld-help-title">Add Then &amp; Now to your {platform === "desktop" ? "computer" : "home screen"}</h2>
            {platform === "ios" ? (
              <ol>
                <li>
                  Tap the <b>Share</b> button in Safari (the square with an arrow).
                </li>
                <li>
                  Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.
                </li>
              </ol>
            ) : platform === "android" ? (
              <ol>
                <li>
                  Open the browser menu (<b>⋮</b>).
                </li>
                <li>
                  Tap <b>Install app</b> or <b>Add to Home screen</b>.
                </li>
              </ol>
            ) : (
              <ol>
                <li>
                  In Chrome or Edge, click the <b>install icon</b> at the right end of the address bar.
                </li>
                <li>Other browsers can&apos;t install web apps, but you can play right here in the browser.</li>
              </ol>
            )}
            <div className="ld-cta">
              <Link href="/play" className="ld-download">
                Play now instead
              </Link>
              <button className="ld-play" onClick={() => setHelp(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
