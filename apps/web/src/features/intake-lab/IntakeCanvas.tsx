import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { barContact, type IntakeAnalysis, type IntakeFrame, type IntakeLabConfig } from "@frckickoff/shared";

type DragTarget = { kind: "bar"; id: string } | { kind: "piece" };

interface IntakeCanvasProps {
  config: IntakeLabConfig;
  analysis: IntakeAnalysis;
  frames: IntakeFrame[];
  frameIndex: number;
  /** Shows the "first touch" construction lines for this bar */
  focusBarId: string | null;
  onMoveBar: (id: string, xIn: number, yIn: number) => void;
  onMovePieceStart: (xIn: number) => void;
  onDragStateChange: (dragging: boolean) => void;
}

const SURFACE_COLORS: Record<string, string> = {
  "poly-bare": "var(--text-muted)",
  "poly-grip": "var(--series-1)",
  "poly-silicone": "var(--series-7)",
  "compliant-wheel": "var(--series-3)",
  "flex-wheel": "var(--series-6)",
  "stealth-wheel": "var(--series-2)",
};

/** Newtons per inch of arrow length when drawing contact forces */
const N_PER_IN = 60;
const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Side view of the intake in inches. SVG's y axis points down, so every y is drawn as -y.
 * Bars and the piece's start position can be dragged.
 */
export function IntakeCanvas({ config, analysis, frames, frameIndex, focusBarId, onMoveBar, onMovePieceStart, onDragStateChange }: IntakeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragTarget | null>(null);
  const rp = config.piece.diameterIn / 2;
  const frame = frames[Math.min(frameIndex, frames.length - 1)];
  const pieceX = frame?.xIn ?? config.pieceStartXIn;
  const pieceY = frame?.yIn ?? rp;

  // Keep the view steady while the animation plays: fit everything the piece ever visits.
  const barExtents = config.bars.map((b) => ({ b, r: barContact(b, config.surfaces).radiusIn }));
  const xs = [
    -6,
    config.pieceStartXIn + rp + 2,
    20,
    ...barExtents.flatMap(({ b, r }) => [b.xIn - r - 1, b.xIn + r + 1]),
    ...frames.map((f) => f.xIn - rp - 1),
  ];
  const ys = [config.bumper.topIn + 3, rp * 2 + 3, ...barExtents.map(({ b, r }) => b.yIn + r + 2), ...frames.map((f) => Math.min(f.yIn + rp + 1, 40))];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const viewBox = `${minX} ${-maxY} ${maxX - minX} ${maxY + 2.5}`;

  function svgPoint(e: ReactPointerEvent<SVGSVGElement>): { x: number; y: number } | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: -p.y };
  }

  function startDrag(target: DragTarget) {
    return (e: ReactPointerEvent<SVGElement>) => {
      e.stopPropagation();
      svgRef.current?.setPointerCapture(e.pointerId);
      setDrag(target);
      onDragStateChange(true);
    };
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const p = svgPoint(e);
    if (!p) return;
    if (drag.kind === "bar") onMoveBar(drag.id, round1(p.x), round1(Math.max(0.2, p.y)));
    else onMovePieceStart(round1(Math.max(config.bumper.depthIn + rp + 0.5, p.x)));
  }

  function endDrag(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drag) return;
    svgRef.current?.releasePointerCapture(e.pointerId);
    setDrag(null);
    onDragStateChange(false);
  }

  const focus = focusBarId ? config.bars.find((b) => b.id === focusBarId) : undefined;
  const focusAnalysis = focus ? analysis.bars.find((a) => a.id === focus.id) : undefined;
  let construction: ReactNode = null;
  if (focus && focusAnalysis && focusAnalysis.firstTouchAngleDeg !== null) {
    // where the piece is, rolling on the carpet, at the moment it first touches this bar
    const R = focusAnalysis.contactDiameterIn / 2;
    const reach = rp + R;
    const th = (focusAnalysis.firstTouchAngleDeg * Math.PI) / 180;
    const cx = focus.xIn + reach * Math.cos(th);
    const cy = rp;
    const touchX = cx - rp * Math.cos(th);
    const touchY = cy + rp * Math.sin(th);
    const arcR = Math.min(rp * 0.8, 2.2);
    construction = (
      <g className="il-construction">
        <circle cx={cx} cy={-cy} r={rp} className="il-ghost" />
        <line x1={cx - rp - 1} y1={-cy} x2={cx + rp + 0.5} y2={-cy} className="il-dash" />
        <line x1={cx} y1={-cy} x2={focus.xIn} y2={-focus.yIn} className="il-dash" />
        <path d={`M ${cx - arcR} ${-cy} A ${arcR} ${arcR} 0 0 1 ${cx - arcR * Math.cos(th)} ${-(cy + arcR * Math.sin(th))}`} className="il-arc" />
        <text x={cx - arcR - 0.3} y={-cy - 0.4} className="il-small" textAnchor="end">
          θ = {focusAnalysis.firstTouchAngleDeg.toFixed(0)}°
        </text>
        <circle cx={touchX} cy={-touchY} r={0.28} className={focusAnalysis.firstTouchAngleDeg >= focusAnalysis.minGrabAngleDeg ? "il-dot-good" : "il-dot-bad"} />
      </g>
    );
  }

  const path = frames.map((f) => `${f.xIn},${-f.yIn}`).join(" ");

  return (
    <svg
      ref={svgRef}
      className={"il-canvas" + (drag ? " dragging" : "")}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <defs>
        <marker id="il-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--status-critical)" />
        </marker>
        <pattern id="il-hatch" width="1" height="1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="1" stroke="var(--gridline)" strokeWidth="0.35" />
        </pattern>
      </defs>

      {/* inside the robot */}
      <rect x={minX} y={-maxY} width={-minX} height={maxY} className="il-robot" />
      <text x={minX + 0.4} y={-0.5} className="il-small">
        inside robot
      </text>
      <line x1={0} y1={-maxY} x2={0} y2={0} className="il-perimeter" />
      <text x={0.3} y={-maxY + 1.2} className="il-small">
        frame perimeter
      </text>
      <line x1={18} y1={-maxY} x2={18} y2={0} className="il-limit" />
      <text x={18.3} y={-maxY + 1.2} className="il-small">
        18 in limit (2025)
      </text>

      {/* inch grid every 2 in */}
      {Array.from({ length: Math.ceil((maxX - minX) / 2) + 1 }, (_, i) => Math.ceil(minX / 2) * 2 + i * 2).map((gx) => (
        <text key={gx} x={gx} y={1.8} className="il-axis" textAnchor="middle">
          {gx}
        </text>
      ))}

      {/* carpet */}
      <rect x={minX} y={0} width={maxX - minX} height={1} fill="url(#il-hatch)" />
      <line x1={minX} y1={0} x2={maxX} y2={0} className="il-floor" />

      {/* bumper */}
      <rect
        x={0}
        y={-config.bumper.topIn}
        width={config.bumper.depthIn}
        height={config.bumper.topIn - config.bumper.bottomIn}
        rx={0.6}
        className="il-bumper"
      />

      {construction}

      {/* path the piece took */}
      {frames.length > 1 && <polyline points={path} className="il-path" />}

      {/* bars */}
      {config.bars.map((b) => {
        const { radiusIn, surface } = barContact(b, config.surfaces);
        const color = SURFACE_COLORS[surface.id] ?? "var(--text-primary)";
        const tubeColor = SURFACE_COLORS[b.tubeSurface] ?? "var(--text-primary)";
        const spinDeg = (frame ? frame.t : 0) * 720 * (b.passes === "under" ? 1 : -1) * (frame?.rollerRpmFraction ?? 1);
        const hasWheels = b.wheelOdIn > 0;
        return (
          <g key={b.id} className="il-bar" onPointerDown={startDrag({ kind: "bar", id: b.id })}>
            {hasWheels && <circle cx={b.xIn} cy={-b.yIn} r={b.wheelOdIn / 2} className="il-wheel" style={{ stroke: SURFACE_COLORS[b.wheelSurface] }} />}
            <circle cx={b.xIn} cy={-b.yIn} r={b.tubeOdIn / 2} className="il-tube" style={{ stroke: tubeColor }} />
            <line
              x1={b.xIn}
              y1={-b.yIn}
              x2={b.xIn + radiusIn * 0.85}
              y2={-b.yIn}
              transform={`rotate(${spinDeg} ${b.xIn} ${-b.yIn})`}
              className="il-spoke"
              style={{ stroke: color }}
            />
            <circle cx={b.xIn} cy={-b.yIn} r={0.18} fill={color} />
            <text x={b.xIn} y={-b.yIn - radiusIn - 0.35} className="il-label" textAnchor="middle">
              {b.id} {b.passes === "under" ? "↻" : "↺"}
            </text>
          </g>
        );
      })}

      {/* the game piece (start position ghost + current frame) */}
      <circle cx={config.pieceStartXIn} cy={-rp} r={rp} className="il-start" onPointerDown={startDrag({ kind: "piece" })} />
      <g transform={`rotate(${((frame?.angleRad ?? 0) * -180) / Math.PI} ${pieceX} ${-pieceY})`}>
        <circle cx={pieceX} cy={-pieceY} r={rp} className="il-piece" />
        <circle cx={pieceX} cy={-pieceY} r={rp * 0.78} className="il-piece-inner" />
        <line x1={pieceX} y1={-pieceY} x2={pieceX + rp * 0.78} y2={-pieceY} className="il-piece-mark" />
      </g>

      {/* contact forces on the piece */}
      {frame?.contacts.map((c, i) => {
        const len = Math.hypot(c.fx, c.fy) / N_PER_IN;
        if (len < 0.15) return null;
        const k = Math.min(len, 6) / len;
        return (
          <line
            key={i}
            x1={c.xIn}
            y1={-c.yIn}
            x2={c.xIn + (c.fx / N_PER_IN) * k}
            y2={-(c.yIn + (c.fy / N_PER_IN) * k)}
            className="il-force"
            markerEnd="url(#il-arrow)"
          />
        );
      })}
    </svg>
  );
}
