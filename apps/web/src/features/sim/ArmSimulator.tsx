import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { simulateArm, INCH_TO_M, LB_TO_KG, type ArmConfig } from "@frckickoff/shared";
import { MotorSelect } from "./MotorSelect";
import { TraceChart } from "./TraceChart";

interface Preset {
  gearRatio: number;
  armLengthIn: number;
  armMassLb: number;
  loadMassLb: number;
  startAngleDeg: number;
  endAngleDeg: number;
  motorId: string;
}

const ARM_PRESET: Preset = { gearRatio: 80, armLengthIn: 24, armMassLb: 8, loadMassLb: 2, startAngleDeg: 0, endAngleDeg: 100, motorId: "neo" };
const SLAPDOWN_PRESET: Preset = { gearRatio: 20, armLengthIn: 10, armMassLb: 3, loadMassLb: 0, startAngleDeg: 90, endAngleDeg: -5, motorId: "neo-550" };

export function ArmSimulator({ variant }: { variant: "arm" | "slapdown" }) {
  const preset = variant === "arm" ? ARM_PRESET : SLAPDOWN_PRESET;
  const [motorId, setMotorId] = useState(preset.motorId);
  const [numMotors, setNumMotors] = useState(1);
  const [gearRatio, setGearRatio] = useState(preset.gearRatio);
  const [armLengthIn, setArmLengthIn] = useState(preset.armLengthIn);
  const [armMassLb, setArmMassLb] = useState(preset.armMassLb);
  const [loadMassLb, setLoadMassLb] = useState(preset.loadMassLb);
  const [startAngleDeg, setStartAngleDeg] = useState(preset.startAngleDeg);
  const [endAngleDeg, setEndAngleDeg] = useState(preset.endAngleDeg);
  const [voltage, setVoltage] = useState(12);
  const [efficiencyPct, setEfficiencyPct] = useState(85);

  const baseConfig: Omit<ArmConfig, "startAngleDeg" | "endAngleDeg"> = {
    motorId,
    numMotors,
    gearRatio,
    armLengthM: armLengthIn * INCH_TO_M,
    armMassKg: armMassLb * LB_TO_KG,
    loadMassKg: loadMassLb * LB_TO_KG,
    voltage,
    efficiency: efficiencyPct / 100,
  };

  const forward = useMemo(
    () => simulateArm({ ...baseConfig, startAngleDeg, endAngleDeg }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [motorId, numMotors, gearRatio, armLengthIn, armMassLb, loadMassLb, startAngleDeg, endAngleDeg, voltage, efficiencyPct],
  );
  const reverse = useMemo(
    () => (variant === "slapdown" ? simulateArm({ ...baseConfig, startAngleDeg: endAngleDeg, endAngleDeg: startAngleDeg }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variant, motorId, numMotors, gearRatio, armLengthIn, armMassLb, loadMassLb, startAngleDeg, endAngleDeg, voltage, efficiencyPct],
  );

  return (
    <div>
      <p className="lede">
        {variant === "arm"
          ? "Sizes a pivoting arm/4-bar mechanism — how fast it swings from one angle to another, and whether the motor can actually hold it up against gravity once it's there."
          : "Sizes a slapdown-style deploy/retract intake — since gravity helps one direction and fights the other, both are simulated. Feed the times below straight into the Cycle Time Calculator's pickup/travel fields."}
      </p>

      <div className="two-col">
        <div className="card">
          <MotorSelect motorId={motorId} numMotors={numMotors} onMotorChange={setMotorId} onCountChange={setNumMotors} />
          <div className="field-row">
            <div className="field">
              <label>Gear ratio (motor:output)</label>
              <input type="number" min={1} value={gearRatio} onChange={(e) => setGearRatio(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Voltage</label>
              <input type="number" min={0} max={12} value={voltage} onChange={(e) => setVoltage(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Efficiency %</label>
              <input type="number" min={1} max={100} value={efficiencyPct} onChange={(e) => setEfficiencyPct(Number(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Arm length (in)</label>
              <input type="number" min={0} value={armLengthIn} onChange={(e) => setArmLengthIn(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Arm mass (lb)</label>
              <input type="number" min={0} value={armMassLb} onChange={(e) => setArmMassLb(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Load at tip (lb)</label>
              <input type="number" min={0} value={loadMassLb} onChange={(e) => setLoadMassLb(Number(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Start angle (° from horizontal)</label>
              <input type="number" value={startAngleDeg} onChange={(e) => setStartAngleDeg(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>End angle (° from horizontal)</label>
              <input type="number" value={endAngleDeg} onChange={(e) => setEndAngleDeg(Number(e.target.value))} />
            </div>
          </div>
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            Arm modeled as a uniform rod (moment of inertia = mass·length²/3) plus an optional point load at the tip.
            0° is horizontal, 90° is straight up.
          </p>
        </div>

        <div>
          <div className="card">
            <h3>{variant === "slapdown" ? "Deploy (start → end)" : "Result"}</h3>
            <ResultStats result={forward} />
          </div>
          {reverse && (
            <div className="card">
              <h3>Retract (end → start)</h3>
              <ResultStats result={reverse} />
            </div>
          )}
        </div>
      </div>

      <h2>Position over time</h2>
      <TraceChart trace={forward.trace} yLabel="Angle" yUnit="deg" targetValue={endAngleDeg} />

      {variant === "slapdown" && forward.reachesTarget && reverse?.reachesTarget && (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Try these in the <Link to="/cycle-time">Cycle Time Calculator</Link>: ~{forward.timeSeconds.toFixed(1)}s deploy,
          ~{reverse.timeSeconds.toFixed(1)}s retract.
        </p>
      )}
    </div>
  );
}

function ResultStats({ result }: { result: ReturnType<typeof simulateArm> }) {
  return (
    <>
      {!result.reachesTarget && (
        <p style={{ color: "var(--status-critical)", fontSize: "0.85rem" }}>
          Doesn't reach the target angle within 15s — this gear ratio/motor combo can't overcome gravity here. Increase
          gear reduction, add motors, or reduce mass.
        </p>
      )}
      <Stat label="Time" value={`${result.timeSeconds.toFixed(2)}s`} accent />
      <Stat label="Max speed" value={`${Math.abs(result.maxVelocityDegPerSec).toFixed(0)}°/s`} />
      <Stat label="Peak current (per motor)" value={`${result.peakCurrentA.toFixed(0)} A`} />
      <Stat
        label="Holds position at rest?"
        value={result.canHoldAtEnd ? `Yes (+${result.holdingTorqueMarginNm.toFixed(2)} N·m margin)` : `No (${result.holdingTorqueMarginNm.toFixed(2)} N·m short)`}
        warn={!result.canHoldAtEnd}
      />
    </>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="muted" style={{ fontSize: "0.78rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.2rem", fontWeight: 600, color: warn ? "var(--status-critical)" : accent ? "var(--series-1)" : "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}
