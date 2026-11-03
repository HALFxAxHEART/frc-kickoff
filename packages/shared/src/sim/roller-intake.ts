import { getMotor, freeSpeedRadPerSec } from "./motors";
import { INCH_TO_M, LB_TO_KG } from "./units";

/**
 * 2D side-view roller intake sandbox. Everything is in the ROBOT's frame: the robot sits still and
 * the carpet slides toward it at the drive speed (same physics as the robot driving at a piece
 * that is sitting still on the field). x = forward from the frame perimeter (+ = out in front of
 * the robot), y = up from the carpet. Inputs are inches/lb; the simulation runs in SI internally.
 *
 * Contact model: a stiff spring + damper pushes overlapping circles apart (normal force N), and
 * friction (up to mu * N) tries to make the two surfaces move together. That is enough to show the
 * real behaviours students care about: rollers that grab vs. rollers that just shove the piece,
 * pieces that stall in a pinch, and roller motors that bog down when there's too much squish.
 */

export type RollerSurfaceId =
  | "poly-bare"
  | "poly-grip"
  | "poly-silicone"
  | "compliant-wheel"
  | "flex-wheel"
  | "star-flex-30a"
  | "star-flex-45a"
  | "star-flex-60a"
  | "stealth-wheel";

export interface RollerSurfaceSpec {
  id: RollerSurfaceId;
  label: string;
  /** "tube" = a polycarb tube cover, "wheel" = a wheel slid onto the bar */
  kind: "tube" | "wheel";
  /** Rough friction coefficient against smooth plastic game pieces (PVC / foam-core). ESTIMATE — measure yours. */
  mu: number;
  /** How hard it pushes back per unit of squish, N/m. ESTIMATE from wheel durometer / tube stiffness. */
  stiffnessNPerM: number;
  note: string;
}

export const ROLLER_SURFACES: RollerSurfaceSpec[] = [
  { id: "poly-bare", label: "Polycarb tube, bare", kind: "tube", mu: 0.3, stiffnessNPerM: 8000, note: "Smooth and hard: slides on PVC. Fine for guide rollers, poor for grabbing." },
  { id: "poly-grip", label: "Polycarb tube + grip tape", kind: "tube", mu: 0.9, stiffnessNPerM: 8000, note: "Cheap, durable, lots of grip. Stiffer than wheels, so a little squish squeezes hard." },
  { id: "poly-silicone", label: "Polycarb tube + silicone sleeve", kind: "tube", mu: 1.0, stiffnessNPerM: 6000, note: "Grippy and a little soft. Sleeves can roll or tear at the ends: glue or tape them." },
  { id: "compliant-wheel", label: "Compliant wheels", kind: "wheel", mu: 1.0, stiffnessNPerM: 2500, note: "Soft rubber-like wheels: lots of squish, forgiving height. Wear over a season." },
  { id: "flex-wheel", label: "Flex wheels", kind: "wheel", mu: 1.1, stiffnessNPerM: 5000, note: "Spoked urethane wheels: grippy, medium squish, very durable." },
  // WCP Star Flex Wheels: silicone, 30A / 45A / 60A, 1.625-4 in on 1/2 in hex (and 5 in). The points bend, so they squish a lot for their size.
  { id: "star-flex-30a", label: "WCP Star Flex wheels, 30A (soft)", kind: "wheel", mu: 1.2, stiffnessNPerM: 1500, note: "Silicone stars that fold around the piece. Most grip and squish; wears fastest." },
  { id: "star-flex-45a", label: "WCP Star Flex wheels, 45A (medium)", kind: "wheel", mu: 1.1, stiffnessNPerM: 3000, note: "The middle choice: good grip, holds its shape. A sensible first pick." },
  { id: "star-flex-60a", label: "WCP Star Flex wheels, 60A (hard)", kind: "wheel", mu: 1.0, stiffnessNPerM: 6000, note: "Stiffer points: less squish, longest life. Good for feeders and funnels." },
  { id: "stealth-wheel", label: "Stealth (hard urethane) wheels", kind: "wheel", mu: 0.6, stiffnessNPerM: 40000, note: "Hard and smooth. 4795 found them too slippery on coral in 2025." },
];

export function getSurface(id: RollerSurfaceId, surfaces: RollerSurfaceSpec[] = ROLLER_SURFACES): RollerSurfaceSpec {
  const s = surfaces.find((x) => x.id === id) ?? ROLLER_SURFACES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown roller surface: ${id}`);
  return s;
}

export interface GamePieceSpec {
  id: string;
  name: string;
  diameterIn: number;
  weightLb: number;
  /** "tube" (mass at the outside, I = m r^2) or "ball" (hollow ball, I = 2/3 m r^2) */
  shape: "tube" | "ball";
  /** How hard the piece itself is, N/m. PVC coral is very stiff; a foam ball is soft. */
  stiffnessNPerM: number;
  /** Friction of the piece sliding on carpet */
  carpetMu: number;
  /** Tubes only: how long the tube is (coral: 11-7/8 in). Used when it points at the robot or stands up. */
  lengthIn?: number;
}

/** Which way a tube lies on the carpet, as seen from the side of the robot. */
export type PieceOrientation = "sideways" | "end-on" | "standing";

/** The piece as the simulator sees it from the side: a circle, or a box (half-width hx along x, half-height hy). */
export type PieceShape = { kind: "circle"; r: number } | { kind: "box"; hx: number; hy: number };

export function pieceShapeIn(piece: GamePieceSpec, orientation: PieceOrientation = "sideways"): PieceShape {
  const r = piece.diameterIn / 2;
  const len = piece.lengthIn ?? 0;
  if (piece.shape !== "tube" || orientation === "sideways" || len <= piece.diameterIn) return { kind: "circle", r };
  return orientation === "end-on" ? { kind: "box", hx: len / 2, hy: r } : { kind: "box", hx: r, hy: len / 2 };
}

export const GAME_PIECE_PRESETS: GamePieceSpec[] = [
  { id: "coral-2025", name: "Coral (2025)", diameterIn: 4.5, weightLb: 1.5, shape: "tube", stiffnessNPerM: 200000, carpetMu: 0.4, lengthIn: 11.875 },
  { id: "cargo-2022", name: "Cargo (2022)", diameterIn: 9.5, weightLb: 0.6, shape: "ball", stiffnessNPerM: 6000, carpetMu: 0.6 },
];

export interface IntakeBar {
  id: string;
  /** Center of the bar, inches. x forward of the frame perimeter, y above the carpet. */
  xIn: number;
  yIn: number;
  tubeOdIn: number;
  tubeSurface: RollerSurfaceId;
  /** 0 = no wheels on this bar */
  wheelOdIn: number;
  wheelSurface: RollerSurfaceId;
  /** Motor turns per bar turn */
  ratio: number;
  /** "under": the piece goes under this bar (bar spins so its bottom moves toward the robot).
   *  "over": the piece rides over it (its top moves toward the robot). */
  passes: "under" | "over";
}

export interface IntakeLabConfig {
  piece: GamePieceSpec;
  /** Where the piece starts on the carpet, inches in front of the frame perimeter */
  pieceStartXIn: number;
  bars: IntakeBar[];
  driveSpeedFtPerSec: number;
  rollerMotorId: string;
  /** Roller motor output, 0..1 (like percent output) */
  rollerOutput: number;
  bumper: { depthIn: number; bottomIn: number; topIn: number };
  /** Optional measured friction/stiffness values that replace the built-in estimates */
  surfaces?: RollerSurfaceSpec[];
  /** How a tube-shaped piece lies on the carpet (balls ignore this) */
  orientation?: PieceOrientation;
  maxTimeS?: number;
}

/** What actually touches the piece on a bar: the bigger of the tube and its wheels. */
export function barContact(bar: IntakeBar, surfaces?: RollerSurfaceSpec[]): { radiusIn: number; surface: RollerSurfaceSpec } {
  const useWheel = bar.wheelOdIn > bar.tubeOdIn;
  return useWheel
    ? { radiusIn: bar.wheelOdIn / 2, surface: getSurface(bar.wheelSurface, surfaces) }
    : { radiusIn: bar.tubeOdIn / 2, surface: getSurface(bar.tubeSurface, surfaces) };
}

export interface BarAnalysis {
  id: string;
  contactDiameterIn: number;
  surface: RollerSurfaceSpec;
  /** Bar speed with the motor spinning freely at the chosen output */
  freeRpm: number;
  surfaceSpeedFtPerSec: number;
  /** Surface speed divided by drive speed. Want 2 or more on the front bar. */
  speedRatioToDrive: number;
  /** Smallest contact angle where friction can win: atan(1 / mu) */
  minGrabAngleDeg: number;
  /** Angle above level of the contact line (from where it touches the piece to the bar's center), at first touch with a
   *  piece on the carpet. Sideways tube/ball: from the piece's center. End-on / standing tube: from the top front corner.
   *  0 = it hits the flat end face square on. null = the bar never touches the piece (too high). */
  firstTouchAngleDeg: number | null;
  /** How much the piece on the carpet would have to squish to pass under this bar (inches, <= 0 means it fits without touching) */
  floorSquishIn: number;
}

export interface IntakeAnalysis {
  bars: BarAnalysis[];
  shape: PieceShape;
  /** How tall the piece is on the carpet (in) */
  pieceHeightIn: number;
  /** The bar a piece on the carpet hits first (furthest forward that it can touch) */
  frontBarId: string | null;
  /** Pinch points: an "under" bar and an "over" bar close enough that the piece squeezes between them */
  gaps: { fromId: string; toId: string; gapIn: number; squishIn: number }[];
}

export function analyzeIntake(cfg: IntakeLabConfig): IntakeAnalysis {
  const motor = getMotor(cfg.rollerMotorId);
  const rp = cfg.piece.diameterIn / 2;
  const shape = pieceShapeIn(cfg.piece, cfg.orientation);
  const pieceHeightIn = shape.kind === "circle" ? shape.r * 2 : shape.hy * 2;
  const driveInPerSec = Math.max(cfg.driveSpeedFtPerSec * 12, 1e-6);
  const bars: BarAnalysis[] = cfg.bars.map((bar) => {
    const { radiusIn, surface } = barContact(bar, cfg.surfaces);
    const freeRpm = (motor.freeSpeedRPM * cfg.rollerOutput) / Math.max(bar.ratio, 1e-6);
    const surfaceInPerSec = (Math.PI * 2 * radiusIn * freeRpm) / 60;
    let firstTouchAngleDeg: number | null;
    if (shape.kind === "circle") {
      const reach = rp + radiusIn;
      const dy = bar.yIn - rp;
      firstTouchAngleDeg = Math.abs(dy) < reach ? (Math.asin(dy / reach) * 180) / Math.PI : null;
    } else {
      // a box sliding in: the bar meets its top front corner (or its flat end face if the bar is lower than the top)
      const above = bar.yIn - pieceHeightIn;
      firstTouchAngleDeg = above >= radiusIn ? null : above <= 0 ? (bar.yIn + radiusIn > 0 ? 0 : null) : (Math.asin(above / radiusIn) * 180) / Math.PI;
    }
    return {
      id: bar.id,
      contactDiameterIn: radiusIn * 2,
      surface,
      freeRpm,
      surfaceSpeedFtPerSec: surfaceInPerSec / 12,
      speedRatioToDrive: surfaceInPerSec / driveInPerSec,
      minGrabAngleDeg: (Math.atan(1 / surface.mu) * 180) / Math.PI,
      firstTouchAngleDeg,
      floorSquishIn: pieceHeightIn - (bar.yIn - radiusIn),
    };
  });
  const touchable = cfg.bars
    .map((b, i) => ({ b, a: bars[i] }))
    .filter(({ a }) => a !== undefined && a.firstTouchAngleDeg !== null)
    .sort((p, q) => q.b.xIn - p.b.xIn);
  const gaps: IntakeAnalysis["gaps"] = [];
  for (const a of cfg.bars) {
    if (a.passes !== "under") continue;
    for (const b of cfg.bars) {
      if (b.passes !== "over") continue;
      const gap = Math.hypot(a.xIn - b.xIn, a.yIn - b.yIn) - barContact(a, cfg.surfaces).radiusIn - barContact(b, cfg.surfaces).radiusIn;
      // only pairs the piece can actually be squeezed between
      if (gap < cfg.piece.diameterIn + 0.5) gaps.push({ fromId: a.id, toId: b.id, gapIn: gap, squishIn: cfg.piece.diameterIn - gap });
    }
  }
  return { bars, shape, pieceHeightIn, frontBarId: touchable[0]?.b.id ?? null, gaps };
}

// ---------------------------------------------------------------------------------------------
// Time-domain simulation

export interface ContactForce {
  /** "floor" | "bumper" | bar id */
  with: string;
  /** Contact point, inches */
  xIn: number;
  yIn: number;
  /** Force ON the piece, newtons */
  fx: number;
  fy: number;
}

export interface IntakeFrame {
  t: number;
  xIn: number;
  yIn: number;
  angleRad: number;
  rollerRpmFraction: number;
  contacts: ContactForce[];
}

export type IntakeOutcome =
  | { kind: "in"; timeS: number }
  | { kind: "stuck"; timeS: number; nearBarId: string | null }
  | { kind: "missed"; timeS: number }
  | { kind: "thrown"; timeS: number }
  | { kind: "timeout"; timeS: number };

export interface IntakeSimResult {
  frames: IntakeFrame[];
  outcome: IntakeOutcome;
  /** Highest roller-motor torque needed, as a fraction of the motor's stall torque */
  peakMotorLoadFraction: number;
  /** Lowest roller speed seen, as a fraction of its free speed (1 = never slowed down) */
  minRollerSpeedFraction: number;
  /** Biggest push between a bar and the piece, newtons */
  peakBarForceN: number;
  /** Biggest push per bar (by bar id), newtons */
  peakForceByBarN: Record<string, number>;
}

const G = 9.81;

export function simulateIntake(cfg: IntakeLabConfig): IntakeSimResult {
  const motor = getMotor(cfg.rollerMotorId);
  const shapeIn = pieceShapeIn(cfg.piece, cfg.orientation);
  const shape: PieceShape =
    shapeIn.kind === "circle" ? { kind: "circle", r: shapeIn.r * INCH_TO_M } : { kind: "box", hx: shapeIn.hx * INCH_TO_M, hy: shapeIn.hy * INCH_TO_M };
  const rp = (cfg.piece.diameterIn / 2) * INCH_TO_M;
  /** half-height of the piece as it sits on the carpet */
  const restHalfHeight = shape.kind === "circle" ? shape.r : shape.hy;
  const m = Math.max(cfg.piece.weightLb * LB_TO_KG, 0.01);
  let I: number;
  if (shape.kind === "circle") I = cfg.piece.shape === "tube" ? m * rp * rp : (2 / 3) * m * rp * rp;
  else {
    // a thin-walled tube tumbling end over end: m (r^2 / 2 + L^2 / 12)
    const len = (cfg.piece.lengthIn ?? cfg.piece.diameterIn) * INCH_TO_M;
    I = m * ((rp * rp) / 2 + (len * len) / 12);
  }
  const vFloor = -cfg.driveSpeedFtPerSec * 0.3048;
  const bumper = {
    x0: 0,
    x1: cfg.bumper.depthIn * INCH_TO_M,
    y0: cfg.bumper.bottomIn * INCH_TO_M,
    y1: cfg.bumper.topIn * INCH_TO_M,
  };
  const bars = cfg.bars.map((bar) => {
    const { radiusIn, surface } = barContact(bar, cfg.surfaces);
    return {
      id: bar.id,
      x: bar.xIn * INCH_TO_M,
      y: bar.yIn * INCH_TO_M,
      r: radiusIn * INCH_TO_M,
      mu: surface.mu,
      k: 1 / (1 / surface.stiffnessNPerM + 1 / cfg.piece.stiffnessNPerM),
      ratio: Math.max(bar.ratio, 1e-6),
      // sign of the bar's spin (counter-clockwise = +). See IntakeBar.passes.
      spin: bar.passes === "under" ? -1 : 1,
    };
  });
  const motorFreeRad = freeSpeedRadPerSec(motor) * cfg.rollerOutput;

  // state
  let x = cfg.pieceStartXIn * INCH_TO_M;
  let y = restHalfHeight;
  let vx = 0;
  let vy = 0;
  let w = 0;
  let angle = 0;
  let motorSpeedFrac = 1; // roller motor speed as a fraction of its commanded free speed
  let loadTorque = 0;

  const dt = 5e-5;
  const maxT = cfg.maxTimeS ?? 3;
  const frameEvery = 1 / 120;
  const frames: IntakeFrame[] = [];
  let nextFrame = 0;
  let peakLoad = 0;
  let minSpeed = 1;
  let peakBarForce = 0;
  const peakForceByBar: Record<string, number> = {};
  let firstBarTouchT: number | null = null;
  let lastProgressX = x;
  let lastProgressT = 0;
  let lastBarTouched: string | null = null;
  let outcome: IntakeOutcome | null = null;

  const kFloor = 1 / (1 / 50000 + 1 / cfg.piece.stiffnessNPerM);
  const kBumper = 1 / (1 / 8000 + 1 / cfg.piece.stiffnessNPerM);
  const vEps = 0.02; // m/s: smooths friction around zero slip so the integration stays stable

  for (let t = 0; t <= maxT; t += dt) {
    let fx = 0;
    let fy = -m * G;
    let torque = 0;
    let stepLoad = 0;
    const contacts: ContactForce[] = [];
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    // body frame <-> world helpers (box shape)
    const toLocal = (px: number, py: number) => ({ x: (px - x) * cosA + (py - y) * sinA, y: -(px - x) * sinA + (py - y) * cosA });
    const toWorld = (lx: number, ly: number) => ({ x: x + lx * cosA - ly * sinA, y: y + lx * sinA + ly * cosA });

    /**
     * One contact. (px, py) = the touching point on the piece, (nx, ny) = unit normal pushing INTO the piece,
     * depth = overlap. Spring + damper along n, friction (up to mu * N) along the surface.
     */
    const contact = (who: string, px: number, py: number, nx: number, ny: number, depth: number, k: number, mu: number, surfVx: number, surfVy: number): number => {
      const rx = px - x;
      const ry = py - y;
      // velocity of the piece's material at the contact point: v + w x r
      const pvx = vx - w * ry;
      const pvy = vy + w * rx;
      const c = 2 * 0.4 * Math.sqrt(k * m);
      const depthRate = -(pvx * nx + pvy * ny);
      const N = Math.max(0, k * depth + c * depthRate);
      if (N <= 0) return 0;
      const tx = -ny;
      const ty = nx;
      const vt = (pvx - surfVx) * tx + (pvy - surfVy) * ty;
      const Ft = -mu * N * Math.tanh(vt / vEps);
      const Fx = N * nx + Ft * tx;
      const Fy = N * ny + Ft * ty;
      fx += Fx;
      fy += Fy;
      torque += rx * Fy - ry * Fx;
      contacts.push({ with: who, xIn: px / INCH_TO_M, yIn: py / INCH_TO_M, fx: Fx, fy: Fy });
      return Ft;
    };

    const corners =
      shape.kind === "box"
        ? [
            toWorld(-shape.hx, -shape.hy),
            toWorld(shape.hx, -shape.hy),
            toWorld(shape.hx, shape.hy),
            toWorld(-shape.hx, shape.hy),
          ]
        : [];

    // carpet
    if (shape.kind === "circle") {
      if (y < shape.r) contact("floor", x, y - shape.r, 0, 1, shape.r - y, kFloor, cfg.piece.carpetMu, vFloor, 0);
    } else {
      for (const p of corners) if (p.y < 0) contact("floor", p.x, p.y, 0, 1, -p.y, kFloor, cfg.piece.carpetMu, vFloor, 0);
    }

    // bumper (axis-aligned box, fixed to the robot)
    if (shape.kind === "circle") {
      const qx = Math.min(Math.max(x, bumper.x0), bumper.x1);
      const qy = Math.min(Math.max(y, bumper.y0), bumper.y1);
      const dx = x - qx;
      const dy = y - qy;
      const d = Math.hypot(dx, dy);
      if (d < shape.r && d > 1e-9) contact("bumper", x - (dx / d) * shape.r, y - (dy / d) * shape.r, dx / d, dy / d, shape.r - d, kBumper, 0.4, 0, 0);
    } else {
      // piece corners poking into the bumper: push out the shortest way
      for (const p of corners) {
        if (p.x <= bumper.x0 || p.x >= bumper.x1 || p.y <= bumper.y0 || p.y >= bumper.y1) continue;
        const outs = [
          { d: p.x - bumper.x0, nx: -1, ny: 0 },
          { d: bumper.x1 - p.x, nx: 1, ny: 0 },
          { d: p.y - bumper.y0, nx: 0, ny: -1 },
          { d: bumper.y1 - p.y, nx: 0, ny: 1 },
        ].sort((u, v) => u.d - v.d)[0]!;
        contact("bumper", p.x, p.y, outs.nx, outs.ny, outs.d, kBumper, 0.4, 0, 0);
      }
      // bumper corners poking into the piece: push the piece off along its nearest face
      for (const [bx, by] of [
        [bumper.x0, bumper.y0],
        [bumper.x1, bumper.y0],
        [bumper.x1, bumper.y1],
        [bumper.x0, bumper.y1],
      ] as const) {
        const l = toLocal(bx, by);
        if (Math.abs(l.x) >= shape.hx || Math.abs(l.y) >= shape.hy) continue;
        const dxFace = shape.hx - Math.abs(l.x);
        const dyFace = shape.hy - Math.abs(l.y);
        // outward normal of the piece face nearest the corner; the push on the piece is the opposite way
        const ln = dxFace < dyFace ? { x: Math.sign(l.x) || 1, y: 0 } : { x: 0, y: Math.sign(l.y) || 1 };
        const nWorld = { x: -(ln.x * cosA - ln.y * sinA), y: -(ln.x * sinA + ln.y * cosA) };
        contact("bumper", bx, by, nWorld.x, nWorld.y, Math.min(dxFace, dyFace), kBumper, 0.4, 0, 0);
      }
    }

    // bars
    const barSpeed = motorFreeRad * motorSpeedFrac;
    for (const b of bars) {
      // closest point on the piece to the bar's center, and the normal from the bar into the piece
      let qx: number;
      let qy: number;
      let nx: number;
      let ny: number;
      let depth: number;
      if (shape.kind === "circle") {
        const dx = x - b.x;
        const dy = y - b.y;
        const d = Math.hypot(dx, dy);
        depth = shape.r + b.r - d;
        if (depth <= 0 || d < 1e-9) continue;
        nx = dx / d;
        ny = dy / d;
        qx = x - nx * shape.r;
        qy = y - ny * shape.r;
      } else {
        const l = toLocal(b.x, b.y);
        const cx = Math.min(Math.max(l.x, -shape.hx), shape.hx);
        const cy = Math.min(Math.max(l.y, -shape.hy), shape.hy);
        let lnx = cx - l.x;
        let lny = cy - l.y;
        let d = Math.hypot(lnx, lny);
        let lqx = cx;
        let lqy = cy;
        if (d < 1e-9) {
          // bar center inside the box: push out through the nearest face
          const dxFace = shape.hx - Math.abs(l.x);
          const dyFace = shape.hy - Math.abs(l.y);
          if (dxFace < dyFace) {
            lqx = Math.sign(l.x || 1) * shape.hx;
            lqy = l.y;
            lnx = -Math.sign(l.x || 1);
            lny = 0;
            d = -dxFace;
          } else {
            lqx = l.x;
            lqy = Math.sign(l.y || 1) * shape.hy;
            lnx = 0;
            lny = -Math.sign(l.y || 1);
            d = -dyFace;
          }
        } else {
          lnx /= d;
          lny /= d;
        }
        depth = b.r - d;
        if (depth <= 0) continue;
        const wq = toWorld(lqx, lqy);
        qx = wq.x;
        qy = wq.y;
        nx = lnx * cosA - lny * sinA;
        ny = lnx * sinA + lny * cosA;
      }
      const omega = (b.spin * barSpeed) / b.ratio;
      // bar surface velocity at the point facing the piece: omega x (r * n)
      const sx = -omega * b.r * ny;
      const sy = omega * b.r * nx;
      const before = contacts.length;
      const Ft = contact(b.id, qx, qy, nx, ny, depth, b.k, b.mu, sx, sy);
      if (contacts.length > before) {
        const c = contacts[contacts.length - 1]!;
        const push = Math.hypot(c.fx, c.fy);
        peakBarForce = Math.max(peakBarForce, push);
        peakForceByBar[b.id] = Math.max(peakForceByBar[b.id] ?? 0, push);
        lastBarTouched = b.id;
        if (firstBarTouchT === null) firstBarTouchT = t;
      }
      // the friction force on the piece pushes back on the bar's surface; reflect it through the gearing
      stepLoad += Math.abs(Ft * b.r) / b.ratio;
    }

    // roller motor: quasi-static on its torque-speed line (speed drops as load rises)
    loadTorque += (stepLoad - loadTorque) * Math.min(1, dt / 0.01);
    const stallAtOutput = motor.stallTorqueNm * Math.max(cfg.rollerOutput, 1e-6);
    motorSpeedFrac = Math.max(0, 1 - loadTorque / stallAtOutput);
    peakLoad = Math.max(peakLoad, loadTorque / motor.stallTorqueNm);
    if (cfg.rollerOutput > 0) minSpeed = Math.min(minSpeed, motorSpeedFrac);

    // integrate (semi-implicit Euler)
    vx += (fx / m) * dt;
    vy += (fy / m) * dt;
    w += (torque / I) * dt;
    x += vx * dt;
    y += vy * dt;
    angle += w * dt;

    if (t >= nextFrame) {
      frames.push({ t, xIn: x / INCH_TO_M, yIn: y / INCH_TO_M, angleRad: angle, rollerRpmFraction: motorSpeedFrac, contacts });
      nextFrame += frameEvery;
    }

    // outcome checks
    if (x < -rp * 0.2 && y > bumper.y0 + restHalfHeight * 0.5) {
      outcome = { kind: "in", timeS: t };
      break;
    }
    if (x < bumper.x1 + (shape.kind === "circle" ? shape.r : shape.hx) + 0.02 && y < bumper.y1 && firstBarTouchT === null && t > 0.2 && Math.abs(vx) < 0.05) {
      outcome = { kind: "missed", timeS: t };
      break;
    }
    if (y > 1.5 || x > cfg.pieceStartXIn * INCH_TO_M + 0.6) {
      outcome = { kind: "thrown", timeS: t };
      break;
    }
    // moving half an inch toward the robot counts as progress
    if (x < lastProgressX - 0.0127) {
      lastProgressX = x;
      lastProgressT = t;
    }
    if (firstBarTouchT !== null && t - Math.max(lastProgressT, firstBarTouchT) > 0.75) {
      outcome = { kind: "stuck", timeS: t, nearBarId: lastBarTouched };
      break;
    }
  }

  frames.push({ t: (frames[frames.length - 1]?.t ?? -frameEvery) + frameEvery, xIn: x / INCH_TO_M, yIn: y / INCH_TO_M, angleRad: angle, rollerRpmFraction: motorSpeedFrac, contacts: [] });
  return {
    frames,
    outcome: outcome ?? { kind: "timeout", timeS: maxT },
    peakMotorLoadFraction: peakLoad,
    minRollerSpeedFraction: minSpeed,
    peakBarForceN: peakBarForce,
    peakForceByBarN: peakForceByBar,
  };
}
