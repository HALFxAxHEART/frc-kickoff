import { getMotor, motorTorqueNm, estimateCurrentA } from "./motors";
import type { SimTracePoint } from "./common";

export interface FlywheelConfig {
  motorId: string;
  numMotors: number;
  /** Motor speed / flywheel speed. */
  gearRatio: number;
  /** Flywheel modeled as a solid disc: moment of inertia = 0.5 * mass * radius². */
  flywheelMassKg: number;
  flywheelRadiusM: number;
  targetRPM: number;
  /** Expected RPM drop when a piece is shot — used to estimate recovery time. 0 to skip. */
  speedDropRPM: number;
  voltage: number;
  efficiency: number;
}

export interface FlywheelSimResult {
  spinUpTimeSeconds: number;
  recoveryTimeSeconds: number | null;
  peakCurrentA: number;
  surfaceSpeedMPerSec: number;
  /** position = flywheel RPM, velocity = RPM/s. */
  trace: SimTracePoint[];
}

const MAX_SIM_SECONDS = 10;
const DT = 0.002;
const RPM_TOLERANCE = 5;

function timeToReachRPM(config: FlywheelConfig, startRPM: number, targetRPM: number, collectTrace: boolean): { seconds: number; trace: SimTracePoint[]; peakCurrentA: number } {
  const motor = getMotor(config.motorId);
  const I = 0.5 * config.flywheelMassKg * config.flywheelRadiusM ** 2;
  const targetRad = (targetRPM * 2 * Math.PI) / 60;

  let omega = (startRPM * 2 * Math.PI) / 60;
  let t = 0;
  let peakCurrent = 0;
  const trace: SimTracePoint[] = collectTrace ? [{ tSeconds: 0, position: startRPM, velocity: 0 }] : [];

  while (t < MAX_SIM_SECONDS) {
    const motorSpeed = omega * config.gearRatio;
    const rawTorque = motorTorqueNm(motor, motorSpeed, config.voltage, config.numMotors);
    const driveTorque = Math.max(0, rawTorque) * config.gearRatio * config.efficiency;
    const angularAccel = driveTorque / I;

    const prevOmega = omega;
    omega += angularAccel * DT;
    t += DT;

    const currentPerMotor = estimateCurrentA(motor, Math.max(0, rawTorque), config.voltage);
    peakCurrent = Math.max(peakCurrent, currentPerMotor);

    if (collectTrace) {
      trace.push({ tSeconds: t, position: (omega * 60) / (2 * Math.PI), velocity: ((omega - prevOmega) * 60) / (2 * Math.PI) / DT });
    }

    if (Math.abs(omega - targetRad) < (RPM_TOLERANCE * 2 * Math.PI) / 60) break;
    if (Math.abs(angularAccel) < 1e-6 && t > 0.5) break; // stalled before reaching target
  }

  return { seconds: t, trace, peakCurrentA: peakCurrent };
}

export function simulateFlywheel(config: FlywheelConfig): FlywheelSimResult {
  const spinUp = timeToReachRPM(config, 0, config.targetRPM, true);
  const recovery =
    config.speedDropRPM > 0 ? timeToReachRPM(config, config.targetRPM - config.speedDropRPM, config.targetRPM, false) : null;

  const surfaceSpeedMPerSec = ((config.targetRPM * 2 * Math.PI) / 60) * config.flywheelRadiusM;

  return {
    spinUpTimeSeconds: spinUp.seconds,
    recoveryTimeSeconds: recovery ? recovery.seconds : null,
    peakCurrentA: spinUp.peakCurrentA,
    surfaceSpeedMPerSec,
    trace: spinUp.trace,
  };
}
