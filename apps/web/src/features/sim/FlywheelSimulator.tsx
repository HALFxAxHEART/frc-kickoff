import { useMemo, useState } from "react";
import { simulateFlywheel, INCH_TO_M, LB_TO_KG } from "@frckickoff/shared";
import { MotorSelect } from "./MotorSelect";
import { TraceChart } from "./TraceChart";

export function FlywheelSimulator() {
  const [motorId, setMotorId] = useState("neo-vortex");
  const [numMotors, setNumMotors] = useState(2);
  const [gearRatio, setGearRatio] = useState(1);
  const [flywheelMassLb, setFlywheelMassLb] = useState(1.2);
  const [flywheelRadiusIn, setFlywheelRadiusIn] = useState(2);
  const [targetRPM, setTargetRPM] = useState(4000);
  const [speedDropRPM, setSpeedDropRPM] = useState(300);
  const [voltage, setVoltage] = useState(12);
  const [efficiencyPct, setEfficiencyPct] = useState(95);

  const result = useMemo(
    () =>
      simulateFlywheel({
        motorId,
        numMotors,
        gearRatio,
        flywheelMassKg: flywheelMassLb * LB_TO_KG,
        flywheelRadiusM: flywheelRadiusIn * INCH_TO_M,
        targetRPM,
        speedDropRPM,
        voltage,
        efficiency: efficiencyPct / 100,
      }),
    [motorId, numMotors, gearRatio, flywheelMassLb, flywheelRadiusIn, targetRPM, speedDropRPM, voltage, efficiencyPct],
  );

  const surfaceSpeedFtPerSec = result.surfaceSpeedMPerSec * 3.28084;

  return (
    <div>
      <p className="lede">
        Sizes a flywheel shooter — spin-up time from a cold start, and (if you estimate how much a shot knocks the
        flywheel's speed down) how long it takes to recover between shots. Flywheel modeled as a solid disc.
      </p>

      <div className="two-col">
        <div className="card">
          <MotorSelect motorId={motorId} numMotors={numMotors} onMotorChange={setMotorId} onCountChange={setNumMotors} />
          <div className="field-row">
            <div className="field">
              <label>Gear ratio (motor:flywheel)</label>
              <input type="number" min={0.1} step={0.1} value={gearRatio} onChange={(e) => setGearRatio(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Flywheel mass (lb)</label>
              <input type="number" min={0} step={0.1} value={flywheelMassLb} onChange={(e) => setFlywheelMassLb(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Flywheel radius (in)</label>
              <input type="number" min={0} step={0.1} value={flywheelRadiusIn} onChange={(e) => setFlywheelRadiusIn(Number(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Target speed (RPM)</label>
              <input type="number" min={0} value={targetRPM} onChange={(e) => setTargetRPM(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Speed drop per shot (RPM)</label>
              <input type="number" min={0} value={speedDropRPM} onChange={(e) => setSpeedDropRPM(Number(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Voltage</label>
              <input type="number" min={0} max={12} value={voltage} onChange={(e) => setVoltage(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Efficiency %</label>
              <input type="number" min={1} max={100} value={efficiencyPct} onChange={(e) => setEfficiencyPct(Number(e.target.value))} />
            </div>
          </div>
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            Speed drop per shot is a number you'd get from testing or a reasonable guess — real energy transfer to
            the game piece depends on compression and contact mechanics this tool doesn't model. Set it to 0 to skip
            the recovery-time estimate.
          </p>
        </div>

        <div className="card">
          <h3>Result</h3>
          <Stat label="Spin-up time (cold start)" value={`${result.spinUpTimeSeconds.toFixed(2)}s`} accent />
          {result.recoveryTimeSeconds !== null && <Stat label="Recovery time per shot" value={`${result.recoveryTimeSeconds.toFixed(2)}s`} />}
          <Stat label="Peak current (per motor)" value={`${result.peakCurrentA.toFixed(0)} A`} />
          <Stat label="Flywheel surface speed" value={`${surfaceSpeedFtPerSec.toFixed(0)} ft/s`} />
        </div>
      </div>

      <h2>Spin-up over time</h2>
      <TraceChart trace={result.trace} yLabel="Flywheel speed" yUnit="RPM" targetValue={targetRPM} />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="muted" style={{ fontSize: "0.78rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.2rem", fontWeight: 600, color: accent ? "var(--series-1)" : "var(--text-primary)" }}>{value}</div>
    </div>
  );
}
