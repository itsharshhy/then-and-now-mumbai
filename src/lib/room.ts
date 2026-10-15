import { bus } from "./bus";
import { BUILDINGS, FIRST_YEAR, LAST_YEAR, type BuildingId } from "./data";
import { getSupabase, supabaseConfigured } from "./supabase";

// Multiplayer rooms: walk the street with friends.
// A room is a private broadcast channel named by an invite code. There is no game server and no database:
// every player broadcasts their own position a few times a second, and everyone draws everyone else.
// Two transports share one interface:
//   - Supabase Realtime (broadcast), when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set
//   - BroadcastChannel, which only reaches other tabs of the same browser (for local testing and as a fallback)

export const WORLD_MIN_X = 8;
export const WORLD_MAX_X = 1232;
export const MAX_PLAYERS = 8;
export const CHAT_MAX = 80;
const STALE_MS = 7000;
const HEARTBEAT_MS = 2000;
const SEND_EVERY_MS = 120;

export interface Peer {
  id: string;
  name: string;
  shirt: string;
  x: number;
  facing: 1 | -1;
  moving: boolean;
  inside: BuildingId | null;
  seen: number;
}

export type Msg =
  | { t: "state"; id: string; name: string; shirt: string; x: number; facing: number; moving: boolean; inside: string | null }
  | { t: "chat"; id: string; text: string }
  | { t: "year"; id: string; year: number }
  | { t: "bye"; id: string }
  | { t: "hello"; id: string };

interface Transport {
  readonly kind: "online" | "local";
  send(m: Msg): void;
  close(): void;
}

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I/L
export const newRoomCode = () => Array.from(crypto.getRandomValues(new Uint32Array(5)), (n) => CODE_CHARS[n % CODE_CHARS.length]).join("");
export const cleanRoomCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
export const onlineConfigured = supabaseConfigured;

/** Chat text from anyone else is untrusted: plain text only, one line, bounded. */
export const cleanChat = (s: unknown) =>
  typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮]/g, "").replace(/\s+/g, " ").trim().slice(0, CHAT_MAX) : "";
const cleanName = (s: unknown) => (typeof s === "string" ? cleanChat(s).slice(0, 16) : "") || "Mumbaikar";
const cleanShirt = (s: unknown) => (typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : "#2f6fb3");
const cleanId = (s: unknown) => (typeof s === "string" && /^[A-Za-z0-9-]{8,40}$/.test(s) ? s : null);

/** Validates an incoming message; anything malformed is dropped. */
export function parseMsg(raw: unknown): Msg | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const id = cleanId(m.id);
  if (!id) return null;
  switch (m.t) {
    case "state": {
      const x = Number(m.x);
      if (!Number.isFinite(x)) return null;
      const inside = typeof m.inside === "string" && m.inside in BUILDINGS ? m.inside : null;
      return {
        t: "state",
        id,
        name: cleanName(m.name),
        shirt: cleanShirt(m.shirt),
        x: Math.min(WORLD_MAX_X, Math.max(WORLD_MIN_X, x)),
        facing: m.facing === -1 ? -1 : 1,
        moving: m.moving === true,
        inside,
      };
    }
    case "chat": {
      const text = cleanChat(m.text);
      return text ? { t: "chat", id, text } : null;
    }
    case "year": {
      const year = Math.round(Number(m.year));
      return year >= FIRST_YEAR && year <= LAST_YEAR ? { t: "year", id, year } : null;
    }
    case "bye":
    case "hello":
      return { t: m.t, id };
    default:
      return null;
  }
}

class LocalTransport implements Transport {
  readonly kind = "local" as const;
  private ch: BroadcastChannel;
  constructor(code: string, onMsg: (m: unknown) => void) {
    this.ch = new BroadcastChannel(`tnm-room-${code}`);
    this.ch.onmessage = (e) => onMsg(e.data);
  }
  send(m: Msg) {
    this.ch.postMessage(m);
  }
  close() {
    this.ch.close();
  }
}

class SupabaseTransport implements Transport {
  readonly kind = "online" as const;
  private channel: import("@supabase/supabase-js").RealtimeChannel | null = null;
  private client: import("@supabase/supabase-js").SupabaseClient | null = null;
  private queue: Msg[] = [];
  private ready = false;
  private closed = false;

  constructor(code: string, onMsg: (m: unknown) => void, onStatus: (s: string) => void) {
    (async () => {
      const client = await getSupabase();
      if (this.closed) return;
      this.client = client;
      this.channel = this.client.channel(`tnm-room-${code}`, { config: { broadcast: { self: false, ack: false } } });
      this.channel.on("broadcast", { event: "m" }, ({ payload }) => onMsg(payload));
      this.channel.subscribe((status) => {
        this.ready = status === "SUBSCRIBED";
        onStatus(status);
        if (this.ready) this.queue.splice(0).forEach((m) => this.send(m));
      });
    })().catch(() => onStatus("CHANNEL_ERROR"));
  }
  send(m: Msg) {
    if (!this.ready || !this.channel) {
      if (this.queue.length < 20) this.queue.push(m);
      return;
    }
    void this.channel.send({ type: "broadcast", event: "m", payload: m });
  }
  close() {
    this.closed = true;
    if (this.channel) void this.client?.removeChannel(this.channel);
  }
}

export interface Me {
  name: string;
  shirt: string;
}

export type RoomStatus = "connecting" | "live" | "local" | "error";

/** Room events on the bus:
 *  room:peers   (Peer[])                        everyone else currently in the room
 *  room:chat    ({id, name, text, mine})        a chat line (also drawn as a speech bubble)
 *  room:year    ({name, year})                  someone else moved the Time Machine
 *  room:status  (RoomStatus)
 *  self         ({x, facing, moving})           game -> room: where I am
 */
export class Room {
  readonly id = crypto.randomUUID();
  readonly transport: Transport;
  private peers = new Map<string, Peer>();
  private self = { x: 70, facing: 1 as 1 | -1, moving: false };
  private inside: BuildingId | null = null;
  private lastSent = 0;
  private lastKey = "";
  private lastChat = 0;
  private year: number | null = null;
  /** A year that arrived before we knew who sent it (messages can overtake each other). */
  private pendingYear: { id: string; year: number } | null = null;
  private timers: ReturnType<typeof setInterval>[] = [];
  private unsubs: (() => void)[] = [];

  constructor(
    readonly code: string,
    private me: Me,
  ) {
    const onMsg = (raw: unknown) => this.receive(raw);
    this.transport = onlineConfigured()
      ? new SupabaseTransport(code, onMsg, (s) => {
          bus.emit("room:status", s === "SUBSCRIBED" ? "live" : s === "CHANNEL_ERROR" || s === "TIMED_OUT" ? "error" : "connecting");
          if (s === "SUBSCRIBED") this.announce();
        })
      : new LocalTransport(code, onMsg);
    if (this.transport.kind === "local") setTimeout(() => (bus.emit("room:status", "local"), this.announce()), 0);
    else bus.emit("room:status", "connecting");

    this.unsubs.push(
      bus.on("self", (s: { x: number; facing: 1 | -1; moving: boolean }) => {
        this.self = s;
        this.sendState();
      }),
      bus.on("enter", (b: BuildingId) => this.setInside(b)),
    );
    this.timers.push(
      setInterval(() => this.sendState(true), HEARTBEAT_MS),
      setInterval(() => this.prune(), 1000),
    );
    window.addEventListener("pagehide", this.leave);
  }

  private announce() {
    this.transport.send({ t: "hello", id: this.id });
    this.sendState(true);
  }

  setInside(b: BuildingId | null) {
    this.inside = b;
    this.sendState(true);
  }

  private sendState(force = false) {
    const now = Date.now();
    const s = this.self;
    const key = `${Math.round(s.x)}|${s.facing}|${s.moving}|${this.inside}`;
    if (!force && (key === this.lastKey || now - this.lastSent < SEND_EVERY_MS)) return;
    this.lastKey = key;
    this.lastSent = now;
    this.transport.send({ t: "state", id: this.id, name: this.me.name, shirt: this.me.shirt, x: Math.round(s.x), facing: s.facing, moving: s.moving, inside: this.inside });
  }

  /** Returns false when the message was rate-limited or empty. */
  chat(raw: string) {
    const text = cleanChat(raw);
    const now = Date.now();
    if (!text || now - this.lastChat < 1000) return false;
    this.lastChat = now;
    this.transport.send({ t: "chat", id: this.id, text });
    bus.emit("room:chat", { id: this.id, name: this.me.name || "Mumbaikar", text, mine: true });
    return true;
  }

  sendYear(year: number) {
    this.year = year;
    this.transport.send({ t: "year", id: this.id, year });
  }

  private receive(raw: unknown) {
    const m = parseMsg(raw);
    if (!m || m.id === this.id) return;
    const known = this.peers.get(m.id);
    switch (m.t) {
      case "hello":
        this.sendState(true);
        // bring the newcomer to the room's year
        if (this.year !== null) this.transport.send({ t: "year", id: this.id, year: this.year });
        return;
      case "bye":
        if (this.peers.delete(m.id)) this.emitPeers();
        return;
      case "state": {
        if (!known && this.peers.size >= MAX_PLAYERS - 1) return; // room full: ignore newcomers
        this.peers.set(m.id, { id: m.id, name: m.name, shirt: m.shirt, x: m.x, facing: m.facing as 1 | -1, moving: m.moving, inside: m.inside as BuildingId | null, seen: Date.now() });
        this.emitPeers();
        if (!known) {
          // a newcomer's hello can get lost, so seeing someone for the first time also hands them the room's year
          if (this.year !== null) this.transport.send({ t: "year", id: this.id, year: this.year });
          if (this.pendingYear?.id === m.id) {
            const y = this.pendingYear.year;
            this.pendingYear = null;
            this.year = y;
            bus.emit("room:year", { name: m.name, year: y });
          }
        }
        return;
      }
      case "chat":
        if (known) bus.emit("room:chat", { id: m.id, name: known.name, text: m.text, mine: false });
        return;
      case "year":
        if (!known) {
          this.pendingYear = { id: m.id, year: m.year };
          return;
        }
        this.year = m.year; // everyone remembers the room's year, so a newcomer still gets it after the mover leaves
        bus.emit("room:year", { name: known.name, year: m.year });
        return;
    }
  }

  private prune() {
    const now = Date.now();
    let changed = false;
    for (const [id, p] of this.peers) if (now - p.seen > STALE_MS) changed = this.peers.delete(id) || changed;
    if (changed) this.emitPeers();
  }

  private emitPeers() {
    bus.emit("room:peers", [...this.peers.values()]);
  }

  leave = () => {
    this.transport.send({ t: "bye", id: this.id });
    this.timers.forEach(clearInterval);
    this.unsubs.forEach((u) => u());
    window.removeEventListener("pagehide", this.leave);
    // give the goodbye a moment to go out before the channel closes
    setTimeout(() => this.transport.close(), 150);
    bus.emit("room:peers", []);
  };
}
