import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { simulateLinear, INCH_TO_M, LB_TO_KG, M_TO_INCH } from "@frckickoff/shared";
import { MotorSelect } from "./MotorSelect";
import { TraceChart } from "./TraceChart";
import { ElevatorDiagram } from "./ElevatorDiagram";

const LB_TO_N = 4.4482216153;

type ActuationType = "cable" | "belt" | "rack-pinion";

const RADIUS_LABEL: Record<ActuationType, string> = {
  cable: "Spool radius (in)",
  belt: "Pulley pitch radius (in)",
  "rack-pinion": "Pinion radius (in)",
};
const GEAR_TARGET_LABEL: Record<ActuationType, string> = {
  cable: "spool",
  belt: "pulley",
  "rack-pinion": "pinion",
};

export function LinearSimulator() {
  const [searchParams] = useSearchParams();

  const [actuationType, setActuationType] = useState<ActuationType>("cable");
  const [motorId, setMotorId] = useState("neo");
  const [numMotors, setNumMotors] = useState(2);
  const [gearRatio, setGearRatio] = useState(12);
  const [spoolRadiusIn, setSpoolRadiusIn] = useState(0.75);
  const [riggingMultiplier, setRiggingMultiplier] = useState(2);
  const [stageCount, setStageCount] = useState(2);
  const [carriageMassLb, setCarriageMassLb] = useState(15);
  const [travelIn, setTravelIn] = useState(48);
  const [angleFromVerticalDeg, setAngleFromVerticalDeg] = useState(0);
  const [voltage, setVoltage] = useState(12);
  const [efficiencyPct, setEfficiencyPct] = useState(85);
  const [gamePieceRadiusIn, setGamePieceRadiusIn] = useState(2.5);

  const [useSprings, setUseSprings] = useState(false);
  const [springCount, setSpringCount] = useState(2);
  const [springForceLbEach, setSpringForceLbEach] = useState(10);
  const [springFullEngagement, setSpringFullEngagement] = useState(true);
  const [springEngagedTravelIn, setSpringEngagedTravelIn] = useState(24);

  useEffect(() => {
    const fromQuery = searchParams.get("travelIn");
    if (fromQuery) setTravelIn(Number(fromQuery));
  }, [searchParams]);

  // Rack & pinion is a single rigid stage driven directly off the pinion — no cascade/continuous
  // rigging to multiply speed, and nothing to telescope, regardless of what's in those fields.
  // Cable and belt can both drive a cascade/continuous multi-stage rig identically.
  const isMultiStageCapable = actuationType !== "rack-pinion";
  const effectiveRiggingMultiplier = isMultiStageCapable ? riggingMultiplier : 1;
  const effectiveStageCount = isMultiStageCapable ? stageCount : 1;

  const totalSpringForceN = useSprings ? springCount * springForceLbEach * LB_TO_N : 0;
  const springEngagedTravelM = (springFullEngagement ? travelIn : Math.min(springEngagedTravelIn, travelIn)) * INCH_TO_M;

  const result = useMemo(
    () =>
      simulateLinear({
        motorId,
        numMotors,
        gearRatio,
        spoolRadiusM: spoolRadiusIn * INCH_TO_M,
        riggingMultiplier: effectiveRiggingMultiplier,
        carriageMassKg: carriageMassLb * LB_TO_KG,
        travelM: travelIn * INCH_TO_M,
        angleFromVerticalDeg,
        voltage,
        efficiency: efficiencyPct / 100,
        springForceN: totalSpringForceN,
        springEngagedTravelM,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [motorId, numMotors, gearRatio, spoolRadiusIn, effectiveRiggingMultiplier, carriageMassLb, travelIn, angleFromVerticalDeg, voltage, efficiencyPct, totalSpringForceN, springEngagedTravelM],
  );

  const traceInInches = useMemo(() => result.trace.map((p) => ({ tSeconds: p.tSeconds, position: p.position * M_TO_INCH })), [result.trace]);

  return (
    <div>
      <p className="lede">
        Sizes a linear mechanism — an elevator, a linear-slide intake, a climber stage — given a motor, gearing, and
        how it's actuated.
      </p>

      <div className="two-col">
        <div className="card">
          <div className="field" style={{ maxWidth: 280 }}>
            <label>Actuation</label>
            <select value={actuationType} onChange={(e) => setActuationType(e.target.value as ActuationType)}>
              <option value="cable">Cable + Spool (cascade/continuous)</option>
              <option value="belt">Belt + Pulley (cascade/continuous)</option>
              <option value="rack-pinion">Rack &amp; Pinion</option>
            </select>
          </div>

          <MotorSelect motorId={motorId} numMotors={numMotors} onMotorChange={setMotorId} onCountChange={setNumMotors} />
          <div className="field-row">
            <div className="field">
              <label>Gear ratio (motor:{GEAR_TARGET_LABEL[actuationType]})</label>
              <input type="number" min={1} value={gearRatio} onChange={(e) => setGearRatio(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>{RADIUS_LABEL[actuationType]}</label>
              <input type="number" min={0.1} step={0.05} value={spoolRadiusIn} onChange={(e) => setSpoolRadiusIn(Number(e.target.value))} />
            </div>
            {isMultiStageCapable && (
              <div className="field">
                <label>Rigging multiplier</label>
                <input type="number" min={1} max={4} value={riggingMultiplier} onChange={(e) => setRiggingMultiplier(Number(e.target.value))} />
              </div>
            )}
          </div>
          {isMultiStageCapable && (
            <div className="field" style={{ maxWidth: 160 }}>
              <label>Number of stages</label>
              <input type="number" min={1} max={6} value={stageCount} onChange={(e) => setStageCount(Number(e.target.value))} />
            </div>
          )}
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
            <div className="field">
              <label>Game piece radius (in)</label>
              <input type="number" min={0} step={0.5} value={gamePieceRadiusIn} onChange={(e) => setGamePieceRadiusIn(Number(e.target.value))} />
            </div>
          </div>
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            0° from vertical = straight up (full gravity load), 90° = horizontal (no gravity component).
            {actuationType === "rack-pinion"
              ? " Rack & pinion is always a single direct-drive stage — no rigging multiplier or stage count to set."
              : " Came here from the Climber / Elevator Stages tab? Its total travel figure drops straight into the Travel field via the link there."}{" "}
            Cable and belt both drive a cascade/continuous multi-stage rig the same way physics-wise — pick
            whichever matches your actual mechanism.
          </p>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, marginBottom: 8, width: "auto" }}>
            <input type="checkbox" style={{ width: "auto" }} checked={useSprings} onChange={(e) => setUseSprings(e.target.checked)} />
            Using constant-force springs to counterbalance?
          </label>
          {useSprings && (
            <>
              <div className="field-row">
                <div className="field">
                  <label>Springs</label>
                  <input type="number" min={1} value={springCount} onChange={(e) => setSpringCount(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>Force per spring (lb)</label>
                  <input type="number" min={0} value={springForceLbEach} onChange={(e) => setSpringForceLbEach(Number(e.target.value))} />
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, width: "auto" }}>
                <input type="checkbox" style={{ width: "auto" }} checked={springFullEngagement} onChange={(e) => setSpringFullEngagement(e.target.checked)} />
                Engaged for the full travel
              </label>
              {!springFullEngagement && (
                <div className="field" style={{ maxWidth: 220 }}>
                  <label>Engaged for the first (in)</label>
                  <input type="number" min={0} max={travelIn} value={springEngagedTravelIn} onChange={(e) => setSpringEngagedTravelIn(Number(e.target.value))} />
                </div>
              )}
              <p className="muted" style={{ fontSize: "0.78rem" }}>
                Modeled as a constant force over its engaged stroke, then zero once fully extended — real CF springs
                are rated for a specific stroke length; check the spring's spec before assuming it covers your full
                travel.
              </p>
            </>
          )}
        </div>

        <div className="card">
          <h3>Result</h3>
          {!result.reachesTarget && (
            <p style={{ color: "var(--status-critical)", fontSize: "0.85rem" }}>
              Doesn't reach full travel within 15s — this combo can't overcome the load here. Increase gear
              reduction, add motors, use a smaller spool, reduce mass, or add spring assist.
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

      <h2>What it looks like</h2>
      <div className="card">
        <ElevatorDiagram
          travelM={travelIn * INCH_TO_M}
          stageCount={effectiveStageCount}
          angleFromVerticalDeg={angleFromVerticalDeg}
          gamePieceRadiusM={gamePieceRadiusIn * INCH_TO_M}
        />
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
