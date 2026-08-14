import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { simulateLinear, INCH_TO_M, LB_TO_KG, M_TO_INCH } from "@frckickoff/shared";
import { MotorSelect } from "./MotorSelect";
import { TraceChart } from "./TraceChart";

export function LinearSimulator() {
  const [searchParams] = useSearchParams();

  const [motorId, setMotorId] = useState("neo");
  const [numMotors, setNumMotors] = useState(2);
  const [gearRatio, setGearRatio] = useState(12);
  const [spoolRadiusIn, setSpoolRadiusIn] = useState(0.75);
  const [riggingMultiplier, setRiggingMultiplier] = useState(2);
  const [carriageMassLb, setCarriageMassLb] = useState(15);
  const [travelIn, setTravelIn] = useState(48);
  const [angleFromVerticalDeg, setAngleFromVerticalDeg] = useState(0);
  const [voltage, setVoltage] = useState(12);
  const [efficiencyPct, setEfficiencyPct] = useState(85);

  useEffect(() => {
    const fromQuery = searchParams.get("travelIn");
    if (fromQuery) setTravelIn(Number(fromQuery));
  }, [searchParams]);

  const result = useMemo(
    () =>
      simulateLinear({
        motorId,
        numMotors,
        gearRatio,
        spoolRadiusM: spoolRadiusIn * INCH_TO_M,
        riggingMultiplier,
        carriageMassKg: carriageMassLb * LB_TO_KG,
        travelM: travelIn * INCH_TO_M,
        angleFromVerticalDeg,
        voltage,
        efficiency: efficiencyPct / 100,
      }),
    [motorId, numMotors, gearRatio, spoolRadiusIn, riggingMultiplier, carriageMassLb, travelIn, angleFromVerticalDeg, voltage, efficiencyPct],
  );

  const traceInInches = useMemo(() => result.trace.map((p) => ({ tSeconds: p.tSeconds, position: p.position * M_TO_INCH })), [result.trace]);

  return (
    <div>
      <p className="lede">
        Sizes a linear mechanism — an elevator, a linear-slide intake, a climber stage — given a motor, gearing,
        spool size, and rigging multiplier (how much a cascade/continuous rig multiplies carriage speed vs. spool
        speed).
      </p>

      <div className="two-col">
        <div className="card">
          <MotorSelect motorId={motorId} numMotors={numMotors} onMotorChange={setMotorId} onCountChange={setNumMotors} />
          <div className="field-row">
            <div className="field">
              <label>Gear ratio (motor:spool)</label>
              <input type="number" min={1} value={gearRatio} onChange={(e) => setGearRatio(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Spool radius (in)</label>
              <input type="number" min={0.1} step={0.05} value={spoolRadiusIn} onChange={(e) => setSpoolRadiusIn(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Rigging multiplier</label>
              <input type="number" min={1} max={4} value={riggingMultiplier} onChange={(e) => setRiggingMultiplier(Number(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Carriage mass (lb)</label>
              <input type="number" min={0} value={carriageMassLb} onChange={(e) => setCarriageMassLb(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Travel (in)</label>
              <input type="number" min={0} value={travelIn} onChange={(e) => setTravelIn(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Angle from vertical (°)</label>
              <input type="number" min={0} max={90} value={angleFromVerticalDeg} onChange={(e) => setAngleFromVerticalDeg(Number(e.target.value))} />
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
            0° from vertical = straight up (full gravity load), 90° = horizontal (no gravity component). Came here
            from the Climber Stages tab? Its total travel figure drops straight into the Travel field via the link
            there.
          </p>
        </div>

        <div className="card">
          <h3>Result</h3>
          {!result.reachesTarget && (
            <p style={{ color: "var(--status-critical)", fontSize: "0.85rem" }}>
              Doesn't reach full travel within 15s — this combo can't overcome the load here. Increase gear
              reduction, add motors, use a smaller spool, or reduce mass.
            </p>
          )}
          <Stat label="Time to full extension" value={`${result.timeSeconds.toFixed(2)}s`} accent />
          <Stat label="Max speed" value={`${(result.maxVelocityMPerSec * M_TO_INCH).toFixed(1)} in/s`} />
          <Stat label="Peak current (per motor)" value={`${result.peakCurrentA.toFixed(0)} A`} />
          <Stat
            label="Holds position at rest?"
            value={result.canHoldStatically ? `Yes (+${result.holdingForceMarginN.toFixed(1)} N margin)` : `No — needs a brake/ratchet (${result.holdingForceMarginN.toFixed(1)} N short)`}
            warn={!result.canHoldStatically}
          />
        </div>
      </div>

      <h2>Position over time</h2>
      <TraceChart trace={traceInInches} yLabel="Position" yUnit="in" targetValue={travelIn} />
    </div>
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
