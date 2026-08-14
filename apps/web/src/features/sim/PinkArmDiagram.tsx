import { useMemo } from "react";
import { M_TO_INCH, type SimTracePoint } from "@frckickoff/shared";
import { useScrubPlayback } from "./useScrubPlayback";

interface PinkArmDiagramProps {
  pivotTrace: SimTracePoint[]; // position = angle, degrees
  extendTrace: SimTracePoint[]; // position = extension, meters (0..travel)
  baseLengthM: number;
  /** 0 = extension is coaxial with the arm (telescoping "pink arm"); 90 = extension sticks out
   * perpendicular from the arm tip (an elevator rigidly mounted on the end of a pivoting arm),
   * rotating together with the arm either way. Anything in between is a fixed angled mount. */
  mountAngleOffsetDeg: number;
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
export function PinkArmDiagram({ pivotTrace, extendTrace, baseLengthM, mountAngleOffsetDeg, gamePieceRadiusM }: PinkArmDiagramProps) {
  const { scrub, playing, setPlaying, setScrubManually } = useScrubPlayback();

  const angles = useMemo(() => pivotTrace.map((p) => p.position), [pivotTrace]);
  const minAngle = Math.min(...angles);
  const maxAngle = Math.max(...angles);
  const extensions = useMemo(() => extendTrace.map((p) => p.position), [extendTrace]);
  const maxExtension = Math.max(...extensions, 0);

  const currentAngleDeg = minAngle + scrub * (maxAngle - minAngle);
  const currentExtensionM = scrub * maxExtension;

  // Generous, not tightly optimal — safe regardless of mount angle.
  const maxReach = baseLengthM + maxExtension + gamePieceRadiusM;
  const usableW = WIDTH * (1 - PADDING_FRAC * 2);
  const usableH = HEIGHT * (1 - PADDING_FRAC * 2);
  const scale = Math.min(usableW, usableH) / (2 * maxReach);

  function toSvg(p: { x: number; y: number }) {
    return { x: WIDTH / 2 + p.x * scale, y: HEIGHT / 2 - p.y * scale };
  }

  const armAngleRad = (currentAngleDeg * Math.PI) / 180;
  const extAngleRad = ((currentAngleDeg + mountAngleOffsetDeg) * Math.PI) / 180;
  const mathBase = { x: baseLengthM * Math.cos(armAngleRad), y: baseLengthM * Math.sin(armAngleRad) };
  const mathTip = { x: mathBase.x + currentExtensionM * Math.cos(extAngleRad), y: mathBase.y + currentExtensionM * Math.sin(extAngleRad) };

  const A = toSvg({ x: 0, y: 0 });
  const base = toSvg(mathBase);
  const tip = toSvg(mathTip);
  const reachIn = Math.hypot(mathTip.x, mathTip.y) * M_TO_INCH;
  const ballRadiusPx = Math.max(4, gamePieceRadiusM * scale);

  return (
    <div>
      <div className="chart-wrap">
        <svg width={WIDTH} height={HEIGHT} role="img" aria-label="Pivot + telescope diagram">
          <circle cx={A.x} cy={A.y} r={5} fill="var(--text-muted)" />
          <line x1={A.x} y1={A.y} x2={base.x} y2={base.y} stroke="var(--series-1)" strokeWidth={6} strokeLinecap="round" />
          <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} stroke="var(--series-3)" strokeWidth={4} strokeLinecap="round" />
          {mountAngleOffsetDeg !== 0 && <circle cx={base.x} cy={base.y} r={4} fill="var(--surface)" stroke="var(--series-1)" strokeWidth={2} />}
          <circle cx={tip.x} cy={tip.y} r={ballRadiusPx} fill="var(--series-2)" opacity={0.85} />
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "▶ Play"}</button>
        <input type="range" min={0} max={100} value={scrub * 100} onChange={(e) => setScrubManually(Number(e.target.value) / 100)} style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: "0.78rem", minWidth: 110, textAlign: "right" }}>
          reach {reachIn.toFixed(0)} in
        </span>
      </div>
      <div className="legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "var(--series-1)" }} /> Arm (fixed length)
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
