import Phaser from "phaser";
import { bus } from "@/lib/bus";
import { itemById, pointAt, type BuildingId } from "@/lib/data";
import { buildTextures, CAR_COLOURS } from "./textures";

// World is drawn at 1 unit = 1 screen pixel at 480x270, then scaled up crisp.
export const VIEW_W = 480;
export const VIEW_H = 270;
const WORLD_W = 1240;
const FLOOR = 200; // where feet touch the pavement
const ROAD_TOP = 208;
const ROAD_BOTTOM = 252;
const FONT = "Silkscreen";

const C = {
  ink: 0x1c1c22,
  yellow: 0xf2c230,
  red: 0xb8232f,
  cream: 0xefe3c8,
  pavement: 0x8f8a80,
  kerb: 0xc9c2b2,
  road: 0x3d3d45,
  roadLine: 0xe8e1cf,
  chawl: 0xc9a77c,
  chawlDark: 0x9c7c58,
  tin: 0x6f7f8c,
  tarp: 0x2f6fb3,
  wood: 0x7a4e2d,
  glass: 0x9fc3d6,
  glassDark: 0x5f8aa3,
  stone: 0xd7c7a3,
  stoneDark: 0xa8946c,
  green: 0x2e8b57,
};

interface Door {
  id: BuildingId;
  x: number;
  label: string;
}

const DOORS: Door[] = [
  { id: "chai", x: 150, label: "Chai tapri" },
  { id: "vadapav", x: 268, label: "Vada pav stall" },
  { id: "kirana", x: 418, label: "Kirana store" },
  { id: "station", x: 800, label: "Railway station" },
  { id: "autostand", x: 1035, label: "Auto stand" },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixColor = (a: number, b: number, t: number) => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor(
    Math.round(lerp(ca.red, cb.red, t)),
    Math.round(lerp(ca.green, cb.green, t)),
    Math.round(lerp(ca.blue, cb.blue, t)),
  );
};

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

interface Mover {
  img: Phaser.GameObjects.Image;
  speed: number;
}

export class StreetScene extends Phaser.Scene {
  year = 2026;
  private paused = false;
  private player!: Phaser.GameObjects.Image;
  private facing = 1;
  private walkClock = 0;
  private touchDir = 0;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private sky!: Phaser.GameObjects.Graphics;
  private skyline!: Phaser.GameObjects.Graphics;
  private midLayer!: Phaser.GameObjects.Graphics;
  private dynamicFront!: Phaser.GameObjects.Graphics;
  private boards: Partial<Record<BuildingId, Phaser.GameObjects.Text>> = {};
  private extraTexts: Phaser.GameObjects.Text[] = [];
  private prompt!: Phaser.GameObjects.Container;
  private promptText!: Phaser.GameObjects.Text;
  private nearDoor: Door | null = null;
  private vehicles: Mover[] = [];
  private walkers: (Mover & { frame: number; npc: number; clock: number })[] = [];
  private spawnClock = 0;
  private walkerClock = 0;
  private metro?: Phaser.GameObjects.Image;
  private metroClock = 0;
  private unsubs: (() => void)[] = [];
  private shirt = "#2f6fb3";

  constructor() {
    super("street");
  }

  init(data: { year?: number; shirt?: string }) {
    if (data.year) this.year = data.year;
    if (data.shirt) this.shirt = data.shirt;
  }

  create() {
    buildTextures(this, this.shirt);
    this.cameras.main.setBounds(0, 0, WORLD_W, VIEW_H);
    this.cameras.main.setRoundPixels(true);

    this.sky = this.add.graphics().setScrollFactor(0).setDepth(0);
    this.skyline = this.add.graphics().setScrollFactor(0.35).setDepth(1);
    this.midLayer = this.add.graphics().setScrollFactor(0.65).setDepth(2);
    this.metro = this.add.image(-200, 118, "metro").setOrigin(0, 1).setScrollFactor(0.65).setDepth(3).setVisible(false);

    const ground = this.add.graphics().setDepth(4);
    this.drawGround(ground);
    const front = this.add.graphics().setDepth(5);
    this.drawStaticBuildings(front);
    this.dynamicFront = this.add.graphics().setDepth(5);

    this.makeBoards();

    this.player = this.add.image(70, FLOOR, "player0").setOrigin(0.5, 1).setDepth(8);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.promptText = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "8px", color: "#1c1c22" }).setOrigin(0.5);
    const bg = this.add.rectangle(0, 0, 10, 12, C.yellow).setStrokeStyle(1, C.ink);
    this.prompt = this.add.container(0, 0, [bg, this.promptText]).setDepth(20).setVisible(false);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys("LEFT,RIGHT,A,D,E,ENTER,SPACE,UP,W") as Record<string, Phaser.Input.Keyboard.Key>;
    kb.disableGlobalCapture();

    const onAct = () => this.tryEnter();
    this.keys.E.on("down", onAct);
    this.keys.ENTER.on("down", onAct);
    this.keys.SPACE.on("down", onAct);
    this.keys.UP.on("down", onAct);
    this.keys.W.on("down", onAct);

    this.unsubs.push(
      bus.on("year", (y: number) => this.setYear(y)),
      bus.on("pause", (p: boolean) => (this.paused = p)),
      bus.on("move", (d: number) => (this.touchDir = d)),
      bus.on("interact", () => this.tryEnter(true)),
    );
    this.events.once("shutdown", () => this.unsubs.forEach((u) => u()));

    this.setYear(this.year, true);
    // pre-populate traffic so the street is never empty
    for (let i = 0; i < 5; i++) this.spawnVehicle(Math.random() * WORLD_W);
    for (let i = 0; i < 4; i++) this.spawnWalker(Math.random() * WORLD_W);
  }

  private typing() {
    const el = document.activeElement;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
  }

  private tryEnter(fromTouch = false) {
    if (this.paused || (!fromTouch && this.typing())) return;
    if (this.nearDoor) bus.emit("enter", this.nearDoor.id);
  }

  // ---------------------------------------------------------------- year
  setYear(y: number, force = false) {
    if (y === this.year && !force) return;
    this.year = y;
    const t = (y - 1995) / (2026 - 1995);
    this.drawSky(t);
    this.drawSkyline(y);
    this.drawMid(y);
    this.drawDynamicFront(y);
    this.updateBoards(y);
    this.metro!.setVisible(y >= 2014);
  }

  // ---------------------------------------------------------------- drawing
  private drawSky(t: number) {
    const g = this.sky;
    g.clear();
    // Older years read warmer and hazier, like an old photo; recent years cooler.
    const top = mixColor(0x5a4a6e, 0x26365e, t);
    const mid = mixColor(0xd99a6c, 0xc77d6b, t);
    const low = mixColor(0xf3c98b, 0xf2a65a, t);
    for (let yy = 0; yy < 150; yy += 3) {
      const k = yy / 150;
      const col = k < 0.55 ? mixColor(top, mid, k / 0.55) : mixColor(mid, low, (k - 0.55) / 0.45);
      g.fillStyle(col).fillRect(0, yy, VIEW_W, 3);
    }
    g.fillStyle(0xfff1c9, 0.9).fillCircle(380, 128, 14); // setting sun over the sea
  }

  private drawSkyline(year: number) {
    const g = this.skyline;
    g.clear();
    const r = rng(42);
    let x = -10;
    while (x < 820) {
      const w = 18 + Math.floor(r() * 26);
      const builtIn = r() < 0.35 ? 1990 : 1996 + Math.floor(r() * 30); // a third are old low-rise
      const tall = builtIn > 2003;
      const h = tall ? 70 + Math.floor(r() * 70) : 26 + Math.floor(r() * 24);
      if (year >= builtIn) {
        const base = tall ? 0x55607a : 0x6e5d63;
        g.fillStyle(base, 0.95).fillRect(x, 150 - h, w, h);
        g.fillStyle(0x000000, 0.12).fillRect(x + w - 4, 150 - h, 4, h);
        // lit windows
        for (let wy = 150 - h + 5; wy < 146; wy += 6)
          for (let wx = x + 3; wx < x + w - 5; wx += 5)
            if (r() < 0.35) g.fillStyle(0xffe29a, 0.85).fillRect(wx, wy, 2, 2);
        if (tall && r() < 0.4) g.fillStyle(0xd94b4b).fillRect(x + w / 2, 150 - h - 3, 1, 3); // aircraft light
      } else if (tall && year >= builtIn - 3) {
        // under construction: a crane over a stub
        const stub = Math.floor(h * (1 - (builtIn - year) / 4));
        g.fillStyle(0x7d7468).fillRect(x, 150 - stub, w, stub);
        g.fillStyle(0xe0a526).fillRect(x + w / 2, 150 - stub - 30, 2, 30).fillRect(x + w / 2 - 14, 150 - stub - 30, 30, 2);
      }
      x += w + 2 + Math.floor(r() * 6);
    }
    // sea strip at the horizon
    g.fillStyle(0x3f5f80).fillRect(-10, 150, 840, 10);
    g.fillStyle(0xf6c27a, 0.5).fillRect(360, 152, 60, 1).fillRect(372, 155, 38, 1);
  }

  private drawMid(year: number) {
    const g = this.midLayer;
    g.clear();
    // Textile mill chimney: the mills closed and the land became malls and towers
    if (year < 2004) {
      g.fillStyle(0x8a5a44).fillRect(560, 70, 10, 90);
      g.fillStyle(0x6f4434).fillRect(556, 70, 18, 6);
      g.fillStyle(0x7b6f6a).fillRect(520, 120, 90, 40);
      for (let i = 0; i < 6; i++) g.fillStyle(0x5d5452).fillTriangle(520 + i * 15, 120, 535 + i * 15, 120, 535 + i * 15, 108);
      g.fillStyle(0xcfc6be, 0.35).fillCircle(566, 62, 6).fillCircle(572, 54, 8);
    }
    // Metro Line 1 viaduct opened in 2014
    if (year >= 2014) {
      g.fillStyle(0xb9b3a8).fillRect(-20, 118, 860, 7);
      g.fillStyle(0x8f897e).fillRect(-20, 125, 860, 2);
      for (let px = 20; px < 840; px += 70) g.fillStyle(0xa39c90).fillRect(px, 127, 8, 40);
    }
  }

  private drawGround(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(C.pavement).fillRect(0, FLOOR - 4, WORLD_W, ROAD_TOP - FLOOR + 4);
    for (let x = 0; x < WORLD_W; x += 12) g.fillStyle(0x7f7a71).fillRect(x, FLOOR - 4, 1, ROAD_TOP - FLOOR + 4);
    g.fillStyle(C.kerb).fillRect(0, ROAD_TOP - 2, WORLD_W, 2);
    g.fillStyle(C.road).fillRect(0, ROAD_TOP, WORLD_W, ROAD_BOTTOM - ROAD_TOP);
    for (let x = 0; x < WORLD_W; x += 24) g.fillStyle(C.roadLine).fillRect(x, (ROAD_TOP + ROAD_BOTTOM) / 2, 12, 1);
    g.fillStyle(C.kerb).fillRect(0, ROAD_BOTTOM, WORLD_W, 2);
    g.fillStyle(C.pavement).fillRect(0, ROAD_BOTTOM + 2, WORLD_W, VIEW_H - ROAD_BOTTOM);
    // kerb stones painted black and yellow, as Mumbai does
    for (let x = 0; x < WORLD_W; x += 8) g.fillStyle(x % 16 ? C.ink : C.yellow).fillRect(x, ROAD_BOTTOM, 8, 2);
  }

  private chawl(g: Phaser.GameObjects.Graphics, x: number, w: number, floors: number, tint = C.chawl) {
    const h = floors * 22;
    const top = FLOOR - 4 - h;
    g.fillStyle(tint).fillRect(x, top, w, h);
    g.fillStyle(C.chawlDark).fillRect(x, top, w, 3);
    for (let f = 0; f < floors - 1; f++) {
      const fy = top + 6 + f * 22;
      g.fillStyle(0x6b5544).fillRect(x + 2, fy + 12, w - 4, 1); // balcony rail
      for (let wx = x + 5; wx < x + w - 10; wx += 14) {
        g.fillStyle(0x3d4a5c).fillRect(wx, fy, 8, 10);
        g.fillStyle(0x2e8b57).fillRect(wx - 1, fy, 1, 10).fillRect(wx + 8, fy, 1, 10); // shutters
      }
    }
    // laundry line, because every chawl has one
    g.fillStyle(0xe9e6e0).fillRect(x + 6, top + 18, 3, 4);
    g.fillStyle(0xc23b3b).fillRect(x + 12, top + 18, 3, 5);
  }

  private drawStaticBuildings(g: Phaser.GameObjects.Graphics) {
    // Backdrop chawls along the whole street
    this.chawl(g, 0, 110, 4, 0xbf9c72);
    this.chawl(g, 175, 70, 3);
    this.chawl(g, 330, 160, 4, 0xd1b087);
    this.chawl(g, 1090, 150, 4, 0xbf9c72);

    // ---- Chai tapri: tin roof on bamboo poles, kettle, bench
    const cx = 120;
    g.fillStyle(C.tarp).fillRect(cx - 4, 160, 64, 5);
    g.fillStyle(0x24548a).fillRect(cx - 4, 165, 64, 2);
    g.fillStyle(C.wood).fillRect(cx, 167, 2, 29).fillRect(cx + 54, 167, 2, 29);
    g.fillStyle(0x8b5a33).fillRect(cx + 6, 178, 44, 18);
    g.fillStyle(0x6b4423).fillRect(cx + 6, 178, 44, 2);
    g.fillStyle(0xbfbfbf).fillRect(cx + 14, 172, 9, 6); // kettle
    g.fillStyle(0x8f8f8f).fillRect(cx + 23, 173, 3, 1);
    g.fillStyle(0xe05a2b).fillRect(cx + 14, 177, 9, 1); // flame
    for (let i = 0; i < 4; i++) g.fillStyle(0xe8d9b5).fillRect(cx + 30 + i * 4, 175, 2, 3); // glasses
    g.fillStyle(C.wood).fillRect(cx + 64, 188, 22, 3).fillRect(cx + 66, 191, 2, 5).fillRect(cx + 82, 191, 2, 5);

    // ---- Vada pav cart: kadhai, awning
    const vx = 238;
    g.fillStyle(0xe0a526).fillRect(vx - 6, 158, 72, 4);
    for (let i = 0; i < 9; i++) g.fillStyle(i % 2 ? 0xc23b3b : 0xe0a526).fillRect(vx - 6 + i * 8, 162, 8, 5);
    g.fillStyle(0x9a9a9a).fillRect(vx, 167, 2, 22).fillRect(vx + 58, 167, 2, 22);
    g.fillStyle(0x4a6fa5).fillRect(vx - 2, 180, 64, 11);
    g.fillStyle(0x2c4a77).fillRect(vx - 2, 180, 64, 2);
    g.fillStyle(0x222222).fillEllipse(vx + 16, 179, 18, 5); // kadhai
    g.fillStyle(0xd9a441).fillCircle(vx + 13, 176, 2).fillCircle(vx + 18, 176, 2); // vadas frying
    g.fillStyle(0xe6c27a).fillRect(vx + 34, 175, 14, 5); // stack of pav
    g.fillStyle(0xc9a05c).fillRect(vx + 34, 177, 14, 1);
    g.fillStyle(0x1c1c22).fillCircle(vx + 6, 194, 3).fillCircle(vx + 54, 194, 3);

    // ---- Kirana: shutter up, sacks, shelves
    const kx = 380;
    g.fillStyle(0x3b3027).fillRect(kx, 152, 76, 44);
    g.fillStyle(0x9da3a8).fillRect(kx, 148, 76, 6); // rolled shutter
    for (let s = 0; s < 3; s++) {
      g.fillStyle(0x7a5a3a).fillRect(kx + 4, 160 + s * 11, 68, 2);
      for (let j = 0; j < 9; j++)
        g.fillStyle([0xc23b3b, 0xe0a526, 0x2e8b57, 0x2f6fb3, 0xe9e6e0][(j + s) % 5]).fillRect(kx + 6 + j * 7, 155 + s * 11, 5, 5);
    }
    g.fillStyle(0xd8c49a).fillRect(kx + 2, 186, 14, 10).fillRect(kx + 58, 186, 14, 10); // sacks
    g.fillStyle(0xbfa877).fillRect(kx + 2, 186, 14, 2).fillRect(kx + 58, 186, 14, 2);
    g.fillStyle(0x6b4423).fillRect(kx + 22, 184, 32, 12); // counter

    // ---- Railway station: arched stone facade with clock
    const sx = 700;
    g.fillStyle(C.stone).fillRect(sx, 112, 200, 84);
    g.fillStyle(C.stoneDark).fillRect(sx, 112, 200, 4).fillRect(sx, 150, 200, 2);
    g.fillStyle(C.red).fillRect(sx + 84, 82, 32, 30); // clock tower
    g.fillStyle(C.stoneDark).fillTriangle(sx + 80, 82, sx + 120, 82, sx + 100, 64);
    g.fillStyle(0xf3ead2).fillCircle(sx + 100, 96, 9);
    g.fillStyle(C.ink).fillRect(sx + 100, 89, 1, 7).fillRect(sx + 100, 96, 5, 1);
    for (let a = 0; a < 5; a++) {
      const ax = sx + 14 + a * 38;
      g.fillStyle(0x2c2a2f).fillRect(ax, 162, 22, 34);
      g.fillStyle(0x2c2a2f).fillEllipse(ax + 11, 162, 22, 14);
      g.fillStyle(C.stoneDark).fillRect(ax - 3, 158, 2, 38).fillRect(ax + 23, 158, 2, 38);
      if (a !== 2) for (let wy = 120; wy < 146; wy += 13) g.fillStyle(C.glassDark).fillRect(ax + 6, wy, 10, 9);
    }
    g.fillStyle(0xe8b04a, 0.6).fillRect(sx + 90, 170, 20, 26); // warm light from the booking hall

    // ---- Auto stand: shelter + petrol pump
    const ax = 975;
    g.fillStyle(C.green).fillRect(ax, 150, 112, 5);
    g.fillStyle(0x1f6b42).fillRect(ax, 155, 112, 2);
    g.fillStyle(0x6f7f8c).fillRect(ax + 2, 157, 2, 39).fillRect(ax + 108, 157, 2, 39);
    // pump
    g.fillStyle(0xe9e6e0).fillRect(ax + 128, 164, 16, 32);
    g.fillStyle(C.red).fillRect(ax + 128, 164, 16, 6);
    g.fillStyle(C.ink).fillRect(ax + 131, 174, 10, 7);
    g.fillStyle(0x1c1c22).fillRect(ax + 144, 176, 4, 1).fillRect(ax + 147, 176, 1, 10);
  }

  /** The things that change with time on the street front. */
  private drawDynamicFront(year: number) {
    const g = this.dynamicFront;
    g.clear();
    const mx = 510;
    if (year < 2005) {
      // Old covered market with striped awnings
      g.fillStyle(0x8c7a64).fillRect(mx, 150, 160, 46);
      for (let i = 0; i < 20; i++) g.fillStyle(i % 2 ? 0xe9e6e0 : 0x2e8b57).fillRect(mx + i * 8, 150, 8, 8);
      for (let s = 0; s < 4; s++) {
        g.fillStyle(0x4a3b2f).fillRect(mx + 6 + s * 39, 162, 32, 34);
        for (let j = 0; j < 4; j++) g.fillStyle([0xc23b3b, 0xe0a526, 0x2e8b57, 0xe86a3a][(s + j) % 4]).fillCircle(mx + 12 + s * 39 + j * 7, 190, 3);
      }
    } else if (year < 2009) {
      // Construction hoarding while the mall goes up
      g.fillStyle(0x7d7468).fillRect(mx + 10, 96, 140, 100);
      g.fillStyle(0xe0a526).fillRect(mx + 20, 50, 3, 60).fillRect(mx + 4, 50, 80, 3);
      for (let x = mx; x < mx + 160; x += 10) g.fillStyle(x % 20 ? 0x2f6fb3 : 0xe9e6e0).fillRect(x, 168, 10, 28);
      g.fillStyle(C.ink).fillRect(mx, 168, 160, 2);
    } else {
      // Glass mall
      g.fillStyle(C.glassDark).fillRect(mx, 92, 160, 104);
      for (let gx = mx + 4; gx < mx + 156; gx += 12)
        for (let gy = 98; gy < 160; gy += 10) g.fillStyle(C.glass).fillRect(gx, gy, 10, 8);
      g.fillStyle(0xe9e6e0).fillRect(mx, 160, 160, 6);
      g.fillStyle(0x2c2a2f).fillRect(mx + 60, 170, 40, 26);
      g.fillStyle(0xffe9a0, 0.5).fillRect(mx + 62, 172, 36, 24);
      g.fillStyle(0xc23b3b).fillRect(mx + 8, 170, 18, 22);
      g.fillStyle(0xe0a526).fillRect(mx + 134, 170, 18, 22);
    }
    // Parked autos at the stand; more of them as the city grows
    const parked = year < 2005 ? 1 : year < 2015 ? 2 : 3;
    this.children.getAll("name", "parked").forEach((o) => o.destroy());
    for (let i = 0; i < parked; i++)
      this.add.image(990 + i * 30, FLOOR - 2, "auto").setOrigin(0, 1).setDepth(6).setName("parked");
  }

  // ---------------------------------------------------------------- signboards
  private board(x: number, y: number) {
    return this.add
      .text(x, y, "", { fontFamily: FONT, fontSize: "8px", color: "#1c1c22", backgroundColor: "#f2c230", padding: { x: 3, y: 2 }, align: "center" })
      .setOrigin(0.5, 1)
      .setDepth(7);
  }

  private makeBoards() {
    this.boards.chai = this.board(150, 158);
    this.boards.vadapav = this.board(268, 156);
    this.boards.kirana = this.board(418, 146);
    this.boards.station = this.board(800, 148);
    this.boards.autostand = this.board(1031, 148);
    const name = (x: number, y: number, s: string) =>
      this.add.text(x, y, s, { fontFamily: FONT, fontSize: "8px", color: "#efe3c8" }).setOrigin(0.5, 1).setDepth(7);
    this.extraTexts.push(name(800, 128, "CHURCHGATE ROAD"), name(1110, 166, "PETROL"));
    this.extraTexts.forEach((t) => t.setShadow(1, 1, "#1c1c22", 0));
  }

  private updateBoards(y: number) {
    const p = (id: string) => `Rs${Math.round(pointAt(itemById(id), y).price)}`;
    this.boards.chai!.setText(`CHAI ${p("chai")}`);
    this.boards.vadapav!.setText(`VADA PAV ${p("vadapav")}`);
    this.boards.kirana!.setText(`ONION ${p("onion")}/KG\nMILK ${p("milk")}/L`);
    this.boards.station!.setText(`TICKET ${p("train")}`);
    this.boards.autostand!.setText(`AUTO MIN ${p("auto")}`);
    this.extraTexts[1].setText(`PETROL ${p("petrol")}`);
    // a little flash so the change is noticed
    Object.values(this.boards).forEach((b) => {
      this.tweens.killTweensOf(b!);
      b!.setScale(1.15);
      this.tweens.add({ targets: b, scale: 1, duration: 220, ease: "Back.Out" });
    });
  }

  // ---------------------------------------------------------------- traffic
  private pickVehicle(): { key: string; speed: number } {
    const t = (this.year - 1995) / 31;
    const r = Math.random();
    const taxi = this.year >= 2023 ? "taxi_new" : this.year >= 2012 && Math.random() < 0.4 ? "taxi_new" : "taxi_old";
    const carShare = lerp(0.12, 0.45, t);
    const scooterShare = lerp(0.05, 0.18, t);
    if (r < 0.08) return { key: "bus", speed: 26 };
    if (r < 0.08 + carShare) return { key: `car${Math.floor(Math.random() * CAR_COLOURS.length)}`, speed: 34 };
    if (r < 0.08 + carShare + scooterShare) return { key: "scooter", speed: 40 };
    if (r < 0.08 + carShare + scooterShare + 0.3) return { key: "auto", speed: 30 };
    return { key: taxi, speed: 32 };
  }

  private spawnVehicle(atX?: number) {
    const { key, speed } = this.pickVehicle();
    const right = Math.random() < 0.5;
    const laneY = right ? ROAD_TOP + 19 : ROAD_BOTTOM - 2;
    const x = atX ?? (right ? -50 : WORLD_W + 50);
    const img = this.add.image(x, laneY, key).setOrigin(0.5, 1).setDepth(right ? 9 : 10).setFlipX(!right);
    this.vehicles.push({ img, speed: (right ? 1 : -1) * speed * (0.85 + Math.random() * 0.3) });
  }

  private spawnWalker(atX?: number) {
    const npc = Math.floor(Math.random() * 5);
    const right = Math.random() < 0.5;
    const x = atX ?? (right ? -20 : WORLD_W + 20);
    const img = this.add.image(x, FLOOR - 3, `npc${npc}_0`).setOrigin(0.5, 1).setDepth(7).setFlipX(!right).setAlpha(0.95);
    this.walkers.push({ img, speed: (right ? 1 : -1) * (12 + Math.random() * 8), frame: 0, npc, clock: 0 });
  }

  // ---------------------------------------------------------------- loop
  update(_t: number, dtMs: number) {
    const dt = dtMs / 1000;

    // traffic
    this.spawnClock += dtMs;
    const interval = lerp(2400, 900, (this.year - 1995) / 31);
    if (this.spawnClock > interval) {
      this.spawnClock = 0;
      this.spawnVehicle();
    }
    this.vehicles = this.vehicles.filter((v) => {
      v.img.x += v.speed * dt;
      const gone = v.img.x < -80 || v.img.x > WORLD_W + 80;
      if (gone) v.img.destroy();
      return !gone;
    });

    this.walkerClock += dtMs;
    if (this.walkerClock > 3500 && this.walkers.length < 7) {
      this.walkerClock = 0;
      this.spawnWalker();
    }
    this.walkers = this.walkers.filter((w) => {
      w.img.x += w.speed * dt;
      w.clock += dtMs;
      if (w.clock > 160) {
        w.clock = 0;
        w.frame = w.frame === 1 ? 2 : 1;
        w.img.setTexture(`npc${w.npc}_${w.frame}`);
      }
      const gone = w.img.x < -30 || w.img.x > WORLD_W + 30;
      if (gone) w.img.destroy();
      return !gone;
    });

    if (this.metro?.visible) {
      this.metroClock += dtMs;
      if (this.metroClock > 9000) {
        this.metroClock = 0;
        this.metro.x = -200;
      }
      this.metro.x += 60 * dt;
    }

    // player
    let dir = 0;
    if (!this.paused && !this.typing()) {
      if (this.keys.LEFT.isDown || this.keys.A.isDown) dir -= 1;
      if (this.keys.RIGHT.isDown || this.keys.D.isDown) dir += 1;
    }
    if (!this.paused && this.touchDir) dir = this.touchDir;

    if (dir) {
      this.facing = dir;
      this.player.x = Phaser.Math.Clamp(this.player.x + dir * 58 * dt, 8, WORLD_W - 8);
      this.walkClock += dtMs;
      const frame = Math.floor(this.walkClock / 140) % 2 ? 2 : 1;
      this.player.setTexture(`player${frame}`);
    } else {
      this.walkClock = 0;
      this.player.setTexture("player0");
    }
    this.player.setFlipX(this.facing < 0);

    // doors
    const near = DOORS.find((d) => Math.abs(d.x - this.player.x) < 20) ?? null;
    if (near !== this.nearDoor) {
      this.nearDoor = near;
      bus.emit("near", near?.id ?? null);
      if (near) {
        this.promptText.setText(`E  Enter ${near.label}`);
        const bg = this.prompt.list[0] as Phaser.GameObjects.Rectangle;
        bg.setSize(this.promptText.width + 8, 12);
        bg.setOrigin(0.5);
      }
    }
    this.prompt.setVisible(!!near && !this.paused);
    if (near) this.prompt.setPosition(Math.round(this.player.x), FLOOR - 26);
  }
}
