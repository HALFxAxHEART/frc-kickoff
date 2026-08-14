export interface Point {
  x: number;
  y: number;
}

export interface FourBarConfig {
  /** Fixed distance between the two frame pivots. */
  groundLenM: number;
  /** Orientation of the fixed frame link — 0 = horizontal, matches the arm's angle convention. */
  groundAngleDeg: number;
  /** The motor-driven link, pivoting at the origin. */
  inputLenM: number;
  inputAngleDeg: number;
  /** Connects the input link's tip to the output link's tip. */
  couplerLenM: number;
  /** Pivots at the second frame pivot; usually what carries the end effector. */
  outputLenM: number;
}

export interface FourBarSolution {
  feasible: boolean;
  pivotA: Point;
  pivotB: Point;
  jointC: Point;
  jointD: Point;
  outputAngleDeg: number;
  couplerAngleDeg: number;
  warning?: string;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Solves a general 4-bar linkage's position kinematics via 2-circle intersection: pivot A is
 * the origin (input link's frame pivot), pivot B sits `groundLenM` away at `groundAngleDeg`
 * (output link's frame pivot). Given the input link's current angle, joint C (its tip) is
 * fixed; joint D (the output link's tip) must be `couplerLenM` from C and `outputLenM` from B
 * — the intersection of those two circles. Picks one intersection branch consistently (the
 * "+" branch); real hardware picks whichever branch it's actually built/assembled as, so this
 * won't always match a specific real linkage's configuration, but it's geometrically valid and
 * consistent across a sweep.
 */
export function solveFourBar(config: FourBarConfig): FourBarSolution {
  const A: Point = { x: 0, y: 0 };
  const B: Point = {
    x: config.groundLenM * Math.cos(config.groundAngleDeg * DEG_TO_RAD),
    y: config.groundLenM * Math.sin(config.groundAngleDeg * DEG_TO_RAD),
  };
  const C: Point = {
    x: A.x + config.inputLenM * Math.cos(config.inputAngleDeg * DEG_TO_RAD),
    y: A.y + config.inputLenM * Math.sin(config.inputAngleDeg * DEG_TO_RAD),
  };

  const dx = B.x - C.x;
  const dy = B.y - C.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const r1 = config.couplerLenM;
  const r2 = config.outputLenM;

  if (d === 0 || d > r1 + r2 || d < Math.abs(r1 - r2)) {
    return {
      feasible: false,
      pivotA: A,
      pivotB: B,
      jointC: C,
      jointD: C,
      outputAngleDeg: 0,
      couplerAngleDeg: 0,
      warning: "This link combination can't assemble at this input angle — the coupler and output links can't reach each other here. Adjust lengths or pivot spacing.",
    };
  }

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const px = C.x + (a * dx) / d;
  const py = C.y + (a * dy) / d;
  const rx = -dy / d;
  const ry = dx / d;
  const D: Point = { x: px + h * rx, y: py + h * ry };

  return {
    feasible: true,
    pivotA: A,
    pivotB: B,
    jointC: C,
    jointD: D,
    outputAngleDeg: Math.atan2(D.y - B.y, D.x - B.x) * RAD_TO_DEG,
    couplerAngleDeg: Math.atan2(D.y - C.y, D.x - C.x) * RAD_TO_DEG,
  };
}
