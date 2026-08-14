import { useMemo, useState } from "react";
import { downsample } from "./downsample";

interface TraceChartProps {
  trace: { tSeconds: number; position: number }[];
  yLabel: string;
  yUnit: string;
  targetValue?: number;
}

const WIDTH = 640;
const HEIGHT = 200;
const PAD_LEFT = 52;
const PAD_BOTTOM = 26;
const PAD_TOP = 12;
const PAD_RIGHT = 12;

export function TraceChart({ trace, yLabel, yUnit, targetValue }: TraceChartProps) {
  const points = useMemo(() => downsample(trace, 150), [trace]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const tMax = points.length ? points[points.length - 1]!.tSeconds : 1;
  const values = points.map((p) => p.position).concat(targetValue !== undefined ? [targetValue] : []);
  const yMin = Math.min(0, ...values);
  const yMax = Math.max(...values, yMin + 1e-6);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  function xFor(t: number) {
    return PAD_LEFT + (tMax > 0 ? t / tMax : 0) * plotWidth;
  }
  function yFor(v: number) {
    return PAD_TOP + (1 - (v - yMin) / (yMax - yMin)) * plotHeight;
  }

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.tSeconds).toFixed(1)} ${yFor(p.position).toFixed(1)}`).join(" ");
  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frac = Math.min(1, Math.max(0, (x - PAD_LEFT) / plotWidth));
    const idx = Math.round(frac * (points.length - 1));
    setHoverIdx(Math.min(points.length - 1, Math.max(0, idx)));
  }

  return (
    <div className="chart-wrap">
      <svg width={WIDTH} height={HEIGHT} role="img" aria-label={`${yLabel} over time`}>
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={HEIGHT - PAD_BOTTOM} stroke="var(--baseline)" strokeWidth={1} />
        <line x1={PAD_LEFT} y1={HEIGHT - PAD_BOTTOM} x2={WIDTH - PAD_RIGHT} y2={HEIGHT - PAD_BOTTOM} stroke="var(--baseline)" strokeWidth={1} />
        <text x={4} y={PAD_TOP + 4} fontSize="10" fill="var(--text-muted)">
          {yMax.toFixed(1)}
        </text>
        <text x={4} y={HEIGHT - PAD_BOTTOM} fontSize="10" fill="var(--text-muted)">
          {yMin.toFixed(1)}
        </text>
        <text x={PAD_LEFT} y={HEIGHT - 6} fontSize="10" fill="var(--text-muted)">
          0s
        </text>
        <text x={WIDTH - PAD_RIGHT - 24} y={HEIGHT - 6} fontSize="10" fill="var(--text-muted)">
          {tMax.toFixed(1)}s
        </text>
        <text x={-(HEIGHT / 2)} y={12} fontSize="10" fill="var(--text-muted)" transform="rotate(-90)" textAnchor="middle">
          {yLabel} ({yUnit})
        </text>

        {targetValue !== undefined && (
          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={yFor(targetValue)}
            y2={yFor(targetValue)}
            stroke="var(--series-4)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        <path d={path} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinecap="round" />

        {hovered && (
          <>
            <line x1={xFor(hovered.tSeconds)} x2={xFor(hovered.tSeconds)} y1={PAD_TOP} y2={HEIGHT - PAD_BOTTOM} stroke="var(--text-muted)" strokeWidth={1} />
            <circle cx={xFor(hovered.tSeconds)} cy={yFor(hovered.position)} r={4} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
          </>
        )}

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        />
      </svg>
      {hovered && (
        <div className="muted" style={{ fontSize: "0.8rem" }}>
          t = {hovered.tSeconds.toFixed(2)}s → {hovered.position.toFixed(2)} {yUnit}
        </div>
      )}
    </div>
  );
}
