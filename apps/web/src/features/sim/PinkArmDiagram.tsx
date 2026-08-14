import { useMemo } from "react";
import { M_TO_INCH, type SimTracePoint } from "@frckickoff/shared";
import { useScrubPlayback } from "./useScrubPlayback";

interface PinkArmDiagramProps {
  pivotTrace: SimTracePoint[]; // position = angle, degrees
  extendTrace: SimTracePoint[]; // position = extension, meters (0..travel)
  baseLengthM: number;
  gamePieceRadiusM: number;
}

const WIDTH = 420;
const HEIGHT = 320;
const PADDING_FRAC = 0.18;

/**
 * Assumes the pivot and extension move in lockstep — both driven from 0% to 100% of their own
 * travel together, finishing at the same moment. Real drive code could sequence or profile them
 * differently; this is a "what does the combined reach look like" preview, not a motion plan.
 */
export function PinkArmDiagram({ pivotTrace, extendTrace, baseLengthM, gamePieceRadiusM }: PinkArmDiagramProps) {
  const { scrub, playing, setPlaying, setScrubManually } = useScrubPlayback();

  const angles = useMemo(() => pivotTrace.map((p) => p.position), [pivotTrace]);
  const minAngle = Math.min(...angles);
  const maxAngle = Math.max(...angles);
  const extensions = useMemo(() => extendTrace.map((p) => p.position), [extendTrace]);
  const maxExtension = Math.max(...extensions, 0);

  const currentAngleDeg = minAngle + scrub * (maxAngle - minAngle);
  const currentExtensionM = scrub * maxExtension;
  const currentLengthM = baseLengthM + currentExtensionM;

  const maxReach = baseLengthM + maxExtension + gamePieceRadiusM;
  const usableW = WIDTH * (1 - PADDING_FRAC * 2);
  const usableH = HEIGHT * (1 - PADDING_FRAC * 2);
  const scale = Math.min(usableW, usableH) / (2 * maxReach);

  function toSvg(p: { x: number; y: number }) {
    return { x: WIDTH / 2 + p.x * scale, y: HEIGHT / 2 - p.y * scale };
  }

  const angleRad = (currentAngleDeg * Math.PI) / 180;
  const A = toSvg({ x: 0, y: 0 });
  const base = toSvg({ x: baseLengthM * Math.cos(angleRad), y: baseLengthM * Math.sin(angleRad) });
  const tip = toSvg({ x: currentLengthM * Math.cos(angleRad), y: currentLengthM * Math.sin(angleRad) });
  const ballRadiusPx = Math.max(4, gamePieceRadiusM * scale);

  return (
    <div>
      <div className="chart-wrap">
        <svg width={WIDTH} height={HEIGHT} role="img" aria-label="Pink arm diagram">
          <circle cx={A.x} cy={A.y} r={5} fill="var(--text-muted)" />
          <line x1={A.x} y1={A.y} x2={base.x} y2={base.y} stroke="var(--series-1)" strokeWidth={6} strokeLinecap="round" />
          <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} stroke="var(--series-3)" strokeWidth={4} strokeLinecap="round" />
          <circle cx={tip.x} cy={tip.y} r={ballRadiusPx} fill="var(--series-2)" opacity={0.85} />
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "▶ Play"}</button>
        <input type="range" min={0} max={100} value={scrub * 100} onChange={(e) => setScrubManually(Number(e.target.value) / 100)} style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: "0.78rem", minWidth: 90, textAlign: "right" }}>
          {currentAngleDeg.toFixed(0)}°, {(currentLengthM * M_TO_INCH).toFixed(0)} in
        </span>
      </div>
      <div className="legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "var(--series-1)" }} /> Base (fixed length)
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "var(--series-3)" }} /> Extension
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "var(--series-2)", borderRadius: "50%" }} /> Game piece
        </span>
      </div>
    </div>
  );
}
