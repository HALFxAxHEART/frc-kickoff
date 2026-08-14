import { getMotor, motorTorqueNm, estimateCurrentA } from "./motors";
import type { SimTracePoint } from "./common";

export interface LinearConfig {
  motorId: string;
  numMotors: number;
  /** Motor speed / spool speed. */
  gearRatio: number;
  spoolRadiusM: number;
  /** Carriage speed = spool surface speed × this (cascade/continuous rigging multiplier). 1 = direct. */
  riggingMultiplier: number;
  carriageMassKg: number;
  travelM: number;
  /** 0 = vertical lift (full gravity), 90 = horizontal (no gravity component). */
  angleFromVerticalDeg: number;
  voltage: number;
  /** Gearbox/belt/pulley efficiency, 0-1. */
  efficiency: number;
}

export interface LinearSimResult {
  reachesTarget: boolean;
  timeSeconds: number;
  maxVelocityMPerSec: number;
  peakCurrentA: number;
  /** Positive = motor(s) can statically hold this load against gravity; negative = it can't (needs a brake/ratchet). */
  holdingForceMarginN: number;
  canHoldStatically: boolean;
  /** position = meters traveled, velocity = m/s. */
  trace: SimTracePoint[];
}

const GRAVITY = 9.80665;
const MAX_SIM_SECONDS = 15;
const DT = 0.005;
const POSITION_TOLERANCE_M = 0.001;

export function simulateLinear(config: LinearConfig): LinearSimResult {
  const motor = getMotor(config.motorId);
  const k = config.gearRatio / (config.spoolRadiusM * config.riggingMultiplier); // motor rad/s per carriage m/s
  const gravityForce = config.carriageMassKg * GRAVITY * Math.cos((config.angleFromVerticalDeg * Math.PI) / 180);

  let position = 0;
  let velocity = 0;
  let t = 0;
  let maxVelocity = 0;
  let peakCurrent = 0;
  const trace: SimTracePoint[] = [{ tSeconds: 0, position: 0, velocity: 0 }];
  let reachesTarget = false;

  while (t < MAX_SIM_SECONDS) {
    const motorAngularVel = velocity * k;
    const rawTorque = motorTorqueNm(motor, motorAngularVel, config.voltage, config.numMotors);
    const driveForce = Math.max(0, rawTorque) * k * config.efficiency;
    const netForce = driveForce - gravityForce;
    const accel = netForce / config.carriageMassKg;

    velocity += accel * DT;
    position += velocity * DT;
    t += DT;

    maxVelocity = Math.max(maxVelocity, velocity);
    const currentPerMotor = estimateCurrentA(motor, Math.max(0, rawTorque), config.voltage);
    peakCurrent = Math.max(peakCurrent, currentPerMotor);

    trace.push({ tSeconds: t, position, velocity });

    if (position >= config.travelM - POSITION_TOLERANCE_M) {
      reachesTarget = true;
      break;
    }
    if (Math.abs(velocity) < 1e-5 && netForce < 1e-6 && t > 0.5) break;
  }

  const holdingCapacity = Math.max(0, motorTorqueNm(motor, 0, config.voltage, config.numMotors)) * k * config.efficiency;
  const holdingForceMarginN = holdingCapacity - gravityForce;

  return {
    reachesTarget,
    timeSeconds: t,
    maxVelocityMPerSec: maxVelocity,
    peakCurrentA: peakCurrent,
    holdingForceMarginN,
    canHoldStatically: holdingForceMarginN >= 0,
    trace,
  };
}
