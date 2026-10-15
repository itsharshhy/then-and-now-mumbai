"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { bus } from "@/lib/bus";
import { CHAT_MAX, MAX_PLAYERS, Room, cleanRoomCode, newRoomCode, type Peer, type RoomStatus } from "@/lib/room";
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
  // multiplayer
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [roomMode, setRoomMode] = useState<"solo" | "new" | "join">("solo");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [chat, setChat] = useState("");
  const [lines, setLines] = useState<{ key: number; name: string; text: string; mine: boolean }[]>([]);
  const [toast, setToast] = useState("");
  const room = useRef<Room | null>(null);
  const remoteYear = useRef<number | null>(null);
  const chatInput = useRef<HTMLInputElement>(null);

  // an invite link (?room=CODE) pre-fills the join code
  useEffect(() => {
    const code = cleanRoomCode(new URLSearchParams(window.location.search).get("room") ?? "");
    if (code.length >= 4) {
      setJoinCode(code);
      setRoomMode("join");
    }
  }, []);

  useEffect(() => {
    if (!started || !roomCode) return;
    const r = new Room(roomCode, { name: name.trim() || "Mumbaikar", shirt });
    room.current = r;
    window.history.replaceState(null, "", `?room=${roomCode}`);
    let n = 0;
    const offs = [
      bus.on("room:peers", (p: Peer[]) => setPeers(p)),
      bus.on("room:status", (s: RoomStatus) => setStatus(s)),
      bus.on("room:chat", (c: { name: string; text: string; mine: boolean }) => setLines((l) => [...l.slice(-3), { key: n++, ...c }])),
      bus.on("room:year", ({ name: who, year: y }: { name: string; year: number }) => {
        remoteYear.current = y;
        stopRef.current();
        setYear(y);
        setToast(`${who} moved the Time Machine to ${y}`);
      }),
    ];
    return () => {
      offs.forEach((o) => o());
      r.leave();
      room.current = null;
    };
    // name and shirt are fixed once the player has started
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, roomCode]);

  // the Time Machine is shared: my changes go out, echoes of someone else's change don't
  useEffect(() => {
    if (remoteYear.current === year) {
      remoteYear.current = null;
      return;
    }
    room.current?.sendYear(year);
  }, [year]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => room.current?.setInside(open), [open]);

  // T opens the chat box, like most games
  useEffect(() => {
    if (!roomCode) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (e.key.toLowerCase() === "t" && !open && !(el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) {
        e.preventDefault();
        chatInput.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [roomCode, open]);

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
  const stopRef = useRef(stop);
  stopRef.current = stop;

  const invite = async () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text: "Walk the Then & Now Mumbai street with me", url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("Invite link copied");
      }
    } catch {
      /* cancelled */
    }
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (room.current?.chat(chat)) setChat("");
    chatInput.current?.blur();
  };

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
              if (roomMode === "new") setRoomCode(newRoomCode());
              if (roomMode === "join") setRoomCode(cleanRoomCode(joinCode));
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
            <fieldset className="start-room">
              <legend>Walk with friends</legend>
              <div className="start-room-row">
                <button type="button" className={roomMode === "solo" ? "on" : ""} aria-pressed={roomMode === "solo"} onClick={() => setRoomMode("solo")}>
                  On my own
                </button>
                <button type="button" className={roomMode === "new" ? "on" : ""} aria-pressed={roomMode === "new"} onClick={() => setRoomMode("new")}>
                  Start a room
                </button>
                <input
                  aria-label="Room code to join"
                  value={joinCode}
                  placeholder="Room code"
                  maxLength={8}
                  autoComplete="off"
                  className={roomMode === "join" ? "on" : ""}
                  onFocus={() => setRoomMode("join")}
                  onChange={(e) => {
                    setJoinCode(cleanRoomCode(e.target.value));
                    setRoomMode("join");
                  }}
                />
              </div>
            </fieldset>
            <button className="btn-go" type="submit" disabled={roomMode === "join" && joinCode.length < 4}>
              {roomMode === "new" ? "Open a room" : roomMode === "join" ? (joinCode.length >= 4 ? `Join room ${joinCode}` : "Type a room code") : "Step onto the street"}
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
        {roomCode && (
          <div className="room-chip">
            <span className={`room-dot ${status}`} aria-hidden />
            <span>
              Room <b>{roomCode}</b> · {peers.length + 1} here
            </span>
            <button onClick={invite}>Invite</button>
          </div>
        )}
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
        {toast && (
          <div className="room-toast" role="status">
            {toast}
          </div>
        )}
        {near && !open && (
          <div className="near-hint" aria-live="polite">
            {BUILDINGS[near].name}: {BUILDINGS[near].blurb}
          </div>
        )}
      </div>

      {roomCode && (
        <div className="roombar">
          <ul className="room-lines" aria-live="polite" aria-label="Chat">
            {lines.length === 0 && (
              <li className="room-empty">
                {status === "local"
                  ? "Multiplayer server isn't configured, so only other tabs in this browser can join."
                  : status === "error"
                    ? "Couldn't reach the multiplayer server. You can keep walking on your own."
                    : peers.length === 0
                      ? "Nobody else here yet. Press Invite and send the link to a friend."
                      : `${peers.map((p) => p.name).join(", ")} ${peers.length === 1 ? "is" : "are"} here. Press T to talk.`}
              </li>
            )}
            {lines.map((l) => (
              <li key={l.key} className={l.mine ? "mine" : ""}>
                <b>{l.name}:</b> {l.text}
              </li>
            ))}
          </ul>
          <form onSubmit={sendChat} className="room-chat">
            <input
              ref={chatInput}
              value={chat}
              maxLength={CHAT_MAX}
              onChange={(e) => setChat(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
              placeholder={`Say something (T)${peers.length + 1 >= MAX_PLAYERS ? " · room full" : ""}`}
              aria-label="Chat message"
              autoComplete="off"
              enterKeyHint="send"
            />
            <button type="submit" disabled={!chat.trim()}>
              Say
            </button>
          </form>
        </div>
      )}

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
