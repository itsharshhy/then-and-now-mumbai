"use client";

import { useEffect, useRef } from "react";

/** Boots Phaser on the client only; Phaser touches window at import time. */
export default function GameCanvas({ year, shirt }: { year: number; shirt: string }) {
  const host = useRef<HTMLDivElement>(null);
  const start = useRef({ year, shirt });

  useEffect(() => {
    let game: import("phaser").Game | undefined;
    let cancelled = false;
    (async () => {
      await document.fonts.load('8px "Silkscreen"').catch(() => undefined);
      const Phaser = (await import("phaser")).default;
      const { StreetScene, VIEW_W, VIEW_H } = await import("@/game/StreetScene");
      if (cancelled || !host.current) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current,
        width: VIEW_W,
        height: VIEW_H,
        pixelArt: true,
        roundPixels: true,
        backgroundColor: "#26365e",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [],
        banner: false,
      });
      game.scene.add("street", StreetScene, true, start.current);
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
      aria-label="Pixel street. Use left and right arrows to walk, E to enter a shop."
      role="application"
    />
  );
}
