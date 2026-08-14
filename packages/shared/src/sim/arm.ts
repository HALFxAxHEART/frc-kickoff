import { getMotor, motorTorqueNm, estimateCurrentA } from "./motors";
import { DEG_TO_RAD, RAD_TO_DEG } from "./units";
import type { SimTracePoint } from "./common";

export interface ArmConfig {
  motorId: string;
  numMotors: number;
  /** Motor speed / arm speed. */
  gearRatio: number;
  armLengthM: number;
  /** Uniform-rod arm mass — moment of inertia is derived as m*L²/3. */
  armMassKg: number;
  /** Optional point load (e.g. a held game piece) at the tip. */
  loadMassKg: number;
  /** 0 = horizontal, 90 = straight up, -90 = straight down. */
  startAngleDeg: number;
  endAngleDeg: number;
  voltage: number;
  /** Gearbox/belt efficiency, 0-1. */
  efficiency: number;
}

export interface ArmSimResult {
  reachesTarget: boolean;
  timeSeconds: number;
  maxVelocityDegPerSec: number;
  peakCurrentA: number;
  /** Positive = motor can hold this position against gravity at rest; negative = it can't. */
  holdingTorqueMarginNm: number;
  canHoldAtEnd: boolean;
  /** position = angle in degrees, velocity = deg/s. */
  trace: SimTracePoint[];
}

const GRAVITY = 9.80665;
const MAX_SIM_SECONDS = 15;
const DT = 0.005;
const ANGLE_TOLERANCE_RAD = 0.5 * DEG_TO_RAD;

function momentOfInertia(config: ArmConfig): number {
  const rodTerm = (config.armMassKg * config.armLengthM ** 2) / 3;
  const loadTerm = config.loadMassKg * config.armLengthM ** 2;
  return rodTerm + loadTerm;
}

function gravityTorqueNm(config: ArmConfig, angleRad: number): number {
  const armCgTorque = config.armMassKg * GRAVITY * (config.armLengthM / 2) * Math.cos(angleRad);
  const loadTorque = config.loadMassKg * GRAVITY * config.armLengthM * Math.cos(angleRad);
  return armCgTorque + loadTorque; // positive = pulling toward angle 0 from above, i.e. torque tending to decrease angle
}

export function simulateArm(config: ArmConfig): ArmSimResult {
  const motor = getMotor(config.motorId);
  const I = momentOfInertia(config);
  const startRad = config.startAngleDeg * DEG_TO_RAD;
  const endRad = config.endAngleDeg * DEG_TO_RAD;
  const direction = Math.sign(endRad - startRad) || 1;
  const commandedVoltage = direction * Math.abs(config.voltage);

  let angle = startRad;
  let velocity = 0; // rad/s
  let t = 0;
  let maxVelocity = 0;
  let peakCurrent = 0;
  const trace: SimTracePoint[] = [{ tSeconds: 0, position: config.startAngleDeg, velocity: 0 }];
  let reachesTarget = false;

  while (t < MAX_SIM_SECONDS) {
    const motorSpeed = velocity * config.gearRatio;
    const rawTorque = motorTorqueNm(motor, motorSpeed, commandedVoltage, config.numMotors);
    const driveTorqueAtArm = Math.max(0, rawTorque) * config.gearRatio * config.efficiency * direction;
    const gravity = gravityTorqueNm(config, angle);
    const netTorque = driveTorqueAtArm - gravity;
    const angularAccel = netTorque / I;

    velocity += angularAccel * DT;
    angle += velocity * DT;
    t += DT;

    maxVelocity = Math.max(maxVelocity, Math.abs(velocity));
    const currentPerMotor = estimateCurrentA(motor, Math.max(0, rawTorque), commandedVoltage);
    peakCurrent = Math.max(peakCurrent, currentPerMotor);

    trace.push({ tSeconds: t, position: angle * RAD_TO_DEG, velocity: velocity * RAD_TO_DEG });

    if (Math.abs(angle - endRad) < ANGLE_TOLERANCE_RAD) {
      reachesTarget = true;
      break;
    }
    // Stalled against gravity — not going anywhere further.
    if (Math.abs(velocity) < 1e-4 && Math.abs(netTorque) < 1e-6 && t > 0.5) break;
  }

  const holdingCapacity = Math.max(0, motorTorqueNm(motor, 0, config.voltage, config.numMotors)) * config.gearRatio * config.efficiency;
  const holdingLoad = gravityTorqueNm(config, endRad);
  const holdingTorqueMarginNm = holdingCapacity - holdingLoad;

  return {
    reachesTarget,
    timeSeconds: t,
    maxVelocityDegPerSec: maxVelocity * RAD_TO_DEG,
    peakCurrentA: peakCurrent,
    holdingTorqueMarginNm,
    canHoldAtEnd: holdingTorqueMarginNm >= 0,
    trace,
  };
}
