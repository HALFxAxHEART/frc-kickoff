import { getMotor, motorTorqueNm } from "./motors";
import { INCH_TO_M, LB_TO_KG } from "./units";
import { barContact, type IntakeBar, type RollerSurfaceSpec } from "./roller-intake";

/**
 * The 4-bar linkage that carries an intake's rollers, in the same robot-frame inches as the Intake Lab
 * (x = forward of the frame perimeter, y = up from the carpet).
 *
 * The linkage is described by its DEPLOYED pose: frame pivots A (driver) and B (follower), and the
 * coupler joints C (end of the driver link) and D (end of the follower link). Bars marked "on the arm"
 * are bolted to the coupler, so their deployed positions (the ones the pickup simulation uses) never
 * change when you move the joints: only how the intake gets there does.
 *
 * Driver angle = the angle of A→C, degrees counter-clockwise from pointing straight forward.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface IntakeLinkage {
  a: Pt;
  b: Pt;
  c: Pt;
  d: Pt;
  /** Driver-link angle when stowed (degrees, CCW from forward) */
  stowedDriverDeg: number;
  /** ids of the bars bolted to the coupler (they move with the intake) */
  barsOnArm: string[];
}

export interface IntakeArmDrive {
  motorId: string;
  numMotors: number;
  /** motor turns per driver-link turn */
  ratio: number;
  statorLimitA: number;
  efficiency: number;
  /** coupler plates + roller motor + hardware, NOT counting the bars */
  plateMassLb: number;
  /** each bar on the arm: tube, hex shaft, bearings, pulleys */
  barMassLb: number;
  /** each link (both sides together) */
  linkMassLb: number;
}

export interface ArmPose {
  feasible: boolean;
  driverDeg: number;
  a: Pt;
  b: Pt;
  c: Pt;
  d: Pt;
  bars: { id: string; x: number; y: number; r: number }[];
  /** angle between coupler and follower, degrees. Near 0 or 180 = toggle / dead spot. */
  transmissionDeg: number;
}

const DEG = Math.PI / 180;
const dist = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y);
const angleOf = (from: Pt, to: Pt) => Math.atan2(to.y - from.y, to.x - from.x) / DEG;

export function linkLengths(l: IntakeLinkage) {
  return { ground: dist(l.a, l.b), driver: dist(l.a, l.c), follower: dist(l.b, l.d), coupler: dist(l.c, l.d) };
}

export function deployedDriverDeg(l: IntakeLinkage): number {
  return angleOf(l.a, l.c);
}

/** Bars bolted to the coupler, stored in coupler coordinates (origin C, x axis toward D). */
function couplerLocal(l: IntakeLinkage, bars: IntakeBar[], surfaces?: RollerSurfaceSpec[]) {
  const ux = (l.d.x - l.c.x) / Math.max(dist(l.c, l.d), 1e-9);
  const uy = (l.d.y - l.c.y) / Math.max(dist(l.c, l.d), 1e-9);
  return bars
    .filter((b) => l.barsOnArm.includes(b.id))
    .map((b) => {
      const rx = b.xIn - l.c.x;
      const ry = b.yIn - l.c.y;
      return { id: b.id, u: rx * ux + ry * uy, v: -rx * uy + ry * ux, r: barContact(b, surfaces).radiusIn };
    });
}

/**
 * Solves the linkage at a driver angle. D is the intersection of the follower circle (around B) and the
 * coupler circle (around C); of the two answers we take the one nearest `nearD` so the linkage never
 * "flips" to its other assembly mode partway through a move.
 */
function solve(l: IntakeLinkage, local: ReturnType<typeof couplerLocal>, driverDeg: number, nearD: Pt): ArmPose {
  const L = linkLengths(l);
  const c: Pt = { x: l.a.x + L.driver * Math.cos(driverDeg * DEG), y: l.a.y + L.driver * Math.sin(driverDeg * DEG) };
  const dx = c.x - l.b.x;
  const dy = c.y - l.b.y;
  const dd = Math.hypot(dx, dy);
  const r1 = L.follower;
  const r2 = L.coupler;
  const empty: ArmPose = { feasible: false, driverDeg, a: l.a, b: l.b, c, d: c, bars: [], transmissionDeg: 0 };
  if (dd < 1e-9 || dd > r1 + r2 || dd < Math.abs(r1 - r2)) return empty;
  const along = (r1 * r1 - r2 * r2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, r1 * r1 - along * along));
  const mx = l.b.x + (along * dx) / dd;
  const my = l.b.y + (along * dy) / dd;
  const d1: Pt = { x: mx - (h * dy) / dd, y: my + (h * dx) / dd };
  const d2: Pt = { x: mx + (h * dy) / dd, y: my - (h * dx) / dd };
  const d = dist(d1, nearD) <= dist(d2, nearD) ? d1 : d2;
  const ux = (d.x - c.x) / Math.max(r2, 1e-9);
  const uy = (d.y - c.y) / Math.max(r2, 1e-9);
  const bars = local.map((p) => ({ id: p.id, x: c.x + p.u * ux - p.v * uy, y: c.y + p.u * uy + p.v * ux, r: p.r }));
  // transmission angle: between the coupler (D→C) and the follower (D→B)
  const v1 = { x: c.x - d.x, y: c.y - d.y };
  const v2 = { x: l.b.x - d.x, y: l.b.y - d.y };
  const cos = (v1.x * v2.x + v1.y * v2.y) / Math.max(Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y), 1e-9);
  return { feasible: true, driverDeg, a: l.a, b: l.b, c, d, bars, transmissionDeg: Math.acos(Math.max(-1, Math.min(1, cos))) / DEG };
}

export interface ArmSample {
  driverDeg: number;
  pose: ArmPose;
  /** Torque gravity puts on the driver link (N·m). Positive = pushes toward STOWED. */
  gravityTorqueNm: number;
  /** Current the motor(s) need to hold still here (A per motor) */
  holdCurrentA: number;
  /** Effective inertia seen at the driver link, kg·m² */
  inertiaKgM2: number;
}

export interface ArmAnalysis {
  feasible: boolean;
  lengths: ReturnType<typeof linkLengths>;
  /** Grashof: shortest + longest <= sum of the other two means at least one link can spin all the way round */
  grashof: boolean;
  deployedDeg: number;
  stowedDeg: number;
  samples: ArmSample[];
  /** Paths each arm bar's center follows from stowed to deployed */
  paths: { id: string; points: Pt[] }[];
  minTransmissionDeg: number;
  worstHold: { driverDeg: number; torqueNm: number; currentA: number };
  /** How far the stowed intake sticks out past the frame perimeter (in). <= 0 is inside. */
  stowedOverhangIn: number;
  /** Furthest any part of the arm reaches past the frame perimeter while deployed (in) */
  deployedReachIn: number;
  /** Bars that pass through the bumper on the way */
  bumperHits: string[];
  /** A push straight back on the front bar: does the intake fold toward stowed (good) or jam down? */
  foldsUpWhenHit: boolean;
  /** Generalised torque from a 100 N push back on the front bar, N·m on the driver link (positive = toward stowed) */
  hitTorqueNm: number;
}

const G = 9.81;

/** Sweeps the linkage from stowed to deployed and works out every number the Intake Lab shows. */
export function analyzeArm(
  l: IntakeLinkage,
  drive: IntakeArmDrive,
  bars: IntakeBar[],
  bumper: { depthIn: number; bottomIn: number; topIn: number },
  surfaces?: RollerSurfaceSpec[],
  steps = 240,
): ArmAnalysis {
  const motor = getMotor(drive.motorId);
  const kt = motor.stallTorqueNm / motor.stallCurrentA;
  const local = couplerLocal(l, bars, surfaces);
  const deployedDeg = deployedDriverDeg(l);
  // take the short way round from stowed to deployed
  let delta = deployedDeg - l.stowedDriverDeg;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  const stowedDeg = deployedDeg - delta;
  const towardStow = Math.sign(stowedDeg - deployedDeg) || 1;

  // Solve from DEPLOYED back toward stowed so the assembly mode always matches the drawn pose.
  const poses: ArmPose[] = [];
  let near = l.d;
  for (let i = 0; i <= steps; i++) {
    const deg = deployedDeg + ((stowedDeg - deployedDeg) * i) / steps;
    const pose = solve(l, local, deg, near);
    poses.push(pose);
    if (pose.feasible) near = pose.d;
  }
  poses.reverse(); // index 0 = stowed, last = deployed
  const feasible = poses.every((p) => p.feasible);

  const mPlate = drive.plateMassLb * LB_TO_KG;
  const mBar = drive.barMassLb * LB_TO_KG;
  const mLink = drive.linkMassLb * LB_TO_KG;
  const lengthsIn = linkLengths(l);
  // potential energy and mass-point positions (meters) for a pose
  const massPoints = (p: ArmPose) => {
    const pts: { m: number; x: number; y: number }[] = [];
    const n = p.bars.length;
    const cx = (p.c.x + p.d.x + p.bars.reduce((s, b) => s + b.x, 0)) / (2 + n);
    const cy = (p.c.y + p.d.y + p.bars.reduce((s, b) => s + b.y, 0)) / (2 + n);
    pts.push({ m: mPlate, x: cx, y: cy });
    for (const b of p.bars) pts.push({ m: mBar, x: b.x, y: b.y });
    pts.push({ m: mLink, x: (p.a.x + p.c.x) / 2, y: (p.a.y + p.c.y) / 2 });
    pts.push({ m: mLink, x: (p.b.x + p.d.x) / 2, y: (p.b.y + p.d.y) / 2 });
    return pts.map((q) => ({ m: q.m, x: q.x * INCH_TO_M, y: q.y * INCH_TO_M }));
  };
  const followerAngle = (p: ArmPose) => Math.atan2(p.d.y - p.b.y, p.d.x - p.b.x);

  const samples: ArmSample[] = poses.map((pose, i) => {
    const j0 = Math.max(0, i - 1);
    const j1 = Math.min(poses.length - 1, i + 1);
    const p0 = poses[j0]!;
    const p1 = poses[j1]!;
    const dTheta = (p1.driverDeg - p0.driverDeg) * DEG;
    if (!pose.feasible || !p0.feasible || !p1.feasible || dTheta === 0) {
      return { driverDeg: pose.driverDeg, pose, gravityTorqueNm: 0, holdCurrentA: 0, inertiaKgM2: 0 };
    }
    const m0 = massPoints(p0);
    const m1 = massPoints(p1);
    let dPE = 0;
    let inertia = 0;
    for (let k = 0; k < m0.length; k++) {
      const a = m0[k]!;
      const b = m1[k]!;
      dPE += a.m * G * (b.y - a.y);
      inertia += a.m * (((b.x - a.x) / dTheta) ** 2 + ((b.y - a.y) / dTheta) ** 2);
    }
    // rods spinning about their own middles: m L^2 / 12 times their spin rate squared
    const wf = (followerAngle(p1) - followerAngle(p0)) / dTheta;
    inertia += (mLink * (lengthsIn.driver * INCH_TO_M) ** 2) / 12 + ((mLink * (lengthsIn.follower * INCH_TO_M) ** 2) / 12) * wf * wf;
    // gravity torque = -dPE/dθ, expressed as "toward stowed" positive
    const torqueAlongTheta = -dPE / dTheta;
    const gravityTorqueNm = torqueAlongTheta * towardStow;
    const holdCurrentA = Math.abs(torqueAlongTheta) / Math.max(drive.ratio * drive.efficiency * drive.numMotors * kt, 1e-9);
    return { driverDeg: pose.driverDeg, pose, gravityTorqueNm, holdCurrentA, inertiaKgM2: inertia };
  });

  const paths = local.map((b) => ({ id: b.id, points: poses.filter((p) => p.feasible).map((p) => {
    const bb = p.bars.find((x) => x.id === b.id)!;
    return { x: bb.x, y: bb.y };
  }) }));

  const worst = samples.reduce((w, s) => (s.holdCurrentA > w.holdCurrentA ? s : w), samples[0]!);
  const stowed = poses[0]!;
  const deployedPose = poses[poses.length - 1]!;
  const stowedOverhangIn = Math.max(...stowed.bars.map((b) => b.x + b.r), stowed.c.x, stowed.d.x, -999);
  const deployedReachIn = Math.max(...deployedPose.bars.map((b) => b.x + b.r), deployedPose.c.x, deployedPose.d.x);

  const bumperHits = new Set<string>();
  for (const p of poses) {
    for (const b of p.bars) {
      const qx = Math.min(Math.max(b.x, 0), bumper.depthIn);
      const qy = Math.min(Math.max(b.y, bumper.bottomIn), bumper.topIn);
      if (Math.hypot(b.x - qx, b.y - qy) < b.r - 0.05) bumperHits.add(b.id);
    }
  }

  // Fold-up check by virtual work: push the front-most bar straight back (-x) with 100 N and see which way the driver turns.
  let hitTorqueNm = 0;
  const front = [...deployedPose.bars].sort((p, q) => q.x + q.r - (p.x + p.r))[0];
  const before = poses[poses.length - 2];
  if (front && before && before.feasible && deployedPose.feasible) {
    const fb = before.bars.find((b) => b.id === front.id)!;
    const dTheta = (deployedPose.driverDeg - before.driverDeg) * DEG;
    const dxdTheta = ((front.x - fb.x) * INCH_TO_M) / dTheta;
    hitTorqueNm = -100 * dxdTheta * towardStow;
  }

  const { ground, driver, follower, coupler } = lengthsIn;
  const sorted = [ground, driver, follower, coupler].sort((p, q) => p - q);
  return {
    feasible,
    lengths: lengthsIn,
    grashof: sorted[0]! + sorted[3]! <= sorted[1]! + sorted[2]!,
    deployedDeg,
    stowedDeg,
    samples,
    paths,
    minTransmissionDeg: Math.min(...poses.filter((p) => p.feasible).map((p) => Math.min(p.transmissionDeg, 180 - p.transmissionDeg))),
    worstHold: { driverDeg: worst.driverDeg, torqueNm: Math.abs(worst.gravityTorqueNm), currentA: worst.holdCurrentA },
    stowedOverhangIn,
    deployedReachIn,
    bumperHits: [...bumperHits],
    foldsUpWhenHit: hitTorqueNm > 0,
    hitTorqueNm,
  };
}

export interface ArmMoveFrame {
  t: number;
  pose: ArmPose;
  currentA: number;
  speedDegPerSec: number;
}

export interface ArmMoveResult {
  reached: boolean;
  timeS: number;
  peakCurrentA: number;
  /** How fast the intake hits the hard stop at the end (deg/s of the driver link) */
  impactDegPerSec: number;
  frames: ArmMoveFrame[];
}

/**
 * Full-power move from one end to the other (like a simple "run the motor until it hits the stop" command),
 * with the stator current limit. Uses the sweep's inertia and gravity at every angle:
 *   I(θ)·θ'' + ½·I'(θ)·θ'² = motor torque − gravity torque
 */
export function simulateArmMove(analysis: ArmAnalysis, drive: IntakeArmDrive, direction: "deploy" | "stow"): ArmMoveResult {
  const motor = getMotor(drive.motorId);
  const kt = motor.stallTorqueNm / motor.stallCurrentA;
  const s = analysis.samples;
  const n = s.length;
  if (!analysis.feasible || n < 3) return { reached: false, timeS: 0, peakCurrentA: 0, impactDegPerSec: 0, frames: [] };
  // u = 0 at stowed, 1 at deployed; θ in radians measured along the move
  const span = (analysis.deployedDeg - analysis.stowedDeg) * DEG;
  const totalRad = Math.abs(span);
  const sampleAt = (u: number) => {
    const f = Math.min(Math.max(u, 0), 1) * (n - 1);
    const i = Math.min(Math.floor(f), n - 2);
    const w = f - i;
    const p = s[i]!;
    const q = s[i + 1]!;
    return { inertia: p.inertiaKgM2 * (1 - w) + q.inertiaKgM2 * w, gravityTowardStow: p.gravityTorqueNm * (1 - w) + q.gravityTorqueNm * w, index: Math.round(f) };
  };
  const goingDeploy = direction === "deploy";
  let u = goingDeploy ? 0 : 1;
  let w = 0; // rad/s along the move direction (always >= 0 means progressing)
  const dt = 1e-4;
  const frames: ArmMoveFrame[] = [];
  let peakI = 0;
  let nextFrame = 0;
  const maxT = 5;
  const torqueCap = kt * drive.statorLimitA * drive.numMotors;
  for (let t = 0; t <= maxT; t += dt) {
    const here = sampleAt(u);
    const ahead = sampleAt(u + (goingDeploy ? 0.004 : -0.004));
    const dIdTheta = (ahead.inertia - here.inertia) / (0.004 * totalRad);
    const motorRad = w * drive.ratio;
    let motorTorque = motorTorqueNm(motor, motorRad, 12, drive.numMotors);
    motorTorque = Math.max(-torqueCap, Math.min(torqueCap, motorTorque));
    const current = Math.abs(motorTorque) / (kt * drive.numMotors);
    peakI = Math.max(peakI, current);
    // gravity along the move: helps when it pulls the same way we're going
    const gravityAlong = goingDeploy ? -here.gravityTowardStow : here.gravityTowardStow;
    const net = motorTorque * drive.ratio * drive.efficiency + gravityAlong - 0.5 * dIdTheta * w * w;
    const alpha = net / Math.max(here.inertia, 1e-6);
    w = Math.max(0, w + alpha * dt);
    u += ((goingDeploy ? 1 : -1) * w * dt) / totalRad;
    if (t >= nextFrame) {
      frames.push({ t, pose: s[here.index]!.pose, currentA: current, speedDegPerSec: w / DEG });
      nextFrame += 1 / 120;
    }
    if ((goingDeploy && u >= 1) || (!goingDeploy && u <= 0)) {
      const end = s[goingDeploy ? n - 1 : 0]!;
      frames.push({ t, pose: end.pose, currentA: current, speedDegPerSec: w / DEG });
      return { reached: true, timeS: t, peakCurrentA: peakI, impactDegPerSec: w / DEG, frames };
    }
  }
  return { reached: false, timeS: maxT, peakCurrentA: peakI, impactDegPerSec: 0, frames };
}
