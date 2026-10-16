import Phaser from "phaser";
import { bus } from "@/lib/bus";
import * as I from "../art/interiors";
import * as V from "../art/vehicles";
import { INTERIORS_BY_CITY, PLATFORM_EDGE, PLATFORM_Y, TRACK_BOTTOM, type InteriorKind, type InteriorSpec } from "../world/interiors";
import * as D from "../art/delhi";
import type { City } from "@/lib/data";
import { WALKER_LOOKS, type Talker } from "../world/life";
import {
  Actor,
  Collider,
  Controls,
  Remotes,
  addTexture,
  ensureAllLooks,
  ensurePlayerLook,
  facingFrom,
  makePrompt,
  myBubbles,
  setupZoom,
  slide,
  type Rect,
} from "./common";

const SPEED = 58;

type Focus = { kind: "keeper" } | { kind: "talker"; t: Talker; actor: Actor } | { kind: "exit" } | null;

export class InteriorScene extends Phaser.Scene {
  private spec!: InteriorSpec;
  private year = 2026;
  private shirt = "#2f6fb3";
  private player!: Actor;
  private keeper!: Actor;
  private controls!: Controls;
  private collider!: Collider;
  private remotes!: Remotes;
  private prompt!: Phaser.GameObjects.Text;
  private bg!: Phaser.GameObjects.Image;
  private props: { img: Phaser.GameObjects.Image | null; key: string | null; i: number }[] = [];
  private talkers: { t: Talker; actor: Actor }[] = [];
  private focus: Focus = null;
  private steam: Phaser.GameObjects.Arc[] = [];
  private offs: (() => void)[] = [];
  // station
  private train?: Phaser.GameObjects.Image;
  private trainState: "away" | "arriving" | "stopped" | "leaving" = "away";
  private trainClock = 2500;
  private crowd: Actor[] = [];

  constructor() {
    super("interior");
  }

  private city: City = "mumbai";

  init(d: { kind: InteriorKind; year?: number; shirt?: string; city?: City }) {
    this.city = d.city ?? (this.registry.get("city") as City) ?? "mumbai";
    // Phaser reuses the scene object, so everything from the last visit starts fresh here
    this.props = [];
    this.talkers = [];
    this.focus = null;
    this.steam = [];
    this.offs = [];
    this.train = undefined;
    this.trainState = "away";
    this.trainClock = 2500;
    this.crowd = [];
    this.spec = INTERIORS_BY_CITY[this.city][d.kind];
    this.year = d.year ?? (this.registry.get("year") as number) ?? 2026;
    this.shirt = d.shirt ?? (this.registry.get("shirt") as string) ?? this.shirt;
  }

  create() {
    const s = this.spec;
    ensureAllLooks(this);
    const look = ensurePlayerLook(this, this.shirt);
    this.cameras.main.setBackgroundColor("#1a2544");
    this.cameras.main.setBounds(0, 0, s.w, s.h);
    this.cameras.main.setRoundPixels(true);
    this.bg = this.add.image(0, 0, this.bgTexture()).setOrigin(0, 0).setDepth(-1);
    s.props.forEach((_, i) => this.props.push({ img: null, key: null, i }));
    this.collider = new Collider([], (x, y) => x < 0 || y < 0 || x >= s.w || y >= s.h);
    this.refreshProps();

    this.player = new Actor(this, look, s.spawn.x, s.spawn.y);
    this.player.facing = s.kind === "station" ? "right" : "up";
    this.keeper = new Actor(this, s.keeper.look, s.keeper.x, s.keeper.y);
    this.keeper.animate(0);
    for (const t of s.talkers) {
      const a = new Actor(this, t.look, t.x, t.y);
      a.facing = t.facing;
      a.animate(0);
      this.talkers.push({ t, actor: a });
    }

    const zoomFit = Math.min(this.scale.width / s.w, this.scale.height / s.h);
    setupZoom(this, Math.max(1, zoomFit * 0.9), 5, Math.max(2, zoomFit));
    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
    this.controls = new Controls(this, () => this.interact());
    this.prompt = makePrompt(this);
    this.remotes = new Remotes(this, `${this.city}:${s.kind}`);
    myBubbles(this, () => this.player);

    if (s.kind === "chai") this.time.addEvent({ delay: 260, loop: true, callback: () => this.puff() });
    if (s.kind === "station") this.setupStation();

    this.offs.push(
      bus.on("year", (y: number) => {
        this.year = y;
        this.registry.set("year", y);
        this.bg.setTexture(this.bgTexture());
        this.refreshProps();
        if (this.train) this.train.setTexture(this.trainKey());
      }),
    );
    this.events.once("shutdown", () => this.offs.forEach((o) => o()));
    this.registry.set("scene", s.kind);
    bus.emit("scene", s.kind);
    bus.emit("near", null);
  }

  private bgTexture() {
    const key = `bg:${this.spec.bgKey(this.year)}`;
    if (!this.textures.exists(key)) addTexture(this, key, this.spec.bg(this.year));
    return key;
  }

  private refreshProps() {
    const rects: Rect[] = [...this.spec.walls];
    for (const slot of this.props) {
      const pr = this.spec.props[slot.i];
      const key = pr.key(this.year);
      if (key !== slot.key) {
        slot.img?.destroy();
        slot.img = null;
        slot.key = key;
        if (key !== "none") {
          const tex = `ip:${key}`;
          if (!this.textures.exists(tex)) addTexture(this, tex, pr.draw(this.year));
          slot.img = this.add.image(pr.x, pr.y, tex).setOrigin(0, 1).setDepth(pr.y);
        }
      }
      if (slot.img && pr.solid !== null) {
        const [sx, sy, sw, sh] = pr.solid ?? [0, -12, slot.img.width, 12];
        rects.push([pr.x + sx, pr.y + sy, sw, sh]);
      }
    }
    // the keeper's spot behind the counter is never walkable
    rects.push([this.spec.keeper.x - 8, this.spec.keeper.y - 8, 16, 10]);
    this.collider.setRects(rects);
  }

  private puff() {
    // steam from the big kettle
    const c = this.add.circle(176 + Math.random() * 8, 40, 2 + Math.random() * 2, 0xffffff, 0.7).setDepth(9000);
    this.tweens.add({ targets: c, y: 10, alpha: 0, scale: 2, duration: 1400, onComplete: () => c.destroy() });
    this.steam.push(c);
  }

  // ---------------------------------------------------------------- station: trains and crowds
  private trainKey() {
    if (this.city === "delhi") {
      if (!this.textures.exists("stationTrain:delhi")) addTexture(this, "stationTrain:delhi", I.stationTrain(D.delhiMetroCoach(), D.delhiMetroCoach(), 4));
      return "stationTrain:delhi";
    }
    const liv = this.year >= 2010 ? "new" : "old";
    const key = `stationTrain:${liv}`;
    if (!this.textures.exists(key)) addTexture(this, key, I.stationTrain(V.localCoach(liv, true, 0.7, 3), V.localCab(liv), 4));
    return key;
  }

  private setupStation() {
    this.train = this.add.image(this.spec.w + 60, TRACK_BOTTOM, this.trainKey()).setOrigin(0, 1).setDepth(TRACK_BOTTOM);
    for (let i = 0; i < 9; i++) this.addCommuter(60 + Math.random() * 620, PLATFORM_Y + 20 + Math.random() * 36);
    // people waiting on the far platform
    for (let i = 0; i < 10; i++) {
      const a = new Actor(this, WALKER_LOOKS[i % WALKER_LOOKS.length], 40 + i * 70 + Math.random() * 20, TRACK_BOTTOM + 40 + Math.random() * 40);
      a.facing = "up";
      a.animate(0);
    }
  }

  private addCommuter(x: number, y: number) {
    const a = new Actor(this, WALKER_LOOKS[Math.floor(Math.random() * WALKER_LOOKS.length)], x, y);
    a.facing = "down";
    a.animate(0);
    this.crowd.push(a);
  }

  private updateStation(dtMs: number) {
    const t = this.train!;
    const stopX = 20;
    this.trainClock -= dtMs;
    if (this.trainState === "away" && this.trainClock <= 0) {
      this.trainState = "arriving";
      t.x = this.spec.w + 40;
    } else if (this.trainState === "arriving") {
      const dist = t.x - stopX;
      t.x -= Math.max(18, Math.min(260, dist * 1.4)) * (dtMs / 1000);
      if (dist <= 1) {
        t.x = stopX;
        this.trainState = "stopped";
        this.trainClock = 5500;
        this.cameras.main.shake(120, 0.002);
      }
    } else if (this.trainState === "stopped") {
      // commuters squeeze in
      for (const a of this.crowd) {
        if (!a.sprite.visible) continue;
        a.moving = true;
        a.facing = "down";
        a.place(a.x, a.y + 20 * (dtMs / 1000));
        a.animate(dtMs);
        if (a.y > PLATFORM_EDGE - 8) a.setVisible(false);
      }
      if (this.trainClock <= 0) this.trainState = "leaving";
    } else if (this.trainState === "leaving") {
      t.x -= Math.min(320, (stopX - t.x + 10) * 2.2) * (dtMs / 1000) + 0.5;
      if (t.x < -t.width - 20) {
        this.trainState = "away";
        this.trainClock = 6000 + Math.random() * 4000;
        this.crowd.forEach((a) => a.destroy());
        this.crowd = [];
        for (let i = 0; i < 8; i++) this.addCommuter(60 + Math.random() * 620, PLATFORM_Y + 20 + Math.random() * 30);
      }
    }
  }

  // ---------------------------------------------------------------- interaction
  private interact() {
    const f = this.focus;
    if (!f) return;
    if (f.kind === "exit") this.leave();
    else if (f.kind === "keeper") bus.emit("enter", this.spec.keeper.shop);
    else bus.emit("talk", { name: f.t.name, look: f.t.look, lines: f.t.lines(this.year) });
  }

  private leave() {
    this.scene.start("city", { year: this.year, shirt: this.shirt, city: this.city });
  }

  update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;
    const { dx, dy } = this.controls.read();
    const p = this.player;
    const moving = Math.abs(dx) + Math.abs(dy) > 0.1;
    if (moving) {
      const [nx, ny] = slide(this.collider, p.x, p.y, dx * SPEED * dt, dy * SPEED * dt);
      p.place(nx, ny);
      p.facing = facingFrom(dx, dy, p.facing);
    }
    p.moving = moving;
    p.animate(dtMs);
    bus.emit("self", { x: p.x, y: p.y, dir: p.facing, moving, scene: `${this.city}:${this.spec.kind}` });

    // walking onto the door mat takes you out
    const e = this.spec.exit;
    if (moving && p.x > e.x - 14 && p.x < e.x + e.w + 14 && p.y > e.y - 6 && p.y < e.y + e.h + 10) return this.leave();

    // rooms smaller than the screen sit in the middle of it
    const cam = this.cameras.main;
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    const s = this.spec;
    cam.setBounds(s.w < vw ? (s.w - vw) / 2 : 0, s.h < vh ? (s.h - vh) / 2 : 0, Math.max(s.w, vw), Math.max(s.h, vh));
    if (this.spec.kind === "station") this.updateStation(dtMs);
    this.updateFocus();
    this.remotes.update(dtMs);
  }

  private updateFocus() {
    const p = this.player;
    const k = this.spec.keeper;
    let best: Focus = null;
    let bestD = 44;
    const dk = Math.hypot(k.x - p.x, k.y - p.y);
    if (dk < bestD) {
      best = { kind: "keeper" };
      bestD = dk;
    }
    for (const tk of this.talkers) {
      const d = Math.hypot(tk.actor.x - p.x, tk.actor.y - p.y);
      if (d < Math.min(bestD, 26)) {
        best = { kind: "talker", t: tk.t, actor: tk.actor };
        bestD = d;
      }
    }
    this.focus = best;
    if (best) {
      const label = best.kind === "keeper" ? `E  Talk to ${k.name}` : "E  Talk";
      const ax = best.kind === "keeper" ? k.x : best.kind === "talker" ? best.actor.x : 0;
      const ay = best.kind === "keeper" ? k.y - 30 : best.kind === "talker" ? best.actor.y - 30 : 0;
      this.prompt.setText(label).setPosition(Math.round(ax), Math.round(ay)).setVisible(true);
    } else this.prompt.setVisible(false);
  }
}
