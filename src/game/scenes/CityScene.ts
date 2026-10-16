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
  CITY_X,
  blockedTiles,
  drawGround,
  tileGrid,
  foam,
  placements,
  seaTile,
  type Door,
  type Placement,
} from "../world/mumbai";
import { receipts, receiptText, type Receipt, type Talker } from "../world/life";
import { worldFor, type CityWorld } from "../world/index";
import type { City } from "@/lib/data";
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
  speech,
  setupZoom,
  slide,
  type Rect,
} from "./common";

interface Vehicle {
  img: Phaser.GameObjects.Image;
  east: boolean;
  speed: number; // current, signed
  cruise: number; // unsigned
  half: number;
  honk?: Phaser.GameObjects.Text;
  stopped: number;
}
interface Walker {
  actor: Actor;
  speed: number;
}

const SPEED = 62; // px per second on foot
const ROAD_START = 16 * T; // traffic joins the main road from the coastal road here
const VIADUCT_Y = 36 * T - 30; // deck height: up above the road divider
const RECEIPT_KEY = "tnm-receipts";

export class CityScene extends Phaser.Scene {
  private year = 2026;
  private city: City = "mumbai";
  private world!: CityWorld;
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
  private placed = new Map<string, { pl: Placement; img: Phaser.GameObjects.Image | null; key: string | null; shadow?: Phaser.GameObjects.Image }>();
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

  init(d: { year?: number; shirt?: string; at?: { x: number; y: number }; city?: City }) {
    this.city = d.city ?? (this.registry.get("city") as City) ?? "mumbai";
    this.world = worldFor(this.city);
    this.registry.set("city", this.city);
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
    this.cameras.main.setBackgroundColor("#5fb3c6");

    // sea, foam, ground
    this.sea = this.add.tileSprite(0, 0, SEA_X * T + 8, WORLD_H, "sea0").setOrigin(0, 0).setDepth(-3);
    for (let y = 0; y < WORLD_H; y += 64) this.foamImgs.push(this.add.image(SEA_X * T - 8, y, "foam0").setOrigin(0, 0).setDepth(-2));
    this.ground = this.add.image(0, 0, "ground").setOrigin(0, 0).setDepth(-1);
    this.refreshGround(true);

    // buildings and props
    for (const pl of this.world.placements()) this.placed.set(pl.id, { pl, img: null, key: null });
    this.blocked = blockedTiles(this.city);
    this.collider = new Collider([], (x, y) => {
      const tx = Math.floor(x / T);
      const ty = Math.floor(y / T);
      return tx < 0 || ty < 0 || tx >= this.blocked[0].length || ty >= this.blocked.length || this.blocked[ty][tx];
    });
    this.refreshPlacements();
    this.scatterGreenery();

    // Mumbai's rail bridge over the road, and the metro (Mumbai from 2014, Delhi from 2002)
    if (this.world.rail) for (const tx of TRACKS) {
      // the bridge's shadow falls on the road below it, so it reads as raised
      this.add.rectangle(tx * T - 2, ROAD.y0 * T, 2 * T + 22, (ROAD.y1 - ROAD.y0 + 1) * T, 0x140c1e, 0.32).setOrigin(0, 0).setDepth(1);
      this.add.image(tx * T - 8, ROAD.y0 * T - 2 * T - 10, "bridge").setOrigin(0, 0).setDepth(5000);
    }
    this.viaduct = this.add.image(17 * T, VIADUCT_Y, `viaduct:${this.city}`).setOrigin(0, 0).setDepth(7000);
    this.metro = this.add.image(-400, VIADUCT_Y + 4, `metro:${this.city}`).setOrigin(0, 1).setDepth(7001);

    // player
    const spawn = this.registry.get("spawn") as { x: number; y: number };
    this.player = new Actor(this, look, spawn.x, spawn.y);
    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
    setupZoom(this, 1, 5, defaultZoom(this));
    this.controls = new Controls(this, () => this.interact());
    this.prompt = makePrompt(this);
    this.remotes = new Remotes(this, `${this.city}:city`);
    myBubbles(this, () => this.player);

    // people, birds, receipts
    for (const t of this.world.talkers) {
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
    const got = collected(this.city);
    for (const r of receipts(this.world.ds)) {
      if (got.has(r.id)) continue;
      const img = this.add.image(r.x, r.y, "receipt").setOrigin(0.5, 1).setDepth(r.y);
      this.tweens.add({ targets: img, y: r.y - 3, duration: 700, yoyo: true, repeat: -1, ease: "Sine.InOut" });
      this.receiptImgs.push({ r, img });
    }

    this.seedTraffic();
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
    bus.emit("city", this.city);
    bus.emit("near", null);
  }

  // ---------------------------------------------------------------- textures made once
  private makeStaticTextures() {
    // each city's own vehicles and metro
    const w = this.world;
    if (!this.textures.exists(`metro:${w.id}`)) {
      for (const [k, px] of Object.entries(w.vehicleTextures())) if (!this.textures.exists(k)) addTexture(this, k, px);
      addTexture(this, `metro:${w.id}`, w.metro.train());
      addTexture(this, `viaduct:${w.id}`, viaduct(w.metro.x1));
    }
    if (this.textures.exists("bridge")) return;
    for (let f = 0; f < 2; f++) {
      addTexture(this, `sea${f}`, seaTile(f));
      addTexture(this, `foam${f}`, foam(f));
    }
    addTexture(this, "pigeon0", A.pigeon(0));
    addTexture(this, "pigeon1", A.pigeon(1));
    addTexture(this, "receipt", A.receipt());
    addTexture(this, "train:old", V.localRoof("old", 6));
    addTexture(this, "train:new", V.localRoof("new", 6));
    addTexture(this, "bridge", bridge());
  }

  /** Bushes, flower beds, rocks and tall grass on open grass, placed the same way for everyone. */
  private scatterGreenery() {
    if (!this.textures.exists("decor:bush0")) {
      for (let i = 0; i < 4; i++) {
        addTexture(this, `decor:bush${i}`, A.bush(i, i % 2 === 1));
        addTexture(this, `decor:rock${i}`, A.rock(i));
        addTexture(this, `decor:grass${i}`, A.tallGrass(i));
        addTexture(this, `decor:bed${i}`, A.flowerBed(i));
        addTexture(this, `decor:pot${i}`, A.pottedPlant(i));
      }
    }
    const grid = tileGrid();
    const taken: Phaser.Geom.Rectangle[] = [];
    for (const s of this.placed.values()) if (s.img) taken.push(s.img.getBounds());
    for (const d of this.world.doors) taken.push(new Phaser.Geom.Rectangle(d.x - 10, d.y - 20, d.w + 20, d.h + 40));
    const r = new Phaser.Math.RandomDataGenerator(["mumbai-greenery"]);
    let placed = 0;
    for (let tries = 0; tries < 2500 && placed < 170; tries++) {
      const tx = r.between(CITY_X, grid[0].length - 1);
      const ty = r.between(2, grid.length - 1);
      if (grid[ty][tx] !== "G") continue;
      const x = tx * T + r.between(0, 12);
      const y = ty * T + r.between(4, 15);
      if (taken.some((b) => b.contains(x, y) || b.contains(x + 12, y - 8))) continue;
      const roll = r.frac();
      const kind = roll < 0.3 ? "bush" : roll < 0.58 ? "grass" : roll < 0.72 ? "rock" : roll < 0.88 ? "bed" : "pot";
      const img = this.add.image(x, y, `decor:${kind}${r.between(0, 3)}`).setOrigin(0.5, 1).setDepth(y);
      taken.push(img.getBounds());
      placed++;
    }
  }

  private refreshGround(force: boolean) {
    const e = this.year >= this.world.metro.from ? 1 : 0;
    if (!force && e === this.groundEra) return;
    this.groundEra = e;
    addTexture(this, "ground", drawGround(this.year, this.city));
    this.ground.setTexture("ground");
  }

  private refreshPlacements() {
    const rects: Rect[] = [];
    for (const [id, s] of this.placed) {
      const key = s.pl.key(this.year);
      if (key !== s.key) {
        s.img?.destroy();
        s.shadow?.destroy();
        s.img = null;
        s.shadow = undefined;
        s.key = key;
        if (key) {
          const tex = `pl:${key}`;
          if (!this.textures.exists(tex)) addTexture(this, tex, s.pl.draw(this.year));
          // a soft cast shadow: the same shape, darkened, nudged down and to the right
          s.shadow = this.add.image(s.pl.x + 7, s.pl.y + 3, tex).setOrigin(0, 1).setTint(0x2a1e3c).setTintMode(Phaser.TintModes.FILL).setAlpha(0.18).setDepth(-0.5);
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
    for (const [x, y, text] of this.world.tags(this.year)) tag(x, y, text);
  }

  private applyYear(first: boolean) {
    this.refreshGround(first);
    this.refreshPlacements();
    this.refreshTags();
    this.parkCars();
    const metroOn = this.year >= this.world.metro.from;
    this.viaduct?.setVisible(metroOn);
    this.metro?.setVisible(metroOn);
    // retire vehicles that don't belong in this year
    if (!first) {
      this.vehicles.forEach((v) => {
        v.img.destroy();
        v.honk?.destroy();
      });
      this.vehicles = [];
      this.seedTraffic();
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
      [430, 690, true],
      [600, 720, false],
      [1480, 548, true],
      [1460, 760, false],
      [940, 690, true],
    ];
    spots.forEach(([x, y, flip], i) => {
      const delhi = this.city === "delhi";
      const key =
        i % 3 === 0
          ? delhi
            ? this.year >= 2002 ? "d:auto1" : "d:auto0"
            : this.year >= 2005 ? "v:auto1" : "v:auto0"
          : i % 3 === 1
            ? delhi
              ? "d:rick"
              : this.year < 2023 && i < 4 ? "v:taxiOld" : "v:taxiNew"
            : `v:car${i % V.CAR_COLOURS.length}`;
      if (key === "v:taxiNew" && this.year < 2008) return;
      this.parked.push(this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y).setFlipX(flip));
    });
  }

  // ---------------------------------------------------------------- traffic, trains, people
  private pickVehicle(): string {
    return this.world.pickVehicle(this.year);
  }

  /** Cars already on the road when the scene opens, spaced out so none overlap. */
  private seedTraffic() {
    for (const lane of [0, 1]) for (let x = ROAD_START + 140 + Math.random() * 120; x < WORLD_W - 60; x += 230 + Math.random() * 200) this.spawnVehicle(lane, x);
  }

  private spawnVehicle(lane: number, atX?: number) {
    const east = lane === 1;
    const key = this.pickVehicle();
    const laneY = east ? LANE_EAST_Y : LANE_WEST_Y;
    const half = this.textures.get(key).getSourceImage().width / 2;
    // traffic turns in from the coastal road on the left and drives off the right edge of the map
    const x = atX ?? (east ? ROAD_START - half : WORLD_W + half);
    // never spawn on top of a car that is still pulling in
    if (atX === undefined && this.vehicles.some((v) => v.east === east && Math.abs(v.img.x - x) < half + v.half + 24)) return;
    // buses have lettering, so they get their own left-facing texture instead of a mirror image
    const lettered = key.startsWith("v:bus") || key.startsWith("d:bus");
    const img = this.add
      .image(x, laneY, lettered && !east ? `${key}:L` : key)
      .setOrigin(0.5, 1)
      .setDepth(laneY)
      .setFlipX(!east && !lettered);
    const cruise = (east ? 74 : 64) * (key === "v:scooter" ? 1.15 : lettered ? 0.85 : key === "d:rick" ? 0.45 : 1);
    this.vehicles.push({ img, east, speed: (east ? 1 : -1) * cruise, cruise, half, stopped: 0 });
  }

  /** Cars keep their distance, brake for people in their lane, and honk if you stand there. */
  private driveTraffic(dtMs: number, dt: number) {
    const p = this.player;
    for (const v of this.vehicles) {
      const dir = v.east ? 1 : -1;
      const front = v.img.x + dir * v.half;
      const laneY = v.east ? LANE_EAST_Y : LANE_WEST_Y;
      // free road ahead, up to whatever is in front
      let room = Infinity;
      for (const o of this.vehicles) {
        if (o === v || o.east !== v.east) continue;
        const gap = v.east ? o.img.x - o.half - front : front - (o.img.x + o.half);
        if (gap > -4 && gap < room) room = gap;
      }
      const inLane = p.y > laneY - 20 && p.y < laneY + 6;
      const personAhead = inLane ? (v.east ? p.x - 6 - front : front - (p.x + 6)) : Infinity;
      const walkerAhead = this.walkers.some((w) => w.actor.y > laneY - 20 && w.actor.y < laneY + 6 && (v.east ? w.actor.x - front : front - w.actor.x) > -4 && (v.east ? w.actor.x - front : front - w.actor.x) < 40);
      const blockedBy = Math.min(room - 16, personAhead > -10 ? personAhead - 10 : Infinity, walkerAhead ? 0 : Infinity);
      const target = blockedBy <= 0 ? 0 : blockedBy < 50 ? (v.cruise * blockedBy) / 50 : v.cruise;
      const cur = Math.abs(v.speed);
      const next = target < cur ? Math.max(target, cur - 260 * dt) : Math.min(target, cur + 70 * dt);
      v.speed = dir * next;
      v.img.x += v.speed * dt;
      // standing in front of a car earns you a horn
      if (next < 4 && personAhead < 30) {
        v.stopped += dtMs;
        if (v.stopped > 500 && !v.honk) {
          v.honk = speech(this, "HONK! HONK!").setPosition(front, laneY - v.img.height - 2);
          this.time.delayedCall(1200, () => {
            v.honk?.destroy();
            v.honk = undefined;
          });
          v.stopped = -1500;
        }
      } else if (next > 10) v.stopped = 0;
    }
    this.vehicles = this.vehicles.filter((v) => {
      const gone = v.east ? v.img.x - v.half > WORLD_W + 4 : v.img.x + v.half < ROAD_START - 4;
      if (gone) {
        v.img.destroy();
        v.honk?.destroy();
      }
      return !gone;
    });
  }

  private spawnWalker(atX?: number) {
    const looks = this.world.walkerLooks;
    const look = looks[Math.floor(Math.random() * looks.length)];
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
      const shut = this.world.closed?.(d, this.year);
      if (shut) bus.emit("talk", { name: d.label, look: "metrostaff", lines: [shut] });
      else if (d.interior) {
        this.registry.set("spawn", { x: this.player.x, y: this.player.y + 10 });
        this.scene.start("interior", { kind: d.interior, year: this.year, shirt: this.shirt, city: this.city });
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
    bus.emit("self", { x: p.x, y: p.y, dir: p.facing, moving, scene: `${this.city}:city` });

    // traffic
    for (let lane = 0; lane < 2; lane++) {
      this.laneClock[lane] += dtMs;
      const gap = 1400 + Math.max(0, 2026 - this.year) * 50;
      if (this.laneClock[lane] > gap + Math.random() * 1200) {
        this.laneClock[lane] = 0;
        this.spawnVehicle(lane);
      }
    }
    this.driveTraffic(dtMs, dt);
    for (const v of this.vehicles) clipLeft(v.img, ROAD_START);

    // the metro viaduct fades when you walk underneath it, so you never lose sight of yourself
    if (this.viaduct?.visible) {
      const under = p.x > 17 * T && p.x < this.world.metro.x1 && p.y > VIADUCT_Y - 6 && p.y < 36 * T + 24;
      const a = Phaser.Math.Linear(this.viaduct.alpha, under ? 0.3 : 1, Math.min(1, dt * 8));
      this.viaduct.setAlpha(a);
      this.metro?.setAlpha(a);
    }

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
      const end = this.world.metro.x1;
      clipLeft(this.metro, 17 * T);
      if (this.metro.x > end) {
        if (this.metroClock > 12000) {
          this.metroClock = 0;
          this.metro.x = 17 * T - this.metro.width;
        } else this.metro.x = end;
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
        const got = collected(this.city);
        got.add(it.r.id);
        saveCollected(this.city, got);
        bus.emit("receipt", { ...receiptText(it.r, this.world.ds), count: got.size, total: receipts(this.world.ds).length });
      }
    }

    this.updateFocus();
    this.remotes.update(dtMs);
  }

  private updateFocus() {
    const p = this.player;
    let best: CityScene["focus"] = null;
    let bestD = 30;
    for (const d of this.world.doors) {
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

/**
 * Hides the part of an image that is left of minX: vehicles turning in from the side road, the metro
 * gliding onto its viaduct. (Cropping is cheaper and more reliable than a mask here.)
 */
function clipLeft(img: Phaser.GameObjects.Image, minX: number) {
  const w = img.frame.realWidth;
  const h = img.frame.realHeight;
  const left = img.x - img.originX * w;
  const hidden = Phaser.Math.Clamp(minX - left, 0, w);
  if (hidden <= 0) {
    if (img.isCropped) img.setCrop();
    return;
  }
  // with flipX the texture is mirrored, so the hidden screen-left part is the texture's right part
  if (img.flipX) img.setCrop(0, 0, w - hidden, h);
  else img.setCrop(hidden, 0, w - hidden, h);
}

// each city keeps its own receipts (Mumbai keeps the original key so nobody loses progress)
const receiptKey = (city: City) => (city === "mumbai" ? RECEIPT_KEY : `${RECEIPT_KEY}-${city}`);
function collected(city: City): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(receiptKey(city)) ?? "[]"));
  } catch {
    return new Set();
  }
}
function saveCollected(city: City, s: Set<string>) {
  try {
    localStorage.setItem(receiptKey(city), JSON.stringify([...s]));
  } catch {
    /* private mode: they just won't persist */
  }
}

// ---------------------------------------------------------------- structures drawn here
function bridge(): Px {
  // a raised steel rail bridge: girders, a walkway rail, stone abutments on each footpath
  const w = 2 * T + 16;
  const h = (ROAD.y1 - ROAD.y0 + 5) * T;
  const p = new Px(w, h);
  p.rect(6, 0, w - 12, h, "#8a8178");
  for (let y = 0; y < h; y += 5) p.rect(6, y, w - 12, 2, "#5a3a22");
  for (const rx of [w / 2 - 9, w / 2 + 7]) p.rect(rx, 0, 2, h, "#c9c9cf");
  for (const gx of [0, w - 6]) {
    p.rect(gx, 0, 6, h, "#3f6b8a");
    p.rect(gx, 0, 6, 2, "#8fb3c9");
    for (let y = 4; y < h; y += 8) p.rect(gx + 1, y, 4, 1, "#2f5570"); // rivets
  }
  // abutments where the bridge meets the footpaths
  for (const ay of [0, h - 26]) {
    p.rect(0, ay, w, 26, "#b9a98a");
    for (let y = ay + 2; y < ay + 26; y += 6) for (let x = (y / 6) % 2 ? 0 : 6; x < w; x += 12) p.rect(x, y, 11, 5, "#a8987a");
  }
  return p.outline(OUTLINE);
}

function viaduct(x1: number): Px {
  // the metro's elevated deck over the road; pillars stand on the divider
  const w = x1 - 17 * T;
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
