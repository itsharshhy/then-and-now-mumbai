import Phaser from "phaser";
import { bus } from "@/lib/bus";
import type { Peer } from "@/lib/room";
import { CHAR_H, CHAR_W, DIRS, LOOKS, drawCharacter, playerLook, shadow, type Dir, type Look } from "../art/characters";
import type { Px } from "../art/px";

// Shared pieces for the city and the interiors: textures from the painter, walking actors, zoom, other players.

export const FONT = "Silkscreen";

export function addTexture(scene: Phaser.Scene, key: string, px: Px) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, px.c);
}

/** Textures for one look: ch:<name>:<dir>:<frame>. */
export function ensureLook(scene: Phaser.Scene, name: string, look: Look) {
  if (scene.textures.exists(`ch:${name}:down:0`)) return;
  for (const d of DIRS) for (const f of [0, 1, 2] as const) addTexture(scene, `ch:${name}:${d}:${f}`, drawCharacter(look, d, f));
  if (!scene.textures.exists("shadow")) addTexture(scene, "shadow", shadow());
}

export function ensureAllLooks(scene: Phaser.Scene) {
  for (const [name, look] of Object.entries(LOOKS)) ensureLook(scene, name, look);
}

export const playerTextureName = (shirt: string) => `p${shirt.slice(1)}`;
export function ensurePlayerLook(scene: Phaser.Scene, shirt: string) {
  const name = playerTextureName(shirt);
  ensureLook(scene, name, playerLook(shirt));
  return name;
}

export type Facing = "down" | "up" | "left" | "right";

/** A character standing on the ground: sprite + shadow, walks in four directions, y-sorted. */
export class Actor {
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  facing: Facing = "down";
  moving = false;
  private clock = 0;

  constructor(
    readonly scene: Phaser.Scene,
    public look: string,
    x: number,
    y: number,
  ) {
    this.shadow = scene.add.image(x, y, "shadow").setOrigin(0.5, 0.5);
    this.sprite = scene.add.image(x, y, `ch:${look}:down:0`).setOrigin(0.5, 1);
    this.place(x, y);
  }

  get x() {
    return this.sprite.x;
  }
  /** Where the feet are (the sprite is drawn 3 px lower so feet sit inside the shadow). */
  get y() {
    return this.sprite.y - 3;
  }

  place(x: number, y: number) {
    this.sprite.setPosition(Math.round(x), Math.round(y) + 3);
    this.shadow.setPosition(Math.round(x), Math.round(y));
    this.sprite.setDepth(y);
    this.shadow.setDepth(y - 0.5);
  }

  /** Advance the walk cycle and pick the right frame. */
  animate(dtMs: number) {
    this.clock = this.moving ? this.clock + dtMs : 0;
    const frame = this.moving ? (Math.floor(this.clock / 150) % 2 ? 2 : 1) : 0;
    const dir: Dir = this.facing === "left" || this.facing === "right" ? "side" : this.facing;
    this.sprite.setTexture(`ch:${this.look}:${dir}:${frame}`);
    this.sprite.setFlipX(this.facing === "left");
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}

export const facingFrom = (dx: number, dy: number, prev: Facing): Facing =>
  Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy !== 0 ? (dy < 0 ? "up" : "down") : prev;

// ---------------------------------------------------------------- collision
export type Rect = [number, number, number, number];

export class Collider {
  constructor(
    private rects: Rect[],
    private blocked: (x: number, y: number) => boolean,
  ) {}
  /** Is a feet-sized box at (x, y) free? */
  free(x: number, y: number) {
    const hw = 4;
    const top = y - 4;
    const bot = y;
    for (const [cx, cy] of [
      [x - hw, top],
      [x + hw, top],
      [x - hw, bot],
      [x + hw, bot],
    ])
      if (this.blocked(cx, cy)) return false;
    for (const [rx, ry, rw, rh] of this.rects) if (x + hw > rx && x - hw < rx + rw && bot > ry && top < ry + rh) return false;
    return true;
  }
  setRects(r: Rect[]) {
    this.rects = r;
  }
}

/** Moves (x, y) by (dx, dy), sliding along walls. */
export function slide(c: Collider, x: number, y: number, dx: number, dy: number): [number, number] {
  if (c.free(x + dx, y + dy)) return [x + dx, y + dy];
  if (dx && c.free(x + dx, y)) return [x + dx, y];
  if (dy && c.free(x, y + dy)) return [x, y + dy];
  return [x, y];
}

// ---------------------------------------------------------------- input
export interface MoveInput {
  dx: number;
  dy: number;
}

/** Keyboard (arrows / WASD) plus the on-screen joystick, merged into one direction. */
export class Controls {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private stick = { x: 0, y: 0 };
  private offs: (() => void)[] = [];
  paused = false;

  constructor(scene: Phaser.Scene, onAct: () => void) {
    const kb = scene.input.keyboard!;
    kb.disableGlobalCapture();
    this.keys = kb.addKeys("LEFT,RIGHT,UP,DOWN,A,D,W,S,E,ENTER,SPACE") as Record<string, Phaser.Input.Keyboard.Key>;
    for (const k of ["E", "ENTER", "SPACE"]) this.keys[k].on("down", () => !this.paused && !typing() && onAct());
    this.offs.push(
      bus.on("move", (v: { x: number; y: number } | number) => {
        this.stick = typeof v === "number" ? { x: v, y: 0 } : v;
      }),
      bus.on("interact", () => !this.paused && onAct()),
      bus.on("pause", (p: boolean) => (this.paused = p)),
    );
    scene.events.once("shutdown", () => this.offs.forEach((o) => o()));
  }

  read(): MoveInput {
    if (this.paused) return { dx: 0, dy: 0 };
    let dx = this.stick.x;
    let dy = this.stick.y;
    if (!typing()) {
      const k = this.keys;
      if (k.LEFT.isDown || k.A.isDown) dx = -1;
      if (k.RIGHT.isDown || k.D.isDown) dx = 1;
      if (k.UP.isDown || k.W.isDown) dy = -1;
      if (k.DOWN.isDown || k.S.isDown) dy = 1;
    }
    const len = Math.hypot(dx, dy);
    return len > 1 ? { dx: dx / len, dy: dy / len } : { dx, dy };
  }
}

export function typing() {
  const el = document.activeElement;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
}

// ---------------------------------------------------------------- zoom (wheel, pinch, buttons)
export function setupZoom(scene: Phaser.Scene, min: number, max: number, initial: number) {
  const cam = scene.cameras.main;
  const clamp = (z: number) => Phaser.Math.Clamp(z, min, max);
  const set = (z: number) => {
    cam.setZoom(Math.round(clamp(z) * 8) / 8);
    bus.emit("zoomed", cam.zoom);
  };
  set(initial);
  scene.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => set(cam.zoom * (dy > 0 ? 0.9 : 1.1)));
  let pinch: number | null = null;
  let pinchZoom = cam.zoom;
  scene.input.addPointer(1);
  scene.input.on("pointermove", () => {
    const [a, b] = [scene.input.pointer1, scene.input.pointer2];
    if (a.isDown && b.isDown) {
      const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (pinch === null) {
        pinch = d;
        pinchZoom = cam.zoom;
      } else set((pinchZoom * d) / pinch);
    } else pinch = null;
  });
  const off = bus.on("zoom", (step: number) => set(cam.zoom * (step > 0 ? 1.25 : 0.8)));
  scene.events.once("shutdown", off);
  return set;
}

/** A comfortable starting zoom: about 28 tiles across, at least 2x. */
export const defaultZoom = (scene: Phaser.Scene) => Phaser.Math.Clamp(scene.scale.width / (28 * 16), 1.5, 4);

// ---------------------------------------------------------------- other players in the room
export class Remotes {
  private map = new Map<string, { actor: Actor; tag: Phaser.GameObjects.Text; bubble?: Phaser.GameObjects.Text; tx: number; ty: number; timer?: Phaser.Time.TimerEvent }>();
  private offs: (() => void)[] = [];

  constructor(
    private scene: Phaser.Scene,
    private sceneId: string,
  ) {
    this.offs.push(
      bus.on("room:peers", (peers: Peer[]) => this.sync(peers)),
      bus.on("room:chat", (c: { id: string; text: string; mine: boolean }) => !c.mine && this.say(c.id, c.text)),
    );
    scene.events.once("shutdown", () => this.offs.forEach((o) => o()));
  }

  private sync(peers: Peer[]) {
    const here = peers.filter((p) => p.scene === this.sceneId);
    const ids = new Set(here.map((p) => p.id));
    for (const [id, r] of this.map)
      if (!ids.has(id)) {
        r.actor.destroy();
        r.tag.destroy();
        r.bubble?.destroy();
        this.map.delete(id);
      }
    for (const p of here) {
      let r = this.map.get(p.id);
      const look = ensurePlayerLook(this.scene, p.shirt);
      if (!r) {
        const actor = new Actor(this.scene, look, p.x, p.y);
        const tag = this.scene.add.text(p.x, p.y - 30, p.name, { fontFamily: FONT, fontSize: "8px", color: "#f3f5f7" }).setOrigin(0.5, 1).setShadow(1, 1, "#1c1c22", 0).setResolution(2);
        r = { actor, tag, tx: p.x, ty: p.y };
        this.map.set(p.id, r);
      }
      r.actor.look = look;
      r.tx = p.x;
      r.ty = p.y;
      r.actor.facing = (["down", "up", "left", "right"] as Facing[]).includes(p.dir as Facing) ? (p.dir as Facing) : "down";
      r.actor.moving = p.moving;
      r.tag.setText(p.name);
    }
  }

  private say(id: string, text: string) {
    const r = this.map.get(id);
    if (!r) return;
    r.bubble?.destroy();
    r.timer?.remove();
    r.bubble = speech(this.scene, text);
    r.timer = this.scene.time.delayedCall(2500 + text.length * 60, () => r.bubble?.destroy());
  }

  update(dtMs: number) {
    for (const r of this.map.values()) {
      const a = r.actor;
      const k = Math.min(1, dtMs / 110);
      const far = Math.hypot(r.tx - a.x, r.ty - a.y) > 160;
      a.place(far ? r.tx : a.x + (r.tx - a.x) * k, far ? r.ty : a.y + (r.ty - a.y) * k);
      a.animate(dtMs);
      r.tag.setPosition(Math.round(a.x), Math.round(a.y) - 28).setDepth(9000);
      r.bubble?.setPosition(Math.round(a.x), Math.round(a.y) - 38);
    }
  }
}

export function speech(scene: Phaser.Scene, text: string) {
  return scene.add
    .text(0, 0, text, { fontFamily: FONT, fontSize: "8px", color: "#1c1c22", backgroundColor: "#f3f5f7", padding: { x: 3, y: 2 }, wordWrap: { width: 120 }, align: "center" })
    .setOrigin(0.5, 1)
    .setDepth(9500)
    .setResolution(2);
}

/** Shows my own chat messages as a bubble over my character. */
export function myBubbles(scene: Phaser.Scene, me: () => Actor) {
  let bubble: Phaser.GameObjects.Text | undefined;
  const off = bus.on("room:chat", (c: { text: string; mine: boolean }) => {
    if (!c.mine) return;
    bubble?.destroy();
    const b = speech(scene, c.text);
    bubble = b;
    scene.time.delayedCall(2500 + c.text.length * 60, () => b.destroy());
  });
  scene.events.on("update", () => bubble?.active && bubble.setPosition(Math.round(me().x), Math.round(me().y) - 34));
  scene.events.once("shutdown", off);
}

/** Tiny floating "E" prompt above things you can use. */
export function makePrompt(scene: Phaser.Scene) {
  const t = scene.add.text(0, 0, "", { fontFamily: FONT, fontSize: "8px", color: "#1c1c22", backgroundColor: "#f2c230", padding: { x: 3, y: 1 } }).setOrigin(0.5, 1).setDepth(9400).setResolution(2).setVisible(false);
  return t;
}

export { CHAR_H, CHAR_W };
