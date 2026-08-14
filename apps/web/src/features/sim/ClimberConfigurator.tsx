import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { computeClimberStages, INCH_TO_M, M_TO_INCH } from "@frckickoff/shared";

export function ClimberConfigurator() {
  const [maxStowedIn, setMaxStowedIn] = useState(20);
  const [targetExtendedIn, setTargetExtendedIn] = useState(48);
  const [minOverlapIn, setMinOverlapIn] = useState(4);
  const [forceStages, setForceStages] = useState<number | "">("");

  const result = useMemo(
    () =>
      computeClimberStages({
        maxStowedHeightM: maxStowedIn * INCH_TO_M,
        targetExtendedHeightM: targetExtendedIn * INCH_TO_M,
        minOverlapM: minOverlapIn * INCH_TO_M,
        forcedStageCount: forceStages === "" ? undefined : forceStages,
      }),
    [maxStowedIn, targetExtendedIn, minOverlapIn, forceStages],
  );

  const totalTravelIn = result.totalTravelM * M_TO_INCH;

  return (
    <div>
      <p className="lede">
        Tell it how small the climber has to fold down to and how tall it needs to reach — it breaks down how many
        telescoping stages you need and how long each one is. Uniform-stage cascade model: every stage is the same
        length (equal to your stowed-height limit), and each stage past the first keeps a minimum overlap with the
        one before it for rigidity.
      </p>

      <div className="two-col">
        <div className="card">
          <div className="field-row">
            <div className="field">
              <label>Max stowed height (in)</label>
              <input type="number" min={1} value={maxStowedIn} onChange={(e) => setMaxStowedIn(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Target extended height (in)</label>
              <input type="number" min={1} value={targetExtendedIn} onChange={(e) => setTargetExtendedIn(Number(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Min. overlap per stage (in)</label>
              <input type="number" min={0} value={minOverlapIn} onChange={(e) => setMinOverlapIn(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Force stage count (optional)</label>
              <input
                type="number"
                min={1}
                placeholder="auto"
                value={forceStages}
                onChange={(e) => setForceStages(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            Overlap is the bearing/guide engagement kept between adjacent stages at full extension — too little and
            the mechanism racks or binds. 3-6 inches is a common starting point for tube-in-tube designs; check
            against your actual bearing/guide hardware. Real nested tube stock comes in fixed sizes, not whatever
            number you type here — check the <Link to="/simulate?tool=parts">Parts &amp; Vendors</Link> tab for
            what's actually available before locking in a stage length.
          </p>
        </div>

        <div className="card">
          <h3>Result</h3>
          {!result.feasible && result.warning && <p style={{ color: "var(--status-critical)", fontSize: "0.85rem" }}>{result.warning}</p>}
          <Stat label="Stages needed" value={String(result.stageCount)} accent />
          <Stat label="Stowed height" value={`${(result.stowedHeightM * M_TO_INCH).toFixed(1)} in`} />
          <Stat label="Extended height achieved" value={`${(result.extendedHeightM * M_TO_INCH).toFixed(1)} in`} />
          <Stat label="Total travel" value={`${totalTravelIn.toFixed(1)} in`} />
          {result.feasible && (
            <Link to={`/simulate?tool=linear&travelIn=${totalTravelIn.toFixed(1)}`} className="button" style={{ display: "inline-block", marginTop: 4 }}>
              Model this travel in the Linear simulator →
            </Link>
          )}
        </div>
      </div>

      {result.stages.length > 0 && (
        <>
          <h2>Stage breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Length</th>
                <th>Overlap with next</th>
                <th>Cumulative reach</th>
              </tr>
            </thead>
            <tbody>
              {result.stages.map((s) => (
                <tr key={s.stageNumber}>
                  <td>{s.stageNumber === 1 ? "1 (fixed base)" : s.stageNumber}</td>
                  <td>{(s.lengthM * M_TO_INCH).toFixed(1)} in</td>
                  <td>{s.overlapWithNextM > 0 ? `${(s.overlapWithNextM * M_TO_INCH).toFixed(1)} in` : "—"}</td>
                  <td>{(s.cumulativeExtendedHeightM * M_TO_INCH).toFixed(1)} in</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
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
