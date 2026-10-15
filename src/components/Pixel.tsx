import type { Palette } from "@/lib/sprites";

/** Renders a text-grid sprite as crisp SVG rects. */
export default function Pixel({ grid, palette, size = 4, label }: { grid: string[]; palette: Palette; size?: number; label?: string }) {
  const w = Math.max(...grid.map((r) => r.length));
  const h = grid.length;
  return (
    <svg
      width={w * size}
      height={h * size}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {grid.flatMap((row, y) =>
        [...row].map((ch, x) => (palette[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[ch]} /> : null)),
      )}
    </svg>
  );
}
