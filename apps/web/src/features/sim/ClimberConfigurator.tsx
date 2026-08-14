import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { computeClimberStages, INCH_TO_M, M_TO_INCH } from "@frckickoff/shared";

const WCP_TELESCOPE_STAGES = [
  { stage: 1, sizeIn: "1\" → 1.5\"" },
  { stage: 2, sizeIn: "1.5\" → 2\"" },
  { stage: 3, sizeIn: "2\" → 2.5\"" },
  { stage: 4, sizeIn: "2.5\" → 3\"" },
];

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
        For a climber, an elevator, or any other cascade telescoping mechanism: tell it how small it has to fold
        down to and how tall it needs to reach — it breaks down how many stages you need and how long each one is.
        Uniform-stage cascade model: every stage is the same length (equal to your stowed-height limit), and each
        stage past the first keeps a minimum overlap with the one before it for rigidity.
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
            the mechanism racks or binds. No vendor publishes a spec number for this (checked WCP and SDS bearing
            block pages directly — neither lists an overall block length), so 3-6 inches here is a general
            engineering starting point, not a cited spec — check against whatever bearing hardware you actually use.
          </p>
        </div>

        <div className="card">
          <h3>Result</h3>
          {!result.feasible && result.warning && <p style={{ color: "var(--status-critical)", fontSize: "0.85rem" }}>{result.warning}</p>}
          <Stat label="Stages needed" value={String(result.stageCount)} accent />
          <Stat label="Stowed height" value={`${(result.stowedHeightM * M_TO_INCH).toFixed(1)} in`} />
          <Stat label="Extended height achieved" value={`${(result.extendedHeightM * M_TO_INCH).toFixed(1)} in`} />
          <Stat label="Total travel" value={`${totalTravelIn.toFixed(1)} in`} />
          {result.feasible && result.stageCount > 4 && (
            <p style={{ color: "var(--status-warning)", fontSize: "0.82rem" }}>
              That's more stages than WCP's nested-tube GreyT Telescope goes (it tops out at 4, spring-limited to
              ~40in of travel per stage) — at this count you'd want a cascade design instead (one uniform tube size
              on external bearing blocks, not nested sizes), which isn't stage-count-limited the same way.
            </p>
          )}
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

      <h2>Real parts: WCP GreyT Telescope</h2>
      <div className="card">
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          The numbers above are a planning estimate — this is what an actual off-the-shelf nested telescoping tube
          system looks like. WCP's GreyT Telescope is real, verified nested square tube in 4 fixed stages (each
          stage's cross-section is 0.5" bigger per side than the one before it), sold as 47" stock lengths. Max
          practical stage length is about 40" (limited by their rated constant-force springs), and each moving
          stage is cut about 1/4" longer than the one before it, with the first stage 1" longer than the base tube.
        </p>
        <table>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Cross-section</th>
            </tr>
          </thead>
          <tbody>
            {WCP_TELESCOPE_STAGES.map((s) => (
              <tr key={s.stage}>
                <td>{s.stage}</td>
                <td>{s.sizeIn}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: "0.78rem", marginTop: 8 }}>
          Not the only approach — a "cascade" style elevator (WCP's GreyT Cascade Elevator, SDS's bearing blocks)
          uses one uniform tube size on external bearing blocks instead of nested sizes, trading the fixed 4-stage
          cap for more stages at the cost of added hardware per stage. See the{" "}
          <Link to="/simulate?tool=parts">Parts &amp; Vendors</Link> tab for real links to both approaches.
        </p>
      </div>
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
