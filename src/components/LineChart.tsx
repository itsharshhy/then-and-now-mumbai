"use client";

import { useMemo, useRef, useState } from "react";
import type { Confidence } from "@/lib/data";

export interface ChartPoint {
  x: number;
  y: number;
  confidence?: Confidence;
  note?: string | null;
}

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: ChartPoint[];
  /** draw anchor dots (filled = reported/documented, hollow = estimated) */
  anchors?: boolean;
}

interface Props {
  series: ChartSeries[];
  format: (y: number) => string;
  markerX?: number;
  height?: number;
  title?: string;
  className?: string;
}

const W = 560;
const PAD = { l: 44, r: 16, t: 14, b: 26 };

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

export default function LineChart({ series, format, markerX, height = 240, title, className }: Props) {
  const H = height;
  const [hoverX, setHoverX] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { xs, x0, x1, yMax, sx, sy, ticks } = useMemo(() => {
    const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
    const x0 = xs[0];
    const x1 = xs[xs.length - 1];
    const yMax = niceMax(Math.max(...series.flatMap((s) => s.points.map((p) => p.y))) * 1.05);
    const sx = (x: number) => PAD.l + ((x - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
    const sy = (y: number) => H - PAD.b - (y / yMax) * (H - PAD.t - PAD.b);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * yMax);
    return { xs, x0, x1, yMax, sx, sy, ticks };
  }, [series, H]);

  const xTicks = xs.filter((x) => (x % 5 === 0 && x1 - x >= 3) || x === x1 || x === x0);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const xv = x0 + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (x1 - x0);
    setHoverX(Math.max(x0, Math.min(x1, Math.round(xv))));
  };

  const hover = hoverX ?? null;
  const tipLeft = hover !== null ? (sx(hover) / W) * 100 : 0;

  return (
    <figure className={`lc ${className ?? ""}`}>
      {title && <figcaption className="lc-title">{title}</figcaption>}
      {series.length > 1 && (
        <div className="lc-legend" aria-hidden>
          {series.map((s) => (
            <span key={s.id}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div className="lc-wrap">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title ?? series.map((s) => s.label).join(", ")}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} className={t === 0 ? "lc-base" : "lc-grid"} />
              <text x={PAD.l - 6} y={sy(t) + 3.5} className="lc-tick" textAnchor="end">
                {format(t)}
              </text>
            </g>
          ))}
          {xTicks.map((x) => (
            <text key={x} x={sx(x)} y={H - 8} className="lc-tick" textAnchor="middle">
              {x}
            </text>
          ))}
          {markerX !== undefined && (
            <line x1={sx(markerX)} x2={sx(markerX)} y1={PAD.t - 4} y2={H - PAD.b} className="lc-marker" />
          )}
          {series.map((s) => (
            <g key={s.id}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")}
              />
              {s.anchors &&
                s.points
                  .filter((p) => p.confidence && p.confidence !== "interpolated")
                  .map((p) => {
                    const solid = p.confidence === "reported" || p.confidence === "documented";
                    return (
                      <circle
                        key={p.x}
                        cx={sx(p.x)}
                        cy={sy(p.y)}
                        r={4}
                        fill={solid ? s.color : "var(--surface)"}
                        stroke={s.color}
                        strokeWidth={2}
                        className="lc-dot"
                      />
                    );
                  })}
            </g>
          ))}
          {hover !== null && (
            <g>
              <line x1={sx(hover)} x2={sx(hover)} y1={PAD.t} y2={H - PAD.b} className="lc-cross" />
              {series.map((s) => {
                const p = s.points.find((q) => q.x === hover);
                return p ? <circle key={s.id} cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} /> : null;
              })}
            </g>
          )}
          <rect
            x={PAD.l}
            y={0}
            width={W - PAD.l - PAD.r}
            height={H}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHoverX(null)}
          />
        </svg>
        {hover !== null && (
          <div className="lc-tip" style={{ left: `${tipLeft}%`, transform: `translateX(${tipLeft > 60 ? "-105%" : "8%"})` }}>
            <strong>{hover}</strong>
            {series.map((s) => {
              const p = s.points.find((q) => q.x === hover);
              if (!p) return null;
              return (
                <div key={s.id} className="lc-tip-row">
                  <i style={{ background: s.color }} />
                  <span>{s.label}</span>
                  <b>{format(p.y)}</b>
                </div>
              );
            })}
            {(() => {
              const c = series[0].points.find((q) => q.x === hover)?.confidence;
              return c ? <em className={`conf conf-${c}`}>{c === "interpolated" ? "between data points" : c}</em> : null;
            })()}
          </div>
        )}
      </div>
    </figure>
  );
}
