"use client";

import { useEffect, useRef, useState } from "react";
import { DIRS, LOOKS, drawCharacter, playerLook } from "@/game/art/characters";
import type { Px } from "@/game/art/px";
import * as V from "@/game/art/vehicles";
import * as B from "@/game/art/buildings";
import { Px as PxC } from "@/game/art/px";
import { WORLD_H, WORLD_W, drawGround, placements, seaTile } from "@/game/world/mumbai";

function composeMap(year: number) {
  const p = new PxC(WORLD_W, WORLD_H);
  const sea = seaTile(0);
  for (let y = 0; y < WORLD_H; y += 64) for (let x = 0; x < 128; x += 64) p.draw(sea, x, y);
  p.draw(drawGround(year), 0, 0);
  const items = placements().filter((pl) => pl.key(year)).sort((a, b) => a.y - b.y);
  for (const it of items) {
    const art = it.draw(year);
    p.draw(art, it.x, it.y - art.h);
  }
  return p;
}

// A page for reviewing the code-drawn sprites at a large scale. Not linked from the game.
function Sheet({ title, items, scale = 4 }: { title: string; items: { label: string; px: Px }[]; scale?: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current!;
    el.innerHTML = "";
    for (const it of items) {
      const fig = document.createElement("figure");
      const c = document.createElement("canvas");
      c.width = it.px.w * scale;
      c.height = it.px.h * scale;
      const g = c.getContext("2d")!;
      g.imageSmoothingEnabled = false;
      g.drawImage(it.px.c, 0, 0, c.width, c.height);
      const cap = document.createElement("figcaption");
      cap.textContent = it.label;
      fig.append(c, cap);
      el.append(fig);
    }
  }, [items, scale]);
  return (
    <section>
      <h2>{title}</h2>
      <div ref={host} className="art-row" />
    </section>
  );
}

export default function ArtGallery() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return <Gallery />;
}

function Gallery() {
  const chars = Object.entries({ player: playerLook("#2f6fb3"), ...LOOKS }).flatMap(([name, look]) =>
    DIRS.flatMap((d) => ([0, 1, 2] as const).map((f) => ({ label: `${name} ${d}${f}`, px: drawCharacter(look, d, f) }))).filter((_, i) => i % 3 === 0 || name === "player"),
  );
  return (
    <main style={{ background: "#7fa86a", minHeight: "100vh", padding: 16, color: "#1c1c22", fontFamily: "sans-serif" }}>
      <style>{`.art-row{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}.art-row figure{margin:0;text-align:center;font-size:11px}.art-row canvas{display:block;image-rendering:pixelated}`}</style>
      <Sheet title="Map 2026" scale={1} items={[{ label: "2026", px: composeMap(2026) }]} />
      <Sheet title="Map 1995" scale={1} items={[{ label: "1995", px: composeMap(1995) }]} />
      <Sheet title="Buildings" scale={2} items={[
        { label: "tapri", px: B.chaiTapri(2026) }, { label: "vada pav", px: B.vadaPavCart() }, { label: "station", px: B.station(2026) },
        { label: "auto stand", px: B.autoStand(2026) }, { label: "trees", px: B.tree("gulmohar", 3) }, { label: "banyan", px: B.tree("banyan", 4) },
        { label: "palm", px: B.palm(2) }, { label: "booth", px: B.phoneBooth() }, { label: "shrine", px: B.shrine() },
      ]} />
      <Sheet title="Vehicles" scale={3} items={[
        { label: "padmini taxi", px: V.taxiOld() }, { label: "new taxi", px: V.taxiNew() },
        { label: "sedan", px: V.car("#e9e6e0") }, { label: "hatch", px: V.car("#c23b3b", false) },
        { label: "auto 1995", px: V.auto(false) }, { label: "auto cng", px: V.auto(true) },
        { label: "BEST", px: V.bestBus(false) }, { label: "BEST double", px: V.bestBus(true) },
        { label: "scooter", px: V.scooter() }, { label: "metro", px: V.metroCoach() },
        { label: "local old", px: V.localCoach("old", true) }, { label: "local new", px: V.localCoach("new", false) },
        { label: "cab old", px: V.localCab("old") }, { label: "roof", px: V.localRoof("new", 2) },
      ]} />
      <Sheet title="Characters" items={chars} />
    </main>
  );
}
