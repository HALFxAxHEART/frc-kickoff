import { useEffect, useMemo, useRef, useState } from "react";
import { solveFourBar, M_TO_INCH, type SimTracePoint } from "@frckickoff/shared";

interface FourBarLinks {
  groundLenM: number;
  groundAngleDeg: number;
  couplerLenM: number;
  outputLenM: number;
}

interface MechanismDiagramProps {
  trace: SimTracePoint[];
  inputLenM: number;
  fourBar?: FourBarLinks;
  gamePieceRadiusM: number;
}

const WIDTH = 420;
const HEIGHT = 320;
const PADDING_FRAC = 0.18;

function effectorPoint(angleDeg: number, inputLenM: number, fourBar: FourBarLinks | undefined) {
  if (!fourBar) {
    return {
      feasible: true as const,
      pivotA: { x: 0, y: 0 },
      pivotB: null,
      jointC: { x: inputLenM * Math.cos((angleDeg * Math.PI) / 180), y: inputLenM * Math.sin((angleDeg * Math.PI) / 180) },
      jointD: null,
      warning: undefined,
    };
  }
  const sol = solveFourBar({ ...fourBar, inputLenM, inputAngleDeg: angleDeg });
  return { feasible: sol.feasible, pivotA: sol.pivotA, pivotB: sol.pivotB, jointC: sol.jointC, jointD: sol.feasible ? sol.jointD : null, warning: sol.warning };
}

export function MechanismDiagram({ trace, inputLenM, fourBar, gamePieceRadiusM }: MechanismDiagramProps) {
  const [scrub, setScrub] = useState(1); // 0..1 through the sweep
  const [playing, setPlaying] = useState(false);
  const directionRef = useRef(1);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setScrub((s) => {
        let next = s + directionRef.current * 0.02;
        if (next >= 1) {
          next = 1;
          directionRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          directionRef.current = 1;
        }
        return next;
      });
    }, 30);
    return () => clearInterval(id);
  }, [playing]);

  const angles = useMemo(() => trace.map((p) => p.position), [trace]);
  const minAngle = Math.min(...angles);
  const maxAngle = Math.max(...angles);
  const currentAngle = minAngle + scrub * (maxAngle - minAngle);

  // Bounding box sampled across the full sweep (not just the current frame) so the view never
  // jumps or rescales during playback.
  const bounds = useMemo(() => {
    const samples = 16;
    const xs: number[] = [0];
    const ys: number[] = [0];
    for (let i = 0; i <= samples; i++) {
      const a = minAngle + (i / samples) * (maxAngle - minAngle);
      const p = effectorPoint(a, inputLenM, fourBar);
      xs.push(p.jointC.x);
      ys.push(p.jointC.y);
      if (p.pivotB) {
        xs.push(p.pivotB.x);
        ys.push(p.pivotB.y);
      }
      if (p.jointD) {
        xs.push(p.jointD.x);
        ys.push(p.jointD.y);
      }
    }
    const minX = Math.min(...xs) - gamePieceRadiusM;
    const maxX = Math.max(...xs) + gamePieceRadiusM;
    const minY = Math.min(...ys) - gamePieceRadiusM;
    const maxY = Math.max(...ys) + gamePieceRadiusM;
    return { minX, maxX, minY, maxY };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minAngle, maxAngle, inputLenM, fourBar, gamePieceRadiusM]);

  const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const usableW = WIDTH * (1 - PADDING_FRAC * 2);
  const usableH = HEIGHT * (1 - PADDING_FRAC * 2);
  const scale = Math.min(usableW / spanX, usableH / spanY);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  function toSvg(p: { x: number; y: number }) {
    return { x: WIDTH / 2 + (p.x - centerX) * scale, y: HEIGHT / 2 - (p.y - centerY) * scale };
  }

  const current = effectorPoint(currentAngle, inputLenM, fourBar);
  const A = toSvg(current.pivotA);
  const B = current.pivotB ? toSvg(current.pivotB) : null;
  const C = toSvg(current.jointC);
  const D = current.jointD ? toSvg(current.jointD) : null;
  const ballCenter = D ?? C;
  const ballRadiusPx = gamePieceRadiusM * scale;

  return (
    <div>
      <div className="chart-wrap">
        <svg width={WIDTH} height={HEIGHT} role="img" aria-label="Mechanism diagram">
          {B && (
            <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="var(--baseline)" strokeWidth={3} strokeDasharray="6 4" strokeLinecap="round" />
          )}
          {B && (
            <>
              <circle cx={A.x} cy={A.y} r={5} fill="var(--text-muted)" />
              <circle cx={B.x} cy={B.y} r={5} fill="var(--text-muted)" />
            </>
          )}
          {!B && <circle cx={A.x} cy={A.y} r={5} fill="var(--text-muted)" />}

          <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="var(--series-1)" strokeWidth={4} strokeLinecap="round" />

          {D && B && (
            <>
              <line x1={C.x} y1={C.y} x2={D.x} y2={D.y} stroke="var(--series-3)" strokeWidth={4} strokeLinecap="round" />
              <line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="var(--series-7)" strokeWidth={4} strokeLinecap="round" />
              <circle cx={C.x} cy={C.y} r={4} fill="var(--surface)" stroke="var(--series-1)" strokeWidth={2} />
            </>
          )}

          <circle cx={ballCenter.x} cy={ballCenter.y} r={Math.max(4, ballRadiusPx)} fill="var(--series-2)" opacity={0.85} />

          {!current.feasible && (
            <text x={WIDTH / 2} y={20} textAnchor="middle" fontSize="12" fill="var(--status-critical)">
              Doesn't assemble at this angle
            </text>
          )}
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "▶ Play"}</button>
        <input
          type="range"
          min={0}
          max={100}
          value={scrub * 100}
          onChange={(e) => {
            setPlaying(false);
            setScrub(Number(e.target.value) / 100);
          }}
          style={{ flex: 1 }}
        />
        <span className="muted" style={{ fontSize: "0.78rem", minWidth: 70, textAlign: "right" }}>
          {(minAngle + scrub * (maxAngle - minAngle)).toFixed(0)}°
        </span>
      </div>
      <div className="legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "var(--series-1)" }} /> Input link
        </span>
        {fourBar && (
          <>
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: "var(--series-3)" }} /> Coupler
            </span>
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: "var(--series-7)" }} /> Output link
            </span>
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: "var(--baseline)" }} /> Frame (fixed)
            </span>
          </>
        )}
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "var(--series-2)", borderRadius: "50%" }} /> Game piece
        </span>
      </div>
      <p className="muted" style={{ fontSize: "0.78rem" }}>
        Effector reach from pivot: {(Math.hypot((current.jointD ?? current.jointC).x, (current.jointD ?? current.jointC).y) * M_TO_INCH).toFixed(1)} in from the input pivot.
      </p>
    </div>
  );
}
