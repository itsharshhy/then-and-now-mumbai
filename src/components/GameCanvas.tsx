"use client";

import { useEffect, useRef } from "react";

/** Boots Phaser on the client only; Phaser touches window at import time. */
export default function GameCanvas({ year, shirt, city = "mumbai" }: { year: number; shirt: string; city?: "mumbai" | "delhi" }) {
  const host = useRef<HTMLDivElement>(null);
  const start = useRef({ year, shirt, city });

  useEffect(() => {
    let game: import("phaser").Game | undefined;
    let cancelled = false;
    (async () => {
      await document.fonts.load('8px "Silkscreen"').catch(() => undefined);
      const Phaser = (await import("phaser")).default;
      const { CityScene } = await import("@/game/scenes/CityScene");
      const { InteriorScene } = await import("@/game/scenes/InteriorScene");
      if (cancelled || !host.current) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current,
        pixelArt: true,
        roundPixels: true,
        backgroundColor: "#1a2544",
        scale: { mode: Phaser.Scale.RESIZE, width: host.current.clientWidth, height: host.current.clientHeight },
        input: { activePointers: 3 },
        scene: [],
        banner: false,
      });
      game.scene.add("interior", InteriorScene, false);
      game.scene.add("city", CityScene, true, start.current);
      if (process.env.NODE_ENV !== "production") (window as unknown as { __tnm: unknown }).__tnm = game;
    })();
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  return (
    <div
      ref={host}
      className="game-host"
      tabIndex={0}
      onPointerDown={() => host.current?.focus()}
      aria-label="Mumbai from above. Arrow keys or WASD to walk, E to enter or talk, scroll or pinch to zoom."
      role="application"
    />
  );
}
