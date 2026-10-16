import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy — Then & Now" };

export default function PrivacyPage() {
  return (
    <main className="ld ld-legal">
      <header className="ld-nav">
        <Link href="/" className="ld-brand">
          Then &amp; Now
        </Link>
        <nav>
          <Link href="/play" className="ld-nav-play">
            Play
          </Link>
        </nav>
      </header>
      <article>
        <h1>Privacy</h1>
        <p className="ld-small">Last updated 16 October 2026.</p>
        <h2>The short version</h2>
        <p>There are no accounts, no ads, no analytics and no tracking cookies. You can play without telling us anything.</p>
        <h2>What stays on your device</h2>
        <p>
          The game remembers which old receipts you have found, using your browser&apos;s local storage. If you install the app, your browser keeps a copy of the
          game so it opens offline. Clearing your browser data removes both.
        </p>
        <h2>Playing with friends</h2>
        <p>
          In a room, the name you type, your shirt colour, where you are standing and your chat messages are sent to the other people in that room through
          Supabase Realtime. They are passed along live and are not stored. Anyone with your room code can join, so only share it with people you trust.
        </p>
        <h2>The bazaar</h2>
        <p>
          When you ask a question or report a price, we store what you typed (the question, or the item, price, date, neighbourhood and note) in our
          database, hosted by Supabase in Mumbai. A reviewer checks it before anything is published, and published reports never include anything about
          you. Please don&apos;t include personal details.
        </p>
        <p>
          To stop spam, we keep a salted, one-way hash of the network address each submission came from, for one day, and then delete it. We cannot
          turn the hash back into your address.
        </p>
        <h2>Hosting</h2>
        <p>The site is served by Vercel, whose servers keep standard access logs for a short time.</p>
        <h2>Questions</h2>
        <p>
          Open an issue on{" "}
          <a href="https://github.com/itsharshhy/then-and-now-mumbai/issues" target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </p>
      </article>
    </main>
  );
}
