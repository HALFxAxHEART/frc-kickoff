import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { barContact, type ArmAnalysis, type ArmPose, type IntakeAnalysis, type IntakeFrame, type IntakeLabConfig, type IntakeLinkage, type PieceShape } from "@frckickoff/shared";

type JointKey = "a" | "b" | "c" | "d";
type DragTarget = { kind: "bar"; id: string } | { kind: "piece" } | { kind: "joint"; key: JointKey };

export interface ArmView {
  linkage: IntakeLinkage;
  analysis: ArmAnalysis;
  /** the pose to draw right now (animation frame), or null for the deployed pose */
  pose: ArmPose | null;
  onMoveJoint: (key: JointKey, xIn: number, yIn: number) => void;
}

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
  mode: "pickup" | "arm";
  arm: ArmView;
}

const SURFACE_COLORS: Record<string, string> = {
  "poly-bare": "var(--text-muted)",
  "poly-grip": "var(--series-1)",
  "poly-silicone": "var(--series-7)",
  "compliant-wheel": "var(--series-3)",
  "flex-wheel": "var(--series-6)",
  "stealth-wheel": "var(--series-2)",
  "star-flex-30a": "var(--series-5)",
  "star-flex-45a": "var(--series-5)",
  "star-flex-60a": "var(--series-5)",
};

/** Newtons per inch of arrow length when drawing contact forces */
const N_PER_IN = 60;
const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Side view of the intake in inches. SVG's y axis points down, so every y is drawn as -y.
 * Bars and the piece's start position can be dragged.
 */
export function IntakeCanvas({ config, analysis, frames, frameIndex, focusBarId, onMoveBar, onMovePieceStart, onDragStateChange, mode, arm }: IntakeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragTarget | null>(null);
  const rp = config.piece.diameterIn / 2;
  const frame = frames[Math.min(frameIndex, frames.length - 1)];
  const pieceX = frame?.xIn ?? config.pieceStartXIn;
  const pieceY = frame?.yIn ?? analysis.pieceHeightIn / 2;
  const isArm = mode === "arm";
  // In arm mode the bars bolted to the intake are drawn where the linkage has them right now.
  const armPose = isArm ? (arm.pose ?? arm.analysis.samples[arm.analysis.samples.length - 1]?.pose ?? null) : null;
  const barPos = (id: string, x: number, y: number) => {
    const moved = armPose?.bars.find((b) => b.id === id);
    return moved ? { x: moved.x, y: moved.y } : { x, y };
  };
  const armPts = isArm
    ? [arm.linkage.a, arm.linkage.b, ...arm.analysis.paths.flatMap((p) => p.points), ...arm.analysis.samples.flatMap((s) => [s.pose.c, s.pose.d])]
    : [];

  // Keep the view steady while the animation plays: fit everything the piece ever visits (a tumbling tube can point any way).
  const pieceReach = analysis.shape.kind === "circle" ? analysis.shape.r : Math.hypot(analysis.shape.hx, analysis.shape.hy);
  const barExtents = config.bars.map((b) => ({ b, r: barContact(b, config.surfaces).radiusIn }));
  const xs = [
    -6,
    config.pieceStartXIn + (analysis.shape.kind === "circle" ? rp : analysis.shape.hx) + 2,
    20,
    ...barExtents.flatMap(({ b, r }) => [b.xIn - r - 1, b.xIn + r + 1]),
    ...(isArm ? armPts.flatMap((p) => [p.x - 2, p.x + 2]) : frames.map((f) => f.xIn - rp - 1)),
  ];
  const ys = [config.bumper.topIn + 3, analysis.pieceHeightIn + 3, ...barExtents.map(({ b, r }) => b.yIn + r + 2), ...(isArm ? armPts.map((p) => Math.min(p.y + 3, 50)) : frames.map((f) => Math.min(f.yIn + pieceReach + 1, 45)))];
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
    else if (drag.kind === "joint") arm.onMoveJoint(drag.key, round1(p.x), round1(Math.max(0.2, p.y)));
    else onMovePieceStart(round1(Math.max(config.bumper.depthIn + (analysis.shape.kind === "circle" ? rp : analysis.shape.hx) + 0.5, p.x)));
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
    const R = focusAnalysis.contactDiameterIn / 2;
    const th = (focusAnalysis.firstTouchAngleDeg * Math.PI) / 180;
    const grabs = focusAnalysis.firstTouchAngleDeg >= focusAnalysis.minGrabAngleDeg;
    const arcR = Math.min(Math.max(R * 0.9, 1), 2.2);
    let ghost: ReactNode;
    let touchX: number;
    let touchY: number;
    // θ is measured at this point, from level, up to the line toward the bar's center
    let arcCx: number;
    let arcCy: number;
    if (analysis.shape.kind === "circle") {
      // where the piece is, rolling on the carpet, at the moment it first touches this bar
      const reach = rp + R;
      const cx = focus.xIn + reach * Math.cos(th);
      touchX = cx - rp * Math.cos(th);
      touchY = rp + rp * Math.sin(th);
      arcCx = cx;
      arcCy = rp;
      ghost = (
        <>
          <circle cx={cx} cy={-rp} r={rp} className="il-ghost" />
          <line x1={cx - rp - 1} y1={-rp} x2={cx + rp + 0.5} y2={-rp} className="il-dash" />
          <line x1={cx} y1={-rp} x2={focus.xIn} y2={-focus.yIn} className="il-dash" />
        </>
      );
    } else {
      // a box: the bar meets its top front corner (or its flat end face when θ = 0)
      const H = analysis.pieceHeightIn;
      const W = analysis.shape.hx * 2;
      touchX = focus.xIn + R * Math.cos(th);
      touchY = focus.yIn - R * Math.sin(th);
      arcCx = touchX;
      arcCy = touchY;
      ghost = (
        <>
          <rect x={touchX} y={-H} width={W} height={H} className="il-ghost" />
          <line x1={touchX - 2} y1={-touchY} x2={touchX + 1} y2={-touchY} className="il-dash" />
          <line x1={touchX} y1={-touchY} x2={focus.xIn} y2={-focus.yIn} className="il-dash" />
        </>
      );
    }
    construction = (
      <g className="il-construction">
        {ghost}
        {th > 0.01 && (
          <path
            d={`M ${arcCx - arcR} ${-arcCy} A ${arcR} ${arcR} 0 0 1 ${arcCx - arcR * Math.cos(th)} ${-(arcCy + arcR * Math.sin(th))}`}
            className="il-arc"
          />
        )}
        <text x={arcCx - arcR - 0.3} y={-arcCy - 0.4} className="il-small" textAnchor="end">
          θ = {focusAnalysis.firstTouchAngleDeg.toFixed(0)}°
        </text>
        <circle cx={touchX} cy={-touchY} r={0.28} className={grabs ? "il-dot-good" : "il-dot-bad"} />
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

      {!isArm && construction}

      {/* path the piece took */}
      {!isArm && frames.length > 1 && <polyline points={path} className="il-path" />}

      {/* the 4-bar: faint in pickup mode, full detail in arm mode */}
      {isArm && <ArmLayer arm={arm} pose={armPose} onJointDown={(key) => startDrag({ kind: "joint", key })} />}
      {!isArm && <Linkage pose={arm.analysis.samples[arm.analysis.samples.length - 1]?.pose ?? null} faint />}

      {/* bars */}
      {config.bars.map((bar) => {
        const at = barPos(bar.id, bar.xIn, bar.yIn);
        const b = { ...bar, xIn: at.x, yIn: at.y };
        const { radiusIn, surface } = barContact(b, config.surfaces);
        const color = SURFACE_COLORS[surface.id] ?? "var(--text-primary)";
        const tubeColor = SURFACE_COLORS[b.tubeSurface] ?? "var(--text-primary)";
        const spinDeg = (frame ? frame.t : 0) * 720 * (b.passes === "under" ? 1 : -1) * (frame?.rollerRpmFraction ?? 1);
        const hasWheels = b.wheelOdIn > 0;
        return (
          <g key={b.id} className={isArm ? "il-bar-static" : "il-bar"} onPointerDown={isArm ? undefined : startDrag({ kind: "bar", id: b.id })}>
            {hasWheels &&
              (b.wheelSurface.startsWith("star-flex") ? (
                <polygon
                  points={starPoints(b.xIn, -b.yIn, b.wheelOdIn / 2, b.tubeOdIn / 2 + 0.15, 8)}
                  transform={`rotate(${spinDeg} ${b.xIn} ${-b.yIn})`}
                  className="il-wheel il-star"
                  style={{ stroke: SURFACE_COLORS[b.wheelSurface] }}
                />
              ) : (
                <circle cx={b.xIn} cy={-b.yIn} r={b.wheelOdIn / 2} className="il-wheel" style={{ stroke: SURFACE_COLORS[b.wheelSurface] }} />
              ))}
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
      {!isArm && (
      <>
      <PieceGlyph shape={analysis.shape} x={config.pieceStartXIn} y={analysis.pieceHeightIn / 2} angle={0} start onPointerDown={startDrag({ kind: "piece" })} />
      <PieceGlyph shape={analysis.shape} x={pieceX} y={pieceY} angle={frame?.angleRad ?? 0} />
      </>
      )}

      {/* contact forces on the piece */}
      {!isArm && frame?.contacts.map((c, i) => {
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

const PATH_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-5)", "var(--series-7)", "var(--series-6)", "var(--series-4)", "var(--series-8)"];

function Linkage({ pose, faint = false, ghost = false }: { pose: ArmPose | null; faint?: boolean; ghost?: boolean }) {
  if (!pose || !pose.feasible) return null;
  const cls = ghost ? "il-link-ghost" : faint ? "il-link-faint" : "il-link";
  const plate = [pose.c, pose.d, ...pose.bars.map((b) => ({ x: b.x, y: b.y }))];
  // simple outline of the coupler plate: convex hull of its joints and bar centers
  const hull = convexHull(plate);
  return (
    <g className={cls}>
      <polygon points={hull.map((p) => `${p.x},${-p.y}`).join(" ")} className="il-plate" />
      <line x1={pose.a.x} y1={-pose.a.y} x2={pose.c.x} y2={-pose.c.y} className="il-driver" />
      <line x1={pose.b.x} y1={-pose.b.y} x2={pose.d.x} y2={-pose.d.y} className="il-follower" />
      <line x1={pose.c.x} y1={-pose.c.y} x2={pose.d.x} y2={-pose.d.y} className="il-coupler" />
      {ghost &&
        pose.bars.map((b) => <circle key={b.id} cx={b.x} cy={-b.y} r={b.r} className="il-bar-ghost" />)}
    </g>
  );
}

function ArmLayer({ arm, pose, onJointDown }: { arm: ArmView; pose: ArmPose | null; onJointDown: (key: JointKey) => (e: ReactPointerEvent<SVGElement>) => void }) {
  const stowed = arm.analysis.samples[0]?.pose ?? null;
  const l = arm.linkage;
  const joints: { key: JointKey; p: { x: number; y: number }; label: string }[] = [
    { key: "a", p: l.a, label: "A" },
    { key: "b", p: l.b, label: "B" },
    { key: "c", p: l.c, label: "C" },
    { key: "d", p: l.d, label: "D" },
  ];
  return (
    <g>
      <Linkage pose={stowed} ghost />
      {stowed?.feasible && (
        <text x={Math.min(...stowed.bars.map((b) => b.x - b.r), stowed.c.x, stowed.d.x)} y={-Math.max(...stowed.bars.map((b) => b.y + b.r), stowed.c.y, stowed.d.y) - 0.4} className="il-small">
          stowed
        </text>
      )}
      {arm.analysis.paths.map((path, i) => (
        <polyline key={path.id} points={path.points.map((p) => `${p.x},${-p.y}`).join(" ")} className="il-arm-path" style={{ stroke: PATH_COLORS[i % PATH_COLORS.length] }} />
      ))}
      <Linkage pose={pose} />
      {pose?.feasible && (
        <>
          <circle cx={pose.c.x} cy={-pose.c.y} r={0.3} className="il-joint-moving" />
          <circle cx={pose.d.x} cy={-pose.d.y} r={0.3} className="il-joint-moving" />
        </>
      )}
      {joints.map((j) => (
        <g key={j.key} className="il-joint" onPointerDown={onJointDown(j.key)}>
          <rect x={j.p.x - 0.4} y={-j.p.y - 0.4} width={0.8} height={0.8} rx={0.15} />
          <text x={j.p.x + 0.6} y={-j.p.y - 0.5} className="il-label">
            {j.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function convexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
  const pts = [...points].sort((p, q) => p.x - q.x || p.y - q.y);
  if (pts.length < 3) return pts;
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: { x: number; y: number }[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: { x: number; y: number }[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Star wheel outline: `points` tips at radius `outer`, valleys at `inner`. */
function starPoints(cx: number, cy: number, outer: number, inner: number, points: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : Math.max(inner, outer * 0.45);
    const a = (Math.PI * i) / points;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

/** The game piece seen from the side: a circle (lying sideways / a ball) or a tube pointing at the robot / standing up. */
function PieceGlyph({ shape, x, y, angle, start = false, onPointerDown }: { shape: PieceShape; x: number; y: number; angle: number; start?: boolean; onPointerDown?: (e: ReactPointerEvent<SVGElement>) => void }) {
  const rot = `rotate(${(angle * -180) / Math.PI} ${x} ${-y})`;
  if (shape.kind === "circle") {
    if (start) return <circle cx={x} cy={-y} r={shape.r} className="il-start" onPointerDown={onPointerDown} />;
    return (
      <g transform={rot}>
        <circle cx={x} cy={-y} r={shape.r} className="il-piece" />
        <circle cx={x} cy={-y} r={shape.r * 0.78} className="il-piece-inner" />
        <line x1={x} y1={-y} x2={x + shape.r * 0.78} y2={-y} className="il-piece-mark" />
      </g>
    );
  }
  const { hx, hy } = shape;
  if (start) return <rect x={x - hx} y={-y - hy} width={hx * 2} height={hy * 2} rx={0.15} className="il-start" onPointerDown={onPointerDown} />;
  // the tube's wall lines run along its long side
  const alongX = hx >= hy;
  const wall = (alongX ? hy : hx) * 0.78;
  return (
    <g transform={rot}>
      <rect x={x - hx} y={-y - hy} width={hx * 2} height={hy * 2} rx={0.15} className="il-piece" />
      {alongX ? (
        <>
          <line x1={x - hx} y1={-y - wall} x2={x + hx} y2={-y - wall} className="il-piece-inner" />
          <line x1={x - hx} y1={-y + wall} x2={x + hx} y2={-y + wall} className="il-piece-inner" />
        </>
      ) : (
        <>
          <line x1={x - wall} y1={-y - hy} x2={x - wall} y2={-y + hy} className="il-piece-inner" />
          <line x1={x + wall} y1={-y - hy} x2={x + wall} y2={-y + hy} className="il-piece-inner" />
        </>
      )}
    </g>
  );
}
