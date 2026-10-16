"use client";

import { useEffect, useRef, useState } from "react";
import { bus } from "@/lib/bus";
import { LOOKS, drawCharacter, playerLook, type Dir } from "@/game/art/characters";

/** Draws one of the game's characters onto a canvas (start screen, dialogue portraits). */
export function CharPreview({ look, shirt, size = 4, dir = "down", label }: { look?: string; shirt?: string; size?: number; dir?: Dir; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const art = drawCharacter(look ? LOOKS[look] : playerLook(shirt ?? "#2f6fb3"), dir, 0);
    c.width = art.w * size;
    c.height = art.h * size;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.drawImage(art.c, 0, 0, c.width, c.height);
  }, [look, shirt, size, dir]);
  return <canvas ref={ref} className="char-preview" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

/** On-screen joystick: drag anywhere inside the ring to walk in that direction. */
export function Joystick() {
  const ring = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);

  const update = (e: React.PointerEvent) => {
    const r = ring.current!.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const rad = r.width / 2;
    let dx = (e.clientX - cx) / rad;
    let dy = (e.clientY - cy) / rad;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    const dead = len < 0.2;
    setKnob({ x: dx, y: dy });
    bus.emit("move", dead ? { x: 0, y: 0 } : { x: dx, y: dy });
  };
  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    bus.emit("move", { x: 0, y: 0 });
  };
  return (
    <div
      ref={ring}
      className="joystick"
      aria-label="Walk: drag in any direction"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => active.current === e.pointerId && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span style={{ transform: `translate(${knob.x * 30}px, ${knob.y * 30}px)` }} />
    </div>
  );
}

export function ZoomButtons() {
  const [z, setZ] = useState<number | null>(null);
  useEffect(() => bus.on("zoomed", (v: number) => setZ(v)), []);
  return (
    <div className="zoom" role="group" aria-label="Zoom">
      <button onClick={() => bus.emit("zoom", 1)} aria-label="Zoom in">
        +
      </button>
      <span aria-live="polite">{z ? `${z.toFixed(1)}x` : ""}</span>
      <button onClick={() => bus.emit("zoom", -1)} aria-label="Zoom out">
        −
      </button>
    </div>
  );
}

export interface Talk {
  name: string;
  look: string;
  lines: string[];
}

/** What a person on the street says: click, Enter or Space for the next line, Esc to stop. */
export function Dialogue({ talk, onClose }: { talk: Talk; onClose: () => void }) {
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => box.current?.focus(), []);
  const next = () => (i < talk.lines.length - 1 ? setI(i + 1) : onClose());
  return (
    <div
      ref={box}
      className="talk"
      role="dialog"
      aria-label={`${talk.name} says`}
      tabIndex={0}
      onClick={next}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "e") {
          e.preventDefault();
          next();
        }
      }}
    >
      <div className="talk-portrait">
        <CharPreview look={talk.look} size={3} />
      </div>
      <div className="talk-body">
        <b>{talk.name}</b>
        <p aria-live="polite">{talk.lines[i]}</p>
        <small>
          {i + 1}/{talk.lines.length} · {i < talk.lines.length - 1 ? "click or press Enter" : "click to finish"}
        </small>
      </div>
    </div>
  );
}
