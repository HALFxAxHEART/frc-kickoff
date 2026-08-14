/** Nominal 12V DC motor specs. Verified 2026-08-14 against vendor datasheets and WPILib's DCMotor dataset
 *  (the same dataset reca.lc and the JVN calculator use) — see the Simulate page's source note for caveats. */
export interface MotorSpec {
  id: string;
  label: string;
  freeSpeedRPM: number;
  stallTorqueNm: number;
  stallCurrentA: number;
  freeCurrentA: number;
}

export const MOTOR_SPECS: MotorSpec[] = [
  { id: "kraken-x60", label: "Kraken X60", freeSpeedRPM: 6000, stallTorqueNm: 7.09, stallCurrentA: 366, freeCurrentA: 2 },
  { id: "kraken-x60-foc", label: "Kraken X60 (FOC)", freeSpeedRPM: 5800, stallTorqueNm: 9.37, stallCurrentA: 483, freeCurrentA: 2 },
  { id: "falcon-500", label: "Falcon 500", freeSpeedRPM: 6380, stallTorqueNm: 4.69, stallCurrentA: 257, freeCurrentA: 1.5 },
  { id: "neo", label: "NEO", freeSpeedRPM: 5676, stallTorqueNm: 2.6, stallCurrentA: 105, freeCurrentA: 1.8 },
  { id: "neo-vortex", label: "NEO Vortex", freeSpeedRPM: 6784, stallTorqueNm: 3.6, stallCurrentA: 211, freeCurrentA: 3.6 },
  { id: "neo-550", label: "NEO 550", freeSpeedRPM: 11000, stallTorqueNm: 0.97, stallCurrentA: 100, freeCurrentA: 1.4 },
  { id: "cim", label: "CIM", freeSpeedRPM: 5310, stallTorqueNm: 2.42, stallCurrentA: 133, freeCurrentA: 2.7 },
  { id: "mini-cim", label: "Mini CIM", freeSpeedRPM: 5840, stallTorqueNm: 1.41, stallCurrentA: 89, freeCurrentA: 3 },
  { id: "775pro", label: "775pro", freeSpeedRPM: 18730, stallTorqueNm: 0.71, stallCurrentA: 134, freeCurrentA: 0.7 },
  { id: "bag", label: "BAG motor", freeSpeedRPM: 13180, stallTorqueNm: 0.43, stallCurrentA: 53, freeCurrentA: 1.8 },
];

export function getMotor(id: string): MotorSpec {
  const motor = MOTOR_SPECS.find((m) => m.id === id);
  if (!motor) throw new Error(`Unknown motor: ${id}`);
  return motor;
}

export function freeSpeedRadPerSec(motor: MotorSpec): number {
  return (motor.freeSpeedRPM * 2 * Math.PI) / 60;
}

/**
 * The DC motor model WPILib (and by extension reca.lc / the JVN calculator) uses internally:
 * resistance R = 12V / stallCurrent, torque constant Kt = stallTorque / stallCurrent, and a
 * velocity constant Kv derived from free CURRENT (not just free speed) so the rated free speed
 * comes out correctly reproduced — a motor still has a small residual torque at its nameplate
 * free speed (the torque needed to overcome its own internal friction). Fully signed: negative
 * `voltage` or `angularVelocityRadPerSec` represent the reverse direction, and a motor spinning
 * backward relative to its applied voltage correctly produces above-stall torque (real back-EMF
 * behavior). Does not model battery sag or motor-controller current limiting — both reduce real
 * torque below what this predicts under heavy load. Callers that don't want to model regen/
 * braking should clamp the result at 0 themselves.
 */
export function motorTorqueNm(motor: MotorSpec, angularVelocityRadPerSec: number, voltage = 12, numMotors = 1): number {
  const R = 12 / motor.stallCurrentA;
  const Kt = motor.stallTorqueNm / motor.stallCurrentA;
  const Kv = freeSpeedRadPerSec(motor) / (12 - R * motor.freeCurrentA);
  const torquePerMotor = (Kt * (voltage - angularVelocityRadPerSec / Kv)) / R;
  return torquePerMotor * numMotors;
}

/** Rough current draw estimate at a given output torque (per motor), for display only. */
export function estimateCurrentA(motor: MotorSpec, torqueNmPerMotor: number, voltage = 12): number {
  const stallTorqueAtVoltage = motor.stallTorqueNm * Math.abs(voltage / 12);
  const fraction = Math.min(1, Math.abs(torqueNmPerMotor) / Math.max(stallTorqueAtVoltage, 1e-9));
  return motor.freeCurrentA + fraction * (motor.stallCurrentA - motor.freeCurrentA);
}
