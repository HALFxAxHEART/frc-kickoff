import { useMemo, useState } from "react";
import { simulateArm, simulateLinear, INCH_TO_M, M_TO_INCH, LB_TO_KG } from "@frckickoff/shared";
import { MotorSelect } from "./MotorSelect";
import { TraceChart } from "./TraceChart";
import { PinkArmDiagram } from "./PinkArmDiagram";

export function PinkArmSimulator() {
  // 0 = coaxial telescoping (a true "pink arm"). 90 = an elevator rigidly mounted
  // perpendicular on the end of a fixed-length pivoting arm, rotating together with it.
  const [mountAngleOffsetDeg, setMountAngleOffsetDeg] = useState(0);

  // Pivot axis
  const [pivotMotorId, setPivotMotorId] = useState("neo");
  const [pivotNumMotors, setPivotNumMotors] = useState(2);
  const [pivotGearRatio, setPivotGearRatio] = useState(100);
  const [baseLengthIn, setBaseLengthIn] = useState(12);
  const [pivotStartAngleDeg, setPivotStartAngleDeg] = useState(0);
  const [pivotEndAngleDeg, setPivotEndAngleDeg] = useState(90);
  const [pivotVoltage, setPivotVoltage] = useState(12);
  const [pivotEfficiencyPct, setPivotEfficiencyPct] = useState(85);

  // Extend axis
  const [extendMotorId, setExtendMotorId] = useState("neo-550");
  const [extendNumMotors, setExtendNumMotors] = useState(1);
  const [extendGearRatio, setExtendGearRatio] = useState(15);
  const [pinionRadiusIn, setPinionRadiusIn] = useState(0.75);
  const [riggingMultiplier, setRiggingMultiplier] = useState(1);
  const [extendTravelIn, setExtendTravelIn] = useState(24);
  const [extendAssumedAngleDeg, setExtendAssumedAngleDeg] = useState(45);
  const [extendVoltage, setExtendVoltage] = useState(12);
  const [extendEfficiencyPct, setExtendEfficiencyPct] = useState(85);

  // Shared masses
  const [tubeMassLb, setTubeMassLb] = useState(6);
  const [extendMassLb, setExtendMassLb] = useState(3);
  const [loadMassLb, setLoadMassLb] = useState(2);
  const [gamePieceRadiusIn, setGamePieceRadiusIn] = useState(2.5);

  const pivotResult = useMemo(
    () =>
      simulateArm({
        motorId: pivotMotorId,
        numMotors: pivotNumMotors,
        gearRatio: pivotGearRatio,
        armLengthM: (baseLengthIn + extendTravelIn) * INCH_TO_M, // conservative: assumes fully extended for inertia
        armMassKg: tubeMassLb * LB_TO_KG,
        loadMassKg: loadMassLb * LB_TO_KG,
        startAngleDeg: pivotStartAngleDeg,
        endAngleDeg: pivotEndAngleDeg,
        voltage: pivotVoltage,
        efficiency: pivotEfficiencyPct / 100,
      }),
    [pivotMotorId, pivotNumMotors, pivotGearRatio, baseLengthIn, extendTravelIn, tubeMassLb, loadMassLb, pivotStartAngleDeg, pivotEndAngleDeg, pivotVoltage, pivotEfficiencyPct],
  );

  const extendResult = useMemo(
    () =>
      simulateLinear({
        motorId: extendMotorId,
        numMotors: extendNumMotors,
        gearRatio: extendGearRatio,
        spoolRadiusM: pinionRadiusIn * INCH_TO_M,
        riggingMultiplier,
        carriageMassKg: (extendMassLb + loadMassLb) * LB_TO_KG,
        travelM: extendTravelIn * INCH_TO_M,
        angleFromVerticalDeg: extendAssumedAngleDeg,
        voltage: extendVoltage,
        efficiency: extendEfficiencyPct / 100,
        springForceN: 0,
        springEngagedTravelM: 0,
      }),
    [extendMotorId, extendNumMotors, extendGearRatio, pinionRadiusIn, riggingMultiplier, extendMassLb, loadMassLb, extendTravelIn, extendAssumedAngleDeg, extendVoltage, extendEfficiencyPct],
  );

  return (
    <div>
      <p className="lede">
        Combines a pivot and a linear extension into one mechanism — two independently-driven axes (real hardware
        sometimes profiles them together, which this doesn't simulate, but sizing each axis is still the first real
        question).
      </p>

      <div className="field" style={{ maxWidth: 420, marginBottom: 16 }}>
        <label>Configuration</label>
        <select value={mountAngleOffsetDeg} onChange={(e) => setMountAngleOffsetDeg(Number(e.target.value))}>
          <option value={0}>Telescoping — coaxial (a "pink arm")</option>
          <option value={90}>Elevator mounted on the arm's tip (perpendicular, rotates with it)</option>
          <option value={45}>Angled mount (45°)</option>
        </select>
      </div>
      <p className="muted" style={{ fontSize: "0.82rem", marginTop: -8, marginBottom: 16 }}>
        {mountAngleOffsetDeg === 0
          ? `"Pink arm" — one tube that pivots and telescopes along its own axis at once. The term traces to Team 233's 2005/2011 robots; 1678's 2022 climber is another commonly-cited example.`
          : "A separate linear stage rigidly mounted at the end of a fixed-length pivoting arm, extending at a fixed angle relative to the arm and rotating together with it as the arm swings."}
      </p>

      <div className="two-col">
        <div className="card">
          <h3>Pivot axis</h3>
          <MotorSelect motorId={pivotMotorId} numMotors={pivotNumMotors} onMotorChange={setPivotMotorId} onCountChange={setPivotNumMotors} />
          <div className="field-row">
            <div className="field">
              <label>Gear ratio</label>
              <input type="number" min={1} value={pivotGearRatio} onChange={(e) => setPivotGearRatio(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Base length (in)</label>
              <input type="number" min={0} value={baseLengthIn} onChange={(e) => setBaseLengthIn(Number(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Start angle (°)</label>
              <input type="number" value={pivotStartAngleDeg} onChange={(e) => setPivotStartAngleDeg(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>End angle (°)</label>
              <input type="number" value={pivotEndAngleDeg} onChange={(e) => setPivotEndAngleDeg(Number(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Voltage</label>
              <input type="number" min={0} max={12} value={pivotVoltage} onChange={(e) => setPivotVoltage(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Efficiency %</label>
              <input type="number" min={1} max={100} value={pivotEfficiencyPct} onChange={(e) => setPivotEfficiencyPct(Number(e.target.value))} />
            </div>
          </div>
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            Rotation inertia assumes the tube is fully extended (worst case) — real swing will be a bit faster
            while retracted.
          </p>
        </div>

        <div className="card">
          <h3>Extend axis</h3>
          <MotorSelect motorId={extendMotorId} numMotors={extendNumMotors} onMotorChange={setExtendMotorId} onCountChange={setExtendNumMotors} />
          <div className="field-row">
            <div className="field">
              <label>Gear ratio</label>
              <input type="number" min={1} value={extendGearRatio} onChange={(e) => setExtendGearRatio(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Pinion/spool radius (in)</label>
              <input type="number" min={0.1} step={0.05} value={pinionRadiusIn} onChange={(e) => setPinionRadiusIn(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Rigging multiplier</label>
              <input type="number" min={1} max={4} value={riggingMultiplier} onChange={(e) => setRiggingMultiplier(Number(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Extension travel (in)</label>
              <input type="number" min={0} value={extendTravelIn} onChange={(e) => setExtendTravelIn(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Assumed angle from vertical (°)</label>
              <input type="number" min={0} max={90} value={extendAssumedAngleDeg} onChange={(e) => setExtendAssumedAngleDeg(Number(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Voltage</label>
              <input type="number" min={0} max={12} value={extendVoltage} onChange={(e) => setExtendVoltage(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Efficiency %</label>
              <input type="number" min={1} max={100} value={extendEfficiencyPct} onChange={(e) => setExtendEfficiencyPct(Number(e.target.value))} />
            </div>
          </div>
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            The gravity component the extension fights against changes as the arm pivots — this uses one fixed
            angle throughout as a simplification rather than coupling the two axes together.
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Masses</h3>
        <div className="field-row">
          <div className="field">
            <label>Tube/mechanism mass (lb)</label>
            <input type="number" min={0} value={tubeMassLb} onChange={(e) => setTubeMassLb(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Telescoping section mass (lb)</label>
            <input type="number" min={0} value={extendMassLb} onChange={(e) => setExtendMassLb(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Load at tip (lb)</label>
            <input type="number" min={0} value={loadMassLb} onChange={(e) => setLoadMassLb(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Game piece radius (in)</label>
            <input type="number" min={0} step={0.5} value={gamePieceRadiusIn} onChange={(e) => setGamePieceRadiusIn(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Pivot result</h3>
          {!pivotResult.reachesTarget && (
            <p style={{ color: "var(--status-critical)", fontSize: "0.85rem" }}>Doesn't reach the target angle within 15s.</p>
          )}
          <Stat label="Time" value={`${pivotResult.timeSeconds.toFixed(2)}s`} accent />
          <Stat label="Max speed" value={`${Math.abs(pivotResult.maxVelocityDegPerSec).toFixed(0)}°/s`} />
          <Stat label="Peak current (per motor)" value={`${pivotResult.peakCurrentA.toFixed(0)} A`} />
        </div>
        <div className="card">
          <h3>Extend result</h3>
          {!extendResult.reachesTarget && (
            <p style={{ color: "var(--status-critical)", fontSize: "0.85rem" }}>Doesn't reach full extension within 15s.</p>
          )}
          <Stat label="Time" value={`${extendResult.timeSeconds.toFixed(2)}s`} accent />
          <Stat label="Max speed" value={`${(extendResult.maxVelocityMPerSec * M_TO_INCH).toFixed(1)} in/s`} />
          <Stat label="Peak current (per motor)" value={`${extendResult.peakCurrentA.toFixed(0)} A`} />
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        If both axes are commanded together, the combined move takes roughly{" "}
        <strong>{Math.max(pivotResult.timeSeconds, extendResult.timeSeconds).toFixed(2)}s</strong> — bounded by
        whichever axis is slower.
      </p>

      <h2>What it looks like</h2>
      <div className="card">
        <PinkArmDiagram
          pivotTrace={pivotResult.trace}
          extendTrace={extendResult.trace}
          baseLengthM={baseLengthIn * INCH_TO_M}
          mountAngleOffsetDeg={mountAngleOffsetDeg}
          gamePieceRadiusM={gamePieceRadiusIn * INCH_TO_M}
        />
      </div>

      <div className="two-col">
        <div>
          <h2>Pivot angle over time</h2>
          <TraceChart trace={pivotResult.trace} yLabel="Angle" yUnit="deg" targetValue={pivotEndAngleDeg} />
        </div>
        <div>
          <h2>Extension over time</h2>
          <TraceChart
            trace={extendResult.trace.map((p) => ({ tSeconds: p.tSeconds, position: p.position * M_TO_INCH }))}
            yLabel="Extension"
            yUnit="in"
            targetValue={extendTravelIn}
          />
        </div>
      </div>

      <p className="source-note">
        "Pink arm" attribution per community discussion (Chief Delphi) crediting Team 233 as the originator
        (2005, most prominently their 2011 robot); 1678's 2022 climber is cited there as another mechanism
        fitting the same definition. This is NOT a Team 2910 mechanism — 2910's actual 2023 extendable arm is a
        decoupled pivot + cascade lift (per FRCDesign.org's mechanism writeup), not a single telescoping tube.
      </p>
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
