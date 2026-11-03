import { useState } from "react";
import { Num } from "./Num";
import { getMotor, MOTOR_SPECS, type ArmAnalysis, type ArmMoveResult, type IntakeArmDrive, type IntakeBar, type IntakeLinkage } from "@frckickoff/shared";

interface ArmPanelProps {
  linkage: IntakeLinkage;
  drive: IntakeArmDrive;
  bars: IntakeBar[];
  analysis: ArmAnalysis;
  deploy: ArmMoveResult;
  stow: ArmMoveResult;
  onLinkage: (patch: Partial<IntakeLinkage>) => void;
  onDrive: (patch: Partial<IntakeArmDrive>) => void;
}

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);

function Tile({ k, v, tone }: { k: string; v: string; tone?: "good" | "bad" }) {
  return (
    <div className={"il-tile" + (tone ? ` ${tone}` : "")}>
      <div className="v">{v}</div>
      <div className="k">{k}</div>
    </div>
  );
}

/** Current needed to hold the intake still at each driver angle, with the current limit for reference. */
function HoldChart({ analysis, limitA }: { analysis: ArmAnalysis; limitA: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = analysis.samples.filter((s) => s.pose.feasible);
  if (pts.length < 2) return null;
  const W = 640;
  const H = 220;
  const m = { l: 44, r: 14, t: 12, b: 34 };
  const xs = pts.map((p) => p.driverDeg);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  // round the axis to a nice step (1, 2 or 5 × 10^n) so the gridlines read cleanly
  const rawMax = Math.max(limitA * 1.1, ...pts.map((p) => p.holdCurrentA));
  const mag = 10 ** Math.floor(Math.log10(rawMax / 4));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((v) => v * 4 >= rawMax) ?? 10 * mag;
  const yMax = step * 4;
  const sx = (v: number) => m.l + ((v - x0) / Math.max(x1 - x0, 1e-6)) * (W - m.l - m.r);
  const sy = (v: number) => H - m.b - (v / yMax) * (H - m.t - m.b);
  // stowed on the left, deployed on the right, whichever way the angle numbers run
  const flip = analysis.stowedDeg > analysis.deployedDeg;
  const px = (deg: number) => (flip ? W - m.r - (sx(deg) - m.l) : sx(deg));
  const line = pts.map((p) => `${px(p.driverDeg)},${sy(p.holdCurrentA)}`).join(" ");
  const ticks = Array.from({ length: 5 }, (_, i) => step * i);
  const h = hover !== null ? pts[hover] : undefined;
  return (
    <div className="il-chart-wrap">
      <svg
        className="il-chart"
        viewBox={`0 0 ${W} ${H}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          pts.forEach((p, i) => {
            if (Math.abs(px(p.driverDeg) - x) < Math.abs(px(pts[best]!.driverDeg) - x)) best = i;
          });
          setHover(best);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} className="grid" />
            <text x={m.l - 6} y={sy(t) + 4} textAnchor="end" className="axis">
              {t.toFixed(0)} A
            </text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={sy(limitA)} y2={sy(limitA)} className="limit" />
        <text x={W - m.r} y={sy(limitA) - 5} textAnchor="end" className="axis">
          current limit {limitA} A
        </text>
        <polyline points={line} className="line" />
        <text x={m.l} y={H - 10} className="axis">
          stowed ({f1(analysis.stowedDeg)}°)
        </text>
        <text x={W - m.r} y={H - 10} textAnchor="end" className="axis">
          deployed ({f1(analysis.deployedDeg)}°)
        </text>
        <text x={(m.l + W - m.r) / 2} y={H - 10} textAnchor="middle" className="axis">
          driver link angle →
        </text>
        {h && (
          <>
            <line x1={px(h.driverDeg)} x2={px(h.driverDeg)} y1={m.t} y2={H - m.b} className="cross" />
            <circle cx={px(h.driverDeg)} cy={sy(h.holdCurrentA)} r={4.5} className="dot" />
          </>
        )}
      </svg>
      {h && (
        <div className="il-chart-tip" style={{ left: `${(px(h.driverDeg) / W) * 100}%`, top: `${(sy(h.holdCurrentA) / H) * 100}%` }}>
          {f1(h.driverDeg)}°: hold {f1(h.holdCurrentA)} A · gravity {f2(Math.abs(h.gravityTorqueNm))} N·m {h.gravityTorqueNm >= 0 ? "toward stowed" : "toward deployed"}
        </div>
      )}
    </div>
  );
}

export function ArmPanel({ linkage, drive, bars, analysis, deploy, stow, onLinkage, onDrive }: ArmPanelProps) {
  const motor = getMotor(drive.motorId);
  const kt = motor.stallTorqueNm / motor.stallCurrentA;
  const L = analysis.lengths;
  const sorted = [L.ground, L.driver, L.follower, L.coupler].sort((p, q) => p - q);
  const worst = analysis.worstHold;
  const motorTorqueWorst = worst.torqueNm / Math.max(drive.ratio * drive.efficiency * drive.numMotors, 1e-9);
  const deployedSample = analysis.samples[analysis.samples.length - 1];
  const inertiaDeployed = deployedSample?.inertiaKgM2 ?? 0;
  const freeLinkDps = (motor.freeSpeedRPM / 60 / Math.max(drive.ratio, 1e-6)) * 360;
  const sweepDeg = Math.abs(analysis.deployedDeg - analysis.stowedDeg);
  const setJoint = (key: "a" | "b" | "c" | "d", axis: "x" | "y", v: number) => onLinkage({ [key]: { ...linkage[key], [axis]: v } });

  return (
    <>
      <div className="card">
        <h2>Arm results</h2>
        {!analysis.feasible && (
          <p className="il-callout">
            <b>This linkage can't make the whole move.</b> Somewhere between stowed and deployed the follower and coupler can't reach each other
            (the links are too short, or it passes through a dead spot). Move a joint or change the stowed angle.
          </p>
        )}
        <div className="il-tiles">
          <Tile k="deploy time (full power)" v={deploy.reached ? `${f2(deploy.timeS)} s` : "can't"} tone={deploy.reached ? undefined : "bad"} />
          <Tile k="stow time (full power)" v={stow.reached ? `${f2(stow.timeS)} s` : "can't"} tone={stow.reached ? undefined : "bad"} />
          <Tile k={`hits the stop at (deploy / stow)`} v={`${deploy.impactDegPerSec.toFixed(0)} / ${stow.impactDegPerSec.toFixed(0)} °/s`} tone={Math.max(deploy.impactDegPerSec, stow.impactDegPerSec) > 400 ? "bad" : "good"} />
          <Tile k={`most current to hold still (at ${f1(worst.driverDeg)}°)`} v={`${f1(worst.currentA)} A`} tone={worst.currentA > drive.statorLimitA * 0.5 ? "bad" : "good"} />
          <Tile k="stowed: past the frame perimeter" v={analysis.stowedOverhangIn <= 0 ? `inside by ${f1(-analysis.stowedOverhangIn)} in` : `OUT ${f1(analysis.stowedOverhangIn)} in`} tone={analysis.stowedOverhangIn <= 0 ? "good" : "bad"} />
          <Tile k="deployed reach (limit 18 in)" v={`${f1(analysis.deployedReachIn)} in`} tone={analysis.deployedReachIn <= 18 ? "good" : "bad"} />
          <Tile k="when hit from the front" v={analysis.foldsUpWhenHit ? "folds up ✓" : "jams down ✗"} tone={analysis.foldsUpWhenHit ? "good" : "bad"} />
          <Tile k="closest to a dead spot (want > 40°)" v={`${analysis.minTransmissionDeg.toFixed(0)}°`} tone={analysis.minTransmissionDeg >= 40 ? "good" : "bad"} />
          <Tile k="rollers through the bumper" v={analysis.bumperHits.length ? analysis.bumperHits.join(", ") : "none ✓"} tone={analysis.bumperHits.length ? "bad" : "good"} />
        </div>
        <p className="muted">
          "Full power" = 12 V until it hits the hard stop, like a simple command with no Motion Magic. Hitting the stop at hundreds of degrees per second is
          why real code uses Motion Magic to slow down at the end.
        </p>
        <h3>Current needed to hold the intake still, at every angle</h3>
        <HoldChart analysis={analysis} limitA={drive.statorLimitA} />
        <p className="muted">
          Hover to read any angle. The tooltip says which way gravity pulls. At each end, if gravity pulls the intake into its hard stop, the stop
          carries the weight and the motor can relax; everywhere in between, this is what the motor has to fight.
        </p>
      </div>

      <div className="two-col">
        <div className="card">
          <h2>Linkage (deployed pose)</h2>
          <p className="muted">
            Drag the square handles A, B, C, D in the picture, or type here. A and B bolt to the robot; C and D are on the intake plate. The motor turns
            A→C (the driver link). Moving these never moves the deployed rollers, only how the intake gets there.
          </p>
          <table className="il-table">
            <thead>
              <tr>
                <th>Joint</th>
                <th>x (in)</th>
                <th>y (in)</th>
                <th>What it is</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["a", "A", "driver pivot (motor), on the robot"],
                  ["b", "B", "follower pivot, on the robot"],
                  ["c", "C", "driver link → intake plate"],
                  ["d", "D", "follower link → intake plate"],
                ] as const
              ).map(([key, label, what]) => (
                <tr key={key}>
                  <td>
                    <b>{label}</b>
                  </td>
                  <td>
                    <Num value={linkage[key].x} onChange={(v) => setJoint(key, "x", v)} width="5em" />
                  </td>
                  <td>
                    <Num value={linkage[key].y} onChange={(v) => setJoint(key, "y", v)} width="5em" />
                  </td>
                  <td className="muted">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="field-row" style={{ marginTop: 10 }}>
            <div className="field">
              <label>Stowed driver angle (°, deployed is {f1(analysis.deployedDeg)}°)</label>
              <Num value={linkage.stowedDriverDeg} onChange={(v) => onLinkage({ stowedDriverDeg: v })} step={1} />
            </div>
          </div>
          <div className="field">
            <label>Rollers that ride on the intake (untick a roller that's bolted to the robot, like one inside the frame)</label>
            <div className="chips">
              {bars.map((b) => (
                <label key={b.id} className="chip">
                  <input
                    type="checkbox"
                    style={{ width: "auto", marginRight: 6 }}
                    checked={!linkage.barsFixed.includes(b.id)}
                    onChange={(e) =>
                      onLinkage({ barsFixed: e.target.checked ? linkage.barsFixed.filter((id) => id !== b.id) : [...linkage.barsFixed, b.id] })
                    }
                  />
                  {b.id}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Arm motor and weights</h2>
          <div className="field-row">
            <div className="field">
              <label>Motor</label>
              <select value={drive.motorId} onChange={(e) => onDrive({ motorId: e.target.value })}>
                {MOTOR_SPECS.map((mm) => (
                  <option key={mm.id} value={mm.id}>
                    {mm.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label># of motors</label>
              <Num value={drive.numMotors} onChange={(v) => onDrive({ numMotors: Math.max(1, Math.round(v)) })} min={1} step={1} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Gear ratio (motor : driver link)</label>
              <Num value={drive.ratio} onChange={(v) => onDrive({ ratio: Math.max(1, v) })} min={1} step={1} />
            </div>
            <div className="field">
              <label>Stator current limit (A)</label>
              <Num value={drive.statorLimitA} onChange={(v) => onDrive({ statorLimitA: Math.max(1, v) })} min={1} step={5} />
            </div>
            <div className="field">
              <label>Gearbox efficiency (%)</label>
              <Num value={Math.round(drive.efficiency * 100)} onChange={(v) => onDrive({ efficiency: Math.min(1, Math.max(0.1, v / 100)) })} min={10} max={100} step={5} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Intake plates + roller motor (lb)</label>
              <Num value={drive.plateMassLb} onChange={(v) => onDrive({ plateMassLb: Math.max(0, v) })} min={0} step={0.5} />
            </div>
            <div className="field">
              <label>Each roller bar (lb)</label>
              <Num value={drive.barMassLb} onChange={(v) => onDrive({ barMassLb: Math.max(0, v) })} min={0} step={0.1} />
            </div>
            <div className="field">
              <label>Each link, both sides (lb)</label>
              <Num value={drive.linkMassLb} onChange={(v) => onDrive({ linkMassLb: Math.max(0, v) })} min={0} step={0.1} />
            </div>
          </div>
          <p className="muted">
            Weigh the real parts when you can. A 2 in poly tube with hex, bearings and pulleys is roughly 0.5–1 lb for a full-width bar; a Kraken X60 is about
            1.2 lb.
          </p>
        </div>
      </div>

      <div className="card il-math">
        <h2>The arm math (live)</h2>

        <h3>1. Link lengths and the Grashof check</h3>
        <p>Each link's length is just the distance between its two joints: √((x₂−x₁)² + (y₂−y₁)²).</p>
        <pre className="il-formula">
          {`ground   A–B = ${f2(L.ground)} in      driver   A–C = ${f2(L.driver)} in
follower B–D = ${f2(L.follower)} in      coupler  C–D = ${f2(L.coupler)} in

Grashof: shortest + longest ≤ the other two?   ${f2(sorted[0]!)} + ${f2(sorted[3]!)} = ${f2(sorted[0]! + sorted[3]!)}  vs  ${f2(sorted[1]!)} + ${f2(sorted[2]!)} = ${f2(sorted[1]! + sorted[2]!)}   →   ${analysis.grashof ? "yes" : "no"}`}
        </pre>
        <p className="muted">
          Grashof "yes" means the shortest link could spin all the way around. An intake only swings part of the way, so either answer can work; what
          matters is that it never hits a dead spot (section 4). A <b>parallelogram</b> (driver = follower and ground = coupler) keeps the plate's angle the same the
          whole way.
        </p>

        <h3>2. Gravity torque on the driver link (the "virtual work" trick)</h3>
        <p>
          In a 4-bar every part moves differently, so you can't just use weight × distance. Instead: turn the driver a tiny angle Δθ and see how far each
          part rises (Δy). The work gravity does has to equal torque × angle:
        </p>
        <pre className="il-formula">
          {`torque × Δθ = Σ (weight × Δy)     →     torque = Σ (weight × Δy) ÷ Δθ

worst angle ${f1(worst.driverDeg)}°:   gravity torque = ${f2(worst.torqueNm)} N·m   (${f1(worst.torqueNm * 8.8507)} in·lb)`}
        </pre>
        <p className="muted">The simulator does this at {analysis.samples.length} angles to draw the chart above. For a plain one-pivot arm it turns into the usual weight × distance × cos(angle).</p>

        <h3>3. Holding current</h3>
        <pre className="il-formula">
          {`torque at the motor = gravity torque ÷ (ratio × efficiency × motors) = ${f2(worst.torqueNm)} ÷ (${drive.ratio} × ${f2(drive.efficiency)} × ${drive.numMotors}) = ${f2(motorTorqueWorst)} N·m
current             = motor torque ÷ Kt = ${f2(motorTorqueWorst)} ÷ ${(kt * 1000).toFixed(1)} mN·m/A = ${f1(worst.currentA)} A   (stall ${motor.stallCurrentA} A, your limit ${drive.statorLimitA} A)`}
        </pre>
        <p className="muted">
          If this is a big part of your current limit, the arm will sag or move slowly there: raise the ratio, add a gas spring or surgical tubing to cancel some
          weight, or move the heavy parts closer to the pivots.
        </p>

        <h3>4. Dead spots (transmission angle)</h3>
        <p>
          The <b>transmission angle</b> is the angle between the coupler and the follower at D. At 90° the driver pushes the follower straight around. Near
          0° or 180° the links line up, the push goes straight into the pivot, and the linkage can lock or flip (a dead spot, also called toggle).
        </p>
        <pre className="il-formula">{`closest this linkage gets to lining up: ${analysis.minTransmissionDeg.toFixed(0)}°   (keep it above about 40°)`}</pre>

        <h3>5. How fast it moves</h3>
        <pre className="il-formula">
          {`top speed of the driver link = motor free speed ÷ ratio = ${motor.freeSpeedRPM} RPM ÷ ${drive.ratio} = ${f1(freeLinkDps)} °/s
swing from stowed to deployed = ${f1(sweepDeg)}°   →   at top speed ≈ ${f2(sweepDeg / freeLinkDps)} s (real: deploy ${f2(deploy.timeS)} s, stow ${f2(stow.timeS)} s with acceleration and gravity)
inertia at the driver (deployed) = Σ mass × (how far it moves per radian)² = ${f2(inertiaDeployed)} kg·m²
motion:  inertia × angular acceleration = motor torque × ratio × efficiency − gravity torque`}
        </pre>

        <h3>6. Does it fold up when it gets hit?</h3>
        <p>Same virtual-work trick: push the front roller straight back with 100 N and see which way the driver link wants to turn.</p>
        <pre className="il-formula">
          {`torque on the driver = push × (how far the front roller moves back per radian)
= ${f1(analysis.hitTorqueNm)} N·m ${analysis.hitTorqueNm > 0 ? "toward stowed  →  the intake folds up out of the way ✓" : "toward deployed  →  a hit drives the intake into the carpet ✗"}`}
        </pre>
        <p className="muted">
          With a low current limit while the intake sits deployed, a hit can push it up and the motor brings it back. That only works when this number points
          toward stowed. For a parallelogram it's the simple rule from the guide: pivot C above pivot A.
        </p>
      </div>
    </>
  );
}
