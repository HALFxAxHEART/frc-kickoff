import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { simulateArm, INCH_TO_M, LB_TO_KG, type ArmConfig } from "@frckickoff/shared";
import { MotorSelect } from "./MotorSelect";
import { TraceChart } from "./TraceChart";
import { MechanismDiagram } from "./MechanismDiagram";

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

  const [fourBarOn, setFourBarOn] = useState(false);
  const [groundLenIn, setGroundLenIn] = useState(6);
  const [groundAngleDeg, setGroundAngleDeg] = useState(0);
  const [couplerLenIn, setCouplerLenIn] = useState(24);
  const [outputLenIn, setOutputLenIn] = useState(6);
  const [gamePieceRadiusIn, setGamePieceRadiusIn] = useState(2.5);

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

  const fourBarLinks = fourBarOn
    ? { groundLenM: groundLenIn * INCH_TO_M, groundAngleDeg, couplerLenM: couplerLenIn * INCH_TO_M, outputLenM: outputLenIn * INCH_TO_M }
    : undefined;

  return (
    <div>
      <p className="lede">
        {variant === "arm"
          ? "Sizes a pivoting arm or true 4-bar linkage — how fast it swings from one angle to another, whether the motor can hold it up against gravity, and what it actually looks like doing it."
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
              <label>{fourBarOn ? "Input link length (in)" : "Arm length (in)"}</label>
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
            0° is horizontal, 90° is straight up. Dynamics (speed/time/current) are always driven by this link —
            4-bar mode below only adds the kinematics of a second pivoting link for the diagram, not separate mass.
          </p>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, marginBottom: 8, width: "auto" }}>
            <input type="checkbox" style={{ width: "auto" }} checked={fourBarOn} onChange={(e) => setFourBarOn(e.target.checked)} />
            Model as a true 4-bar linkage (independent pivots, keeps end-effector orientation)
          </label>
          {fourBarOn && (
            <>
              <div className="field-row">
                <div className="field">
                  <label>Frame pivot spacing (in)</label>
                  <input type="number" min={0.5} value={groundLenIn} onChange={(e) => setGroundLenIn(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>Frame angle (° from horizontal)</label>
                  <input type="number" value={groundAngleDeg} onChange={(e) => setGroundAngleDeg(Number(e.target.value))} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Coupler link length (in)</label>
                  <input type="number" min={0.5} value={couplerLenIn} onChange={(e) => setCouplerLenIn(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>Output link length (in)</label>
                  <input type="number" min={0.5} value={outputLenIn} onChange={(e) => setOutputLenIn(Number(e.target.value))} />
                </div>
              </div>
              <p className="muted" style={{ fontSize: "0.78rem" }}>
                Set coupler = frame spacing and output = input length for a parallelogram 4-bar — that's the config
                that keeps a held game piece level throughout the swing, which is usually the point of using a 4-bar
                at all.
              </p>
            </>
          )}
          <div className="field" style={{ maxWidth: 220 }}>
            <label>Game piece radius (in)</label>
            <input type="number" min={0} step={0.5} value={gamePieceRadiusIn} onChange={(e) => setGamePieceRadiusIn(Number(e.target.value))} />
          </div>
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

      <h2>What it looks like</h2>
      <div className="card">
        <MechanismDiagram trace={forward.trace} inputLenM={armLengthIn * INCH_TO_M} fourBar={fourBarLinks} gamePieceRadiusM={gamePieceRadiusIn * INCH_TO_M} />
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
