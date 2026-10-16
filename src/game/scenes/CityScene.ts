import Phaser from "phaser";
import { bus } from "@/lib/bus";
import { itemById, pointAt } from "@/lib/data";
import * as A from "../art/buildings";
import { OUTLINE, Px, textWidth } from "../art/px";
import * as V from "../art/vehicles";
import {
  DOORS,
  FOOT_N,
  FOOT_S,
  LANE_EAST_Y,
  LANE_WEST_Y,
  ROAD,
  SEA_X,
  SPAWN,
  T,
  TRACK_X,
  TRACKS,
  WORLD_H,
  WORLD_W,
  blockedTiles,
  drawGround,
  foam,
  placements,
  seaTile,
  type Door,
  type Placement,
} from "../world/mumbai";
import { TALKERS, WALKER_LOOKS, receipts, receiptText, type Receipt, type Talker } from "../world/life";
import {
  Actor,
  Collider,
  Controls,
  Remotes,
  addTexture,
  defaultZoom,
  ensureAllLooks,
  ensurePlayerLook,
  facingFrom,
  makePrompt,
  myBubbles,
  setupZoom,
  slide,
  type Rect,
} from "./common";

interface Vehicle {
  img: Phaser.GameObjects.Image;
  speed: number;
}
interface Walker {
  actor: Actor;
  speed: number;
}

const SPEED = 62; // px per second on foot
const VIADUCT_Y = 36 * T - 30; // deck height: up above the road divider
const RECEIPT_KEY = "tnm-receipts";

export class CityScene extends Phaser.Scene {
  private year = 2026;
  private shirt = "#2f6fb3";
  private player!: Actor;
  private controls!: Controls;
  private collider!: Collider;
  private blocked!: boolean[][];
  private remotes!: Remotes;
  private prompt!: Phaser.GameObjects.Text;
  private ground!: Phaser.GameObjects.Image;
  private groundEra = -1;
  private sea!: Phaser.GameObjects.TileSprite;
  private foamImgs: Phaser.GameObjects.Image[] = [];
  private placed = new Map<string, { pl: Placement; img: Phaser.GameObjects.Image | null; key: string | null }>();
  private tags: Phaser.GameObjects.Image[] = [];
  private vehicles: Vehicle[] = [];
  private laneClock = [0, 0];
  private walkers: Walker[] = [];
  private talkers: { t: Talker; actor: Actor }[] = [];
  private trains: { img: Phaser.GameObjects.Image; speed: number }[] = [];
  private trainClock = [4000, 9000];
  private viaduct?: Phaser.GameObjects.Image;
  private metro?: Phaser.GameObjects.Image;
  private metroClock = 0;
  private pigeons: { img: Phaser.GameObjects.Image; home: [number, number]; flying: number; clock: number }[] = [];
  private receiptImgs: { r: Receipt; img: Phaser.GameObjects.Image }[] = [];
  private focus: { kind: "door"; door: Door } | { kind: "talker"; t: Talker; actor: Actor } | null = null;
  private lastNear: string | null = null;
  private offs: (() => void)[] = [];

  constructor() {
    super("city");
  }

  init(d: { year?: number; shirt?: string; at?: { x: number; y: number } }) {
    // Phaser reuses the scene object, so everything from the last visit starts fresh here
    this.groundEra = -1;
    this.foamImgs = [];
    this.placed = new Map();
    this.tags = [];
    this.vehicles = [];
    this.laneClock = [0, 0];
    this.walkers = [];
    this.talkers = [];
    this.trains = [];
    this.trainClock = [4000, 9000];
    this.metroClock = 0;
    this.pigeons = [];
    this.receiptImgs = [];
    this.parked = [];
    this.dogs = [];
    this.focus = null;
    this.lastNear = null;
    this.offs = [];
    this.year = d.year ?? (this.registry.get("year") as number) ?? 2026;
    this.shirt = d.shirt ?? (this.registry.get("shirt") as string) ?? this.shirt;
    this.registry.set("year", this.year);
    this.registry.set("shirt", this.shirt);
    this.registry.set("spawn", d.at ?? this.registry.get("spawn") ?? SPAWN);
  }

  create() {
    ensureAllLooks(this);
    const look = ensurePlayerLook(this, this.shirt);
    this.makeStaticTextures();
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor("#2f6f8f");

    // sea, foam, ground
    this.sea = this.add.tileSprite(0, 0, SEA_X * T + 8, WORLD_H, "sea0").setOrigin(0, 0).setDepth(-3);
    for (let y = 0; y < WORLD_H; y += 64) this.foamImgs.push(this.add.image(SEA_X * T - 8, y, "foam0").setOrigin(0, 0).setDepth(-2));
    this.ground = this.add.image(0, 0, "ground").setOrigin(0, 0).setDepth(-1);
    this.refreshGround(true);

    // buildings and props
    for (const pl of placements()) this.placed.set(pl.id, { pl, img: null, key: null });
    this.blocked = blockedTiles();
    this.collider = new Collider([], (x, y) => {
      const tx = Math.floor(x / T);
      const ty = Math.floor(y / T);
      return tx < 0 || ty < 0 || tx >= this.blocked[0].length || ty >= this.blocked.length || this.blocked[ty][tx];
    });
    this.refreshPlacements();

    // the rail bridge over the road, and the metro (from 2014)
    for (const tx of TRACKS) this.add.image(tx * T - 8, ROAD.y0 * T - 2 * T, "bridge").setOrigin(0, 0).setDepth(5000);
    this.viaduct = this.add.image(17 * T, VIADUCT_Y, "viaduct").setOrigin(0, 0).setDepth(7000);
    this.metro = this.add.image(-400, VIADUCT_Y + 4, "metro").setOrigin(0, 1).setDepth(7001);
    const deckMask = this.make.graphics({}, false).fillRect(17 * T, VIADUCT_Y - 40, (TRACKS[0] - 17) * T, 50);
    this.metro.setMask(deckMask.createGeometryMask());

    // player
    const spawn = this.registry.get("spawn") as { x: number; y: number };
    this.player = new Actor(this, look, spawn.x, spawn.y);
    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
    setupZoom(this, 1, 5, defaultZoom(this));
    this.controls = new Controls(this, () => this.interact());
    this.prompt = makePrompt(this);
    this.remotes = new Remotes(this, "city");
    myBubbles(this, () => this.player);

    // people, birds, receipts
    for (const t of TALKERS) {
      const a = new Actor(this, t.look, t.x, t.y);
      a.facing = t.facing;
      a.animate(0);
      this.talkers.push({ t, actor: a });
    }
    for (let i = 0; i < 6; i++) this.spawnWalker(Math.random() * WORLD_W);
    for (let i = 0; i < 9; i++) {
      const home: [number, number] = [990 + Math.random() * 80, 492 + Math.random() * 24];
      const img = this.add.image(home[0], home[1], "pigeon0").setOrigin(0.5, 1).setDepth(home[1]).setFlipX(Math.random() < 0.5);
      this.pigeons.push({ img, home, flying: 0, clock: Math.random() * 1000 });
    }
    const got = collected();
    for (const r of receipts()) {
      if (got.has(r.id)) continue;
      const img = this.add.image(r.x, r.y, "receipt").setOrigin(0.5, 1).setDepth(r.y);
      this.tweens.add({ targets: img, y: r.y - 3, duration: 700, yoyo: true, repeat: -1, ease: "Sine.InOut" });
      this.receiptImgs.push({ r, img });
    }

    for (let i = 0; i < 8; i++) this.spawnVehicle(i % 2, Math.random() * WORLD_W);
    this.addStreetLife();
    this.applyYear(true);

    this.offs.push(
      bus.on("year", (y: number) => {
        this.year = y;
        this.registry.set("year", y);
        this.applyYear(false);
      }),
    );
    this.events.once("shutdown", () => this.offs.forEach((o) => o()));
    this.registry.set("scene", "city");
    bus.emit("scene", "city");
    bus.emit("near", null);
  }

  // ---------------------------------------------------------------- textures made once
  private makeStaticTextures() {
    if (this.textures.exists("bridge")) return;
    for (let f = 0; f < 2; f++) {
      addTexture(this, `sea${f}`, seaTile(f));
      addTexture(this, `foam${f}`, foam(f));
    }
    addTexture(this, "pigeon0", A.pigeon(0));
    addTexture(this, "pigeon1", A.pigeon(1));
    addTexture(this, "receipt", A.receipt());
    addTexture(this, "v:taxiOld", V.taxiOld());
    addTexture(this, "v:taxiNew", V.taxiNew());
    V.CAR_COLOURS.forEach((c, i) => addTexture(this, `v:car${i}`, V.car(c, i % 2 === 0)));
    addTexture(this, "v:auto0", V.auto(false));
    addTexture(this, "v:auto1", V.auto(true));
    addTexture(this, "v:bus", V.bestBus(false));
    addTexture(this, "v:bus2", V.bestBus(true));
    addTexture(this, "v:bus:L", V.bestBus(false, true));
    addTexture(this, "v:bus2:L", V.bestBus(true, true));
    addTexture(this, "v:scooter", V.scooter());
    addTexture(this, "train:old", V.localRoof("old", 6));
    addTexture(this, "train:new", V.localRoof("new", 6));
    addTexture(this, "metro", metroTrain());
    addTexture(this, "bridge", bridge());
    addTexture(this, "viaduct", viaduct());
  }

  private refreshGround(force: boolean) {
    const e = this.year >= 2014 ? 1 : 0;
    if (!force && e === this.groundEra) return;
    this.groundEra = e;
    addTexture(this, "ground", drawGround(this.year));
    this.ground.setTexture("ground");
  }

  private refreshPlacements() {
    const rects: Rect[] = [];
    for (const [id, s] of this.placed) {
      const key = s.pl.key(this.year);
      if (key !== s.key) {
        s.img?.destroy();
        s.img = null;
        s.key = key;
        if (key) {
          const tex = `pl:${key}`;
          if (!this.textures.exists(tex)) addTexture(this, tex, s.pl.draw(this.year));
          s.img = this.add.image(s.pl.x, s.pl.y, tex).setOrigin(0, 1).setDepth(s.pl.y);
          s.img.setName(id);
        }
      }
      if (s.img && s.pl.solid !== null) {
        const [sx, sy, sw, sh] = s.pl.solid ?? [0, -Math.round(s.img.height * 0.8), s.img.width, Math.round(s.img.height * 0.8)];
        rects.push([s.pl.x + sx, s.pl.y + sy, sw, sh]);
      }
    }
    this.collider.setRects(rects);
  }

  /** Price tags over the shops, drawn in the pixel font so they stay crisp at any zoom. */
  private refreshTags() {
    this.tags.forEach((t) => t.destroy());
    this.tags = [];
    const tag = (x: number, y: number, text: string) => {
      const key = `tag:${text}`;
      if (!this.textures.exists(key)) {
        const w = textWidth(text) + 6;
        const p = new Px(w + 2, 11);
        p.rect(1, 1, w, 9, "#f2c230");
        p.text(4, 3, text, "#1c1c22");
        p.outline(OUTLINE);
        addTexture(this, key, p);
      }
      this.tags.push(this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(8000));
    };
    const pr = (id: string) => `RS${Math.round(pointAt(itemById(id), this.year).price)}`;
    tag(358, 452, `CHAI ${pr("chai")}`);
    tag(680, 452, `VADA PAV ${pr("vadapav")}`);
    tag(855, 452, `ONION ${pr("onion")} MILK ${pr("milk")}`);
    tag(1168, 300, `TICKET ${pr("train")}`);
    tag(800, 660, `AUTO ${pr("auto")}  PETROL ${pr("petrol")}`);
  }

  private applyYear(first: boolean) {
    this.refreshGround(first);
    this.refreshPlacements();
    this.refreshTags();
    this.parkCars();
    const metroOn = this.year >= 2014;
    this.viaduct?.setVisible(metroOn);
    this.metro?.setVisible(metroOn);
    // retire vehicles that don't belong in this year
    if (!first) {
      this.vehicles.forEach((v) => v.img.destroy());
      this.vehicles = [];
      for (let i = 0; i < 8; i++) this.spawnVehicle(i % 2, Math.random() * WORLD_W);
    }
  }

  // ---------------------------------------------------------------- parked cars, dogs, cricket on the maidan
  private parked: Phaser.GameObjects.Image[] = [];
  private dogs: { img: Phaser.GameObjects.Image; vx: number; clock: number }[] = [];
  private ball?: Phaser.GameObjects.Image;

  private addStreetLife() {
    addTexture(this, "dog0", A.dog(0));
    addTexture(this, "dog1", A.dog(1));
    addTexture(this, "ball", A.cricketBall());
    addTexture(this, "stumps", A.stumps());
    for (const [x, y] of [
      [600, 860],
      [1260, 470],
    ]) {
      const img = this.add.image(x, y, "dog0").setOrigin(0.5, 1).setDepth(y);
      this.dogs.push({ img, vx: 14, clock: 0 });
    }
    // a gully cricket match: bowler, batter, keeper, fielders
    const pitchY = 63 * T + 16;
    this.add.image(28 * T + 4, pitchY + 6, "stumps").setOrigin(0.5, 1).setDepth(pitchY + 6);
    this.add.image(34 * T - 4, pitchY + 6, "stumps").setOrigin(0.5, 1).setDepth(pitchY + 6);
    const players: [string, number, number, "left" | "right" | "down" | "up"][] = [
      ["student", 28 * T + 16, pitchY + 6, "right"],
      ["techie", 34 * T + 10, pitchY + 6, "left"],
      ["student", 34 * T + 26, pitchY + 6, "left"],
      ["college", 31 * T, pitchY - 40, "down"],
      ["office", 24 * T, pitchY + 30, "right"],
      ["student", 38 * T, pitchY + 44, "left"],
    ];
    for (const [look, x, y, f] of players) {
      const a = new Actor(this, look, x, y);
      a.facing = f;
      a.animate(0);
    }
    this.ball = this.add.image(34 * T, pitchY, "ball").setDepth(pitchY + 20);
    const bowl = () => {
      if (!this.ball?.active) return;
      this.ball.setPosition(34 * T - 4, pitchY - 4);
      this.tweens.add({
        targets: this.ball,
        x: 28 * T + 20,
        duration: 700,
        ease: "Sine.In",
        onUpdate: (tw) => this.ball?.setY(pitchY - 4 - Math.sin(tw.progress * Math.PI) * 10),
        onComplete: () => {
          // and the batter hits it somewhere into the field
          const tx = 24 * T + Math.random() * 18 * T;
          const ty = 60 * T + Math.random() * 10 * T;
          this.tweens.add({
            targets: this.ball,
            x: tx,
            y: ty,
            duration: 1100,
            ease: "Quad.Out",
            onComplete: () => this.time.delayedCall(1500, bowl),
          });
        },
      });
    };
    this.time.delayedCall(1000, bowl);
  }

  private parkCars() {
    this.parked.forEach((p) => p.destroy());
    this.parked = [];
    const spots: [number, number, boolean][] = [
      [216, 300, false],
      [216, 760, false],
      [430, 690, true],
      [600, 720, false],
      [1480, 548, true],
      [1460, 760, false],
      [940, 690, true],
    ];
    spots.forEach(([x, y, flip], i) => {
      const key = i % 3 === 0 ? (this.year >= 2005 ? "v:auto1" : "v:auto0") : i % 3 === 1 ? (this.year < 2023 && i < 4 ? "v:taxiOld" : "v:taxiNew") : `v:car${i % V.CAR_COLOURS.length}`;
      if (key === "v:taxiNew" && this.year < 2008) return;
      this.parked.push(this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y).setFlipX(flip));
    });
  }

  // ---------------------------------------------------------------- traffic, trains, people
  private pickVehicle(): string {
    const y = this.year;
    const t = (y - 1995) / 31;
    const r = Math.random();
    if (r < 0.1) return y < 2023 && Math.random() < 0.5 - t * 0.4 ? "v:bus2" : "v:bus";
    if (r < 0.1 + 0.12 + t * 0.3) return `v:car${Math.floor(Math.random() * V.CAR_COLOURS.length)}`;
    if (r < 0.22 + t * 0.3 + 0.05 + t * 0.12) return "v:scooter";
    if (r < 0.75) return y >= 2005 ? "v:auto1" : "v:auto0";
    const padminiShare = y >= 2023 ? 0 : y < 2008 ? 1 : 1 - (y - 2008) / 15;
    return Math.random() < padminiShare ? "v:taxiOld" : "v:taxiNew";
  }

  private spawnVehicle(lane: number, atX?: number) {
    const east = lane === 1;
    const key = this.pickVehicle();
    const laneY = east ? LANE_EAST_Y : LANE_WEST_Y;
    const x = atX ?? (east ? -100 : WORLD_W + 100);
    // buses have lettering, so they get their own left-facing texture instead of a mirror image
    const lettered = key.startsWith("v:bus");
    const img = this.add
      .image(x, laneY, lettered && !east ? `${key}:L` : key)
      .setOrigin(0.5, 1)
      .setDepth(laneY)
      .setFlipX(!east && !lettered);
    const base = east ? 74 : 64;
    this.vehicles.push({ img, speed: (east ? 1 : -1) * base });
  }

  private spawnWalker(atX?: number) {
    const look = WALKER_LOOKS[Math.floor(Math.random() * WALKER_LOOKS.length)];
    const north = Math.random() < 0.5;
    const right = Math.random() < 0.5;
    const y = north ? FOOT_N * T + 22 + Math.random() * 6 : FOOT_S * T + 10 + Math.random() * 10;
    const x = atX ?? (right ? 280 : WORLD_W + 20);
    const actor = new Actor(this, look, x, y);
    actor.moving = true;
    actor.facing = right ? "right" : "left";
    this.walkers.push({ actor, speed: (right ? 1 : -1) * (24 + Math.random() * 12) });
  }

  // ---------------------------------------------------------------- interaction
  private interact() {
    const f = this.focus;
    if (!f) return;
    if (f.kind === "door") {
      const d = f.door;
      if (d.interior) {
        this.registry.set("spawn", { x: this.player.x, y: this.player.y + 10 });
        this.scene.start("interior", { kind: d.interior, year: this.year, shirt: this.shirt });
      } else bus.emit("enter", d.id);
    } else {
      bus.emit("talk", { name: f.t.name, look: f.t.look, lines: f.t.lines(this.year) });
    }
  }

  update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;

    // sea shimmer
    this.sea.tilePositionX -= dt * 4;
    this.sea.tilePositionY += dt * 2;
    const ff = Math.floor(this.time.now / 500) % 2;
    this.foamImgs.forEach((f) => f.setTexture(`foam${ff}`));

    // player
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
    bus.emit("self", { x: p.x, y: p.y, dir: p.facing, moving, scene: "city" });

    // traffic
    for (let lane = 0; lane < 2; lane++) {
      this.laneClock[lane] += dtMs;
      const gap = 1400 + Math.max(0, 2026 - this.year) * 50;
      if (this.laneClock[lane] > gap + Math.random() * 1200) {
        this.laneClock[lane] = 0;
        this.spawnVehicle(lane);
      }
    }
    this.vehicles = this.vehicles.filter((v) => {
      v.img.x += v.speed * dt;
      const gone = v.img.x < -140 || v.img.x > WORLD_W + 140;
      if (gone) v.img.destroy();
      return !gone;
    });

    // trains run north-south and cross the road on the bridge
    for (let i = 0; i < 2; i++) {
      this.trainClock[i] -= dtMs;
      if (this.trainClock[i] <= 0) {
        this.trainClock[i] = 14000 + Math.random() * 8000;
        const down = i === 0;
        const key = this.year >= 2010 ? "train:new" : "train:old";
        const h = this.textures.get(key).getSourceImage().height;
        const img = this.add.image(TRACK_X[i], down ? -h : WORLD_H + h, key).setOrigin(0.5, 0).setDepth(6000);
        this.trains.push({ img, speed: down ? 190 : -190 });
      }
    }
    this.trains = this.trains.filter((tr) => {
      tr.img.y += tr.speed * dt;
      const gone = tr.img.y > WORLD_H + 40 || tr.img.y < -tr.img.height - 40;
      if (gone) tr.img.destroy();
      return !gone;
    });

    // metro over the road
    if (this.metro?.visible) {
      this.metroClock += dtMs;
      this.metro.x += 110 * dt;
      if (this.metro.x > TRACKS[0] * T) {
        if (this.metroClock > 12000) {
          this.metroClock = 0;
          this.metro.x = 17 * T - this.metro.width;
        } else this.metro.x = TRACKS[0] * T;
      }
    }

    // walkers
    if (this.walkers.length < 10 && Math.random() < dt * 0.4) this.spawnWalker();
    this.walkers = this.walkers.filter((w) => {
      w.actor.place(w.actor.x + w.speed * dt, w.actor.y);
      w.actor.animate(dtMs);
      const gone = w.actor.x < 260 || w.actor.x > WORLD_W + 30;
      if (gone) w.actor.destroy();
      return !gone;
    });

    // pigeons scatter when you walk through the kabutarkhana
    for (const b of this.pigeons) {
      const near = Math.hypot(b.img.x - p.x, b.img.y - p.y) < 34;
      if (near && !b.flying) b.flying = 1;
      if (b.flying) {
        b.flying += dtMs;
        b.img.setTexture(`pigeon${Math.floor(b.flying / 90) % 2}`);
        b.img.y -= 70 * dt;
        b.img.x += (b.img.flipX ? -1 : 1) * 40 * dt;
        b.img.setDepth(9000);
        if (b.flying > 5000) {
          b.flying = 0;
          b.img.setPosition(b.home[0], b.home[1]).setDepth(b.home[1]).setTexture("pigeon0");
        }
      } else {
        b.clock += dtMs;
        b.img.setTexture(b.clock % 1600 < 200 ? "pigeon1" : "pigeon0");
      }
    }

    // stray dogs trot back and forth
    for (const d of this.dogs) {
      d.clock += dtMs;
      d.img.x += d.vx * dt;
      if (d.clock > 5000) {
        d.clock = 0;
        d.vx = -d.vx;
      }
      d.img.setFlipX(d.vx < 0).setTexture(`dog${Math.floor(d.clock / 200) % 2}`);
    }

    // receipts
    for (const it of this.receiptImgs) {
      if (!it.img.active) continue;
      if (Math.hypot(it.r.x - p.x, it.r.y - p.y) < 14) {
        it.img.destroy();
        const got = collected();
        got.add(it.r.id);
        saveCollected(got);
        bus.emit("receipt", { ...receiptText(it.r), count: got.size, total: receipts().length });
      }
    }

    this.updateFocus();
    this.remotes.update(dtMs);
  }

  private updateFocus() {
    const p = this.player;
    let best: CityScene["focus"] = null;
    let bestD = 30;
    for (const d of DOORS) {
      const cx = Math.max(d.x, Math.min(p.x, d.x + d.w));
      const cy = Math.max(d.y - 6, Math.min(p.y, d.y + d.h));
      const dist = Math.hypot(cx - p.x, cy - p.y);
      if (dist < bestD) {
        bestD = dist;
        best = { kind: "door", door: d };
      }
    }
    for (const tk of this.talkers) {
      const dist = Math.hypot(tk.actor.x - p.x, tk.actor.y - p.y);
      if (dist < Math.min(bestD, 26)) {
        bestD = dist;
        best = { kind: "talker", t: tk.t, actor: tk.actor };
      }
    }
    this.focus = best;
    const label = best ? (best.kind === "door" ? (best.door.interior ? `E  Enter ${best.door.label}` : `E  ${best.door.label}`) : `E  Talk`) : null;
    if (label) {
      const ax = best!.kind === "door" ? best!.door.x + best!.door.w / 2 : best!.actor.x;
      const ay = best!.kind === "door" ? best!.door.y - 8 : best!.actor.y - 30;
      this.prompt.setText(label).setPosition(Math.round(ax), Math.round(ay)).setVisible(true);
    } else this.prompt.setVisible(false);
    const nearId = best?.kind === "door" ? best.door.id : null;
    if (nearId !== this.lastNear) {
      this.lastNear = nearId;
      bus.emit("near", nearId);
    }
  }

}

function collected(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(RECEIPT_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function saveCollected(s: Set<string>) {
  try {
    localStorage.setItem(RECEIPT_KEY, JSON.stringify([...s]));
  } catch {
    /* private mode: they just won't persist */
  }
}

// ---------------------------------------------------------------- structures drawn here
function bridge(): Px {
  // steel plate-girder rail bridge across the road, seen from above
  const w = 2 * T + 16;
  const h = (ROAD.y1 - ROAD.y0 + 5) * T;
  const p = new Px(w, h);
  p.rect(4, 0, w - 8, h, "#5a6270");
  p.rect(6, 0, w - 12, h, "#8a8178");
  for (let y = 0; y < h; y += 5) p.rect(6, y, w - 12, 2, "#5a3a22");
  for (const rx of [w / 2 - 9, w / 2 + 7]) p.rect(rx, 0, 2, h, "#c9c9cf");
  for (const gx of [2, w - 6]) {
    p.rect(gx, 0, 4, h, "#3f6b8a");
    for (let y = 2; y < h; y += 6) p.px(gx + 1, y, "#8fb3c9");
  }
  p.g.fillStyle = "rgba(20,10,30,0.25)";
  p.g.fillRect(0, h - 4, w, 4);
  return p.outline(OUTLINE);
}

function viaduct(): Px {
  // Metro Line 1's elevated deck over the road (opened 2014); pillars stand on the divider
  const w = (TRACKS[0] - 17) * T;
  const pillarH = 36 * T + 8 - (VIADUCT_Y + 18);
  const p = new Px(w, 18 + pillarH);
  p.rect(0, 0, w, 14, "#c9c4b8");
  p.rect(0, 0, w, 3, "#e3ded2");
  p.rect(0, 14, w, 4, "#8f897e");
  for (let x = 40; x < w; x += 112) {
    p.rect(x, 18, 12, pillarH, "#b9b3a8");
    p.rect(x, 18, 3, pillarH, "#d6d0c4");
    p.rect(x + 9, 18, 3, pillarH, "#8f897e");
  }
  return p.outline(OUTLINE);
}

function metroTrain(): Px {
  const coach = V.metroCoach();
  const p = new Px(coach.w * 3 + 4, coach.h);
  for (let i = 0; i < 3; i++) p.draw(coach, i * (coach.w + 2), 0);
  return p;
}
