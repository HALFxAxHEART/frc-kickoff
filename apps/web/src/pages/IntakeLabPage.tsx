import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  analyzeIntake,
  barContact,
  MOTOR_SPECS,
  ROLLER_SURFACES,
  simulateIntake,
  type GamePieceSpec,
  type IntakeBar,
  type IntakeOutcome,
  type RollerSurfaceId,
  type RollerSurfaceSpec,
} from "@frckickoff/shared";
import { IntakeCanvas } from "../features/intake-lab/IntakeCanvas";
import { IntakeMath } from "../features/intake-lab/IntakeMath";
import {
  activePiece,
  defaultLabState,
  loadLabState,
  N_TO_LBF,
  nextBarId,
  NPM_TO_LB_PER_IN,
  saveLabState,
  toConfig,
  type LabState,
} from "../features/intake-lab/labState";

const TUBE_SURFACES = ROLLER_SURFACES.filter((s) => s.kind === "tube");
const WHEEL_SURFACES = ROLLER_SURFACES.filter((s) => s.kind === "wheel");
const MAX_BARS = 8;
const SHORT_LABELS: Record<RollerSurfaceId, string> = {
  "poly-bare": "Bare poly",
  "poly-grip": "Poly + grip tape",
  "poly-silicone": "Poly + silicone",
  "compliant-wheel": "Compliant",
  "flex-wheel": "Flex",
  "stealth-wheel": "Stealth",
};
const PIECE_HARDNESS: { label: string; stiffnessNPerM: number }[] = [
  { label: "Hard (PVC, plastic)", stiffnessNPerM: 200000 },
  { label: "Medium (rubber ball)", stiffnessNPerM: 20000 },
  { label: "Soft (foam ball)", stiffnessNPerM: 6000 },
];

function outcomeText(o: IntakeOutcome): { text: string; good: boolean } {
  switch (o.kind) {
    case "in":
      return { text: `Pulled in! ${o.timeS.toFixed(2)} s from start`, good: true };
    case "stuck":
      return { text: `Stuck${o.nearBarId ? ` at ${o.nearBarId}` : ""}: the piece stopped moving in`, good: false };
    case "missed":
      return { text: "Never touched a roller: the piece just jammed against the bumper", good: false };
    case "thrown":
      return { text: "Thrown out: the rollers flung the piece away", good: false };
    case "timeout":
      return { text: "Didn't get in within 3 seconds", good: false };
  }
}

/** A number box that lets you type freely (e.g. "-" or "1.") and only commits real numbers. */
function Num({ value, onChange, step = 0.1, min, max, width }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; width?: string }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={text}
      style={width ? { width } : undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(v)) onChange(v);
      }}
    />
  );
}

export function IntakeLabPage() {
  const [state, setState] = useState<LabState>(loadLabState);
  const [focusBarId, setFocusBarId] = useState<string | null>(state.bars[0]?.id ?? null);
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [slowMo, setSlowMo] = useState(0.5);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => saveLabState(state), [state]);

  const config = useMemo(() => toConfig(state), [state]);
  const deferredConfig = useDeferredValue(config);
  const analysis = useMemo(() => analyzeIntake(config), [config]);
  const sim = useMemo(() => simulateIntake(deferredConfig), [deferredConfig]);
  const piece = activePiece(state);
  const outcome = outcomeText(sim.outcome);

  // Restart the animation whenever the result changes (but hold still while dragging).
  useEffect(() => {
    setFrameIndex(0);
    setPlaying(!dragging);
  }, [sim, dragging]);

  // Play back the recorded frames in (slowed-down) real time.
  const frameRef = useRef(0);
  frameRef.current = frameIndex;
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let acc = 0;
    let last: number | null = null;
    const lastIndex = sim.frames.length - 1;
    const tick = (now: number) => {
      if (last !== null) acc += ((now - last) / 1000) * slowMo * 120; // frames are recorded at 120 per sim-second
      last = now;
      const steps = Math.floor(acc);
      if (steps > 0) {
        acc -= steps;
        const next = Math.min(frameRef.current + steps, lastIndex);
        frameRef.current = next;
        setFrameIndex(next);
        if (next >= lastIndex) {
          setPlaying(false);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, slowMo, sim]);

  const update = (patch: Partial<LabState>) => setState((s) => ({ ...s, ...patch }));
  const updateBar = (id: string, patch: Partial<IntakeBar>) => setState((s) => ({ ...s, bars: s.bars.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  const updatePiece = (patch: Partial<GamePieceSpec>) =>
    setState((s) => ({ ...s, pieces: s.pieces.map((p) => (p.id === s.pieceId ? { ...p, ...patch } : p)) }));
  const updateSurface = (id: RollerSurfaceId, patch: Partial<RollerSurfaceSpec>) =>
    setState((s) => ({ ...s, surfaces: s.surfaces.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  function addBar() {
    if (state.bars.length >= MAX_BARS) return;
    const id = nextBarId(state.bars);
    const newBar: IntakeBar = { id, xIn: 8, yIn: 9, tubeOdIn: 2, tubeSurface: "poly-grip", wheelOdIn: 0, wheelSurface: "flex-wheel", ratio: 2, passes: "under" };
    setState((s) => ({ ...s, bars: [...s.bars, newBar] }));
    setFocusBarId(id);
  }

  function addPiece() {
    setState((s) => {
      const id = `custom-${Date.now()}`;
      const p: GamePieceSpec = { id, name: `My piece ${s.pieces.length + 1}`, diameterIn: 6, weightLb: 1, shape: "ball", stiffnessNPerM: 20000, carpetMu: 0.5 };
      return { ...s, pieces: [...s.pieces, p], pieceId: id };
    });
  }

  function removePiece() {
    setState((s) => {
      if (s.pieces.length <= 1) return s;
      const pieces = s.pieces.filter((p) => p.id !== s.pieceId);
      return { ...s, pieces, pieceId: pieces[0]?.id ?? s.pieceId };
    });
  }

  function resetAll() {
    if (!window.confirm("Reset the Intake Lab to the default coral intake? Your bars, pieces and surface numbers will be replaced.")) return;
    const fresh = defaultLabState();
    setState(fresh);
    setFocusBarId(fresh.bars[0]?.id ?? null);
  }

  const lastFrame = sim.frames[Math.min(frameIndex, sim.frames.length - 1)];

  return (
    <div className="intake-lab">
      <h1>Intake Lab</h1>
      <p className="lede">
        Build a roller intake in 2D and watch it try to pick up a game piece. Drag the bars and the piece around, change roller sizes, covers and
        speeds, and see right away whether the piece comes in, gets shoved away, or jams. Everything is saved in this browser. Pair it with the 5090
        guide <i>Build a 4-Bar Coral Intake</i>, and size the deploy linkage on{" "}
        <Link to="/simulate?tool=arm">Simulate › 4-Bar / Arm</Link>.
      </p>

      <div className="card il-stage">
        <div className="row-between il-toolbar">
          <span className={"badge " + (outcome.good ? "good" : "bad")}>{outcome.text}</span>
          <span className="muted il-stats">
            roller motor peak {(sim.peakMotorLoadFraction * 100).toFixed(0)}% of stall · slowest roller {(sim.minRollerSpeedFraction * 100).toFixed(0)}% speed ·
            biggest squeeze {(sim.peakBarForceN * N_TO_LBF).toFixed(0)} lbf
          </span>
        </div>
        <IntakeCanvas
          config={config}
          analysis={analysis}
          frames={sim.frames}
          frameIndex={frameIndex}
          focusBarId={focusBarId}
          onMoveBar={(id, xIn, yIn) => updateBar(id, { xIn, yIn })}
          onMovePieceStart={(xIn) => update({ pieceStartXIn: xIn })}
          onDragStateChange={setDragging}
        />
        <div className="il-playback">
          <button className="primary" onClick={() => (frameIndex >= sim.frames.length - 1 ? (setFrameIndex(0), setPlaying(true)) : setPlaying(!playing))}>
            {playing ? "Pause" : frameIndex >= sim.frames.length - 1 ? "Replay" : "Play"}
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(0, sim.frames.length - 1)}
            value={Math.min(frameIndex, sim.frames.length - 1)}
            onChange={(e) => {
              setPlaying(false);
              setFrameIndex(Number(e.target.value));
            }}
          />
          <span className="muted il-time">{(lastFrame?.t ?? 0).toFixed(2)} s</span>
          <select value={slowMo} onChange={(e) => setSlowMo(Number(e.target.value))} aria-label="Playback speed">
            <option value={0.1}>0.1× (super slow)</option>
            <option value={0.25}>0.25×</option>
            <option value={0.5}>0.5×</option>
            <option value={1}>1× real time</option>
          </select>
        </div>
        <p className="hint">
          Drag a bar to move it. Drag the faint circle on the carpet to change where the piece starts. Red arrows are the forces on the piece. The dashed
          circle and θ show where the selected bar first touches a piece on the carpet: green dot = it can grab, red dot = it will shove the piece away.
        </p>
      </div>

      <div className="card">
        <div className="row-between">
          <h2>Bars (rollers)</h2>
          <div className="il-buttons">
            <button onClick={addBar} disabled={state.bars.length >= MAX_BARS}>
              + Add bar
            </button>
            <button className="danger" onClick={resetAll}>
              Reset everything
            </button>
          </div>
        </div>
        <p className="muted">
          Each bar is a polycarbonate tube. You can slide wheels onto it: whichever is bigger touches the piece. "Under" = the piece goes under the bar (its
          bottom spins toward the robot). "Over" = the piece rides over it (its top spins toward the robot). x is inches in front of the frame perimeter
          (negative = inside the robot), y is inches above the carpet. Click a row to see its math below.
        </p>
        <div className="il-table-wrap">
          <table className="il-table">
            <thead>
              <tr>
                <th>Bar</th>
                <th>x (in)</th>
                <th>y (in)</th>
                <th>Tube OD</th>
                <th>Tube cover</th>
                <th title="0 = no wheels">Wheels OD</th>
                <th>Wheel type</th>
                <th>Ratio</th>
                <th>Piece goes</th>
                <th>Surface speed</th>
                <th>First touch</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.bars.map((b) => {
                const a = analysis.bars.find((x) => x.id === b.id);
                const th = a?.firstTouchAngleDeg ?? null;
                const grabs = a && th !== null && th >= a.minGrabAngleDeg;
                return (
                  <tr key={b.id} className={b.id === focusBarId ? "selected" : ""} onClick={() => setFocusBarId(b.id)}>
                    <td>
                      <b>{b.id}</b>
                    </td>
                    <td>
                      <Num value={b.xIn} onChange={(v) => updateBar(b.id, { xIn: v })} width="4.6em" />
                    </td>
                    <td>
                      <Num value={b.yIn} onChange={(v) => updateBar(b.id, { yIn: v })} min={0} width="4.6em" />
                    </td>
                    <td>
                      <select value={b.tubeOdIn} onChange={(e) => updateBar(b.id, { tubeOdIn: Number(e.target.value) })}>
                        {[1.125, 1.5, 1.875, 2, 2.5].map((d) => (
                          <option key={d} value={d}>
                            {d} in
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select value={b.tubeSurface} onChange={(e) => updateBar(b.id, { tubeSurface: e.target.value as RollerSurfaceId })}>
                        {TUBE_SURFACES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {SHORT_LABELS[s.id]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Num value={b.wheelOdIn} onChange={(v) => updateBar(b.id, { wheelOdIn: Math.max(0, v) })} min={0} step={0.5} width="4.4em" />
                    </td>
                    <td>
                      <select value={b.wheelSurface} disabled={b.wheelOdIn <= 0} onChange={(e) => updateBar(b.id, { wheelSurface: e.target.value as RollerSurfaceId })}>
                        {WHEEL_SURFACES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {SHORT_LABELS[s.id]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Num value={b.ratio} onChange={(v) => updateBar(b.id, { ratio: Math.max(0.1, v) })} min={0.1} step={0.25} width="4.2em" />
                    </td>
                    <td>
                      <select value={b.passes} onChange={(e) => updateBar(b.id, { passes: e.target.value === "over" ? "over" : "under" })}>
                        <option value="under">under</option>
                        <option value="over">over</option>
                      </select>
                    </td>
                    <td className="il-num">
                      {a ? `${a.surfaceSpeedFtPerSec.toFixed(1)} ft/s · ${a.speedRatioToDrive.toFixed(1)}×` : ""}
                    </td>
                    <td className="il-num">
                      {th === null ? (
                        <span className="muted">doesn't touch</span>
                      ) : b.passes === "over" ? (
                        <span className="muted">{th.toFixed(0)}° (lifts)</span>
                      ) : (
                        <span className={grabs ? "il-ok" : "il-bad"}>
                          {th.toFixed(0)}° {grabs ? "grabs" : `< ${a?.minGrabAngleDeg.toFixed(0)}° shoves`}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        title={`Remove ${b.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setState((s) => ({ ...s, bars: s.bars.filter((x) => x.id !== b.id) }));
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {analysis.gaps.length > 0 && (
          <p className="muted">
            Pinch points:{" "}
            {analysis.gaps
              .map((g) => `${g.fromId}↔${g.toId} gap ${g.gapIn.toFixed(2)} in (${g.squishIn > 0 ? `squish ${g.squishIn.toFixed(2)} in` : "doesn't squeeze"})`)
              .join(" · ")}
          </p>
        )}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="row-between">
            <h2>Game piece</h2>
            <div className="il-buttons">
              <button onClick={addPiece}>+ Add piece</button>
              <button className="danger" onClick={removePiece} disabled={state.pieces.length <= 1}>
                Delete
              </button>
            </div>
          </div>
          <div className="field">
            <label>Piece to test</label>
            <select value={state.pieceId} onChange={(e) => update({ pieceId: e.target.value })}>
              {state.pieces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.diameterIn} in)
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Name</label>
              <input value={piece.name} onChange={(e) => updatePiece({ name: e.target.value })} />
            </div>
            <div className="field">
              <label>Diameter (in)</label>
              <Num value={piece.diameterIn} onChange={(v) => updatePiece({ diameterIn: Math.min(30, Math.max(0.5, v)) })} min={0.5} step={0.25} />
            </div>
            <div className="field">
              <label>Weight (lb)</label>
              <Num value={piece.weightLb} onChange={(v) => updatePiece({ weightLb: Math.max(0.05, v) })} min={0.05} step={0.1} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Shape (side view is a circle either way)</label>
              <select value={piece.shape} onChange={(e) => updatePiece({ shape: e.target.value === "tube" ? "tube" : "ball" })}>
                <option value="tube">Tube / pipe (like coral)</option>
                <option value="ball">Ball</option>
              </select>
            </div>
            <div className="field">
              <label>How hard is it?</label>
              <select value={piece.stiffnessNPerM} onChange={(e) => updatePiece({ stiffnessNPerM: Number(e.target.value) })}>
                {PIECE_HARDNESS.map((h) => (
                  <option key={h.stiffnessNPerM} value={h.stiffnessNPerM}>
                    {h.label}
                  </option>
                ))}
                {!PIECE_HARDNESS.some((h) => h.stiffnessNPerM === piece.stiffnessNPerM) && (
                  <option value={piece.stiffnessNPerM}>Custom ({piece.stiffnessNPerM} N/m)</option>
                )}
              </select>
            </div>
            <div className="field">
              <label>Carpet friction μ</label>
              <Num value={piece.carpetMu} onChange={(v) => updatePiece({ carpetMu: Math.max(0, v) })} min={0} step={0.05} />
            </div>
          </div>
          <p className="muted">
            Coral (2025): 4.5 in across, 11-7/8 in long, 1.1–1.8 lb. Cargo (2022): a 9.5 in ball. Add your own for any game.
          </p>
        </div>

        <div className="card">
          <h2>Robot and roller motor</h2>
          <div className="field-row">
            <div className="field">
              <label>Driving speed into the piece (ft/s)</label>
              <Num value={state.driveSpeedFtPerSec} onChange={(v) => update({ driveSpeedFtPerSec: Math.max(0, v) })} min={0} step={0.5} />
            </div>
            <div className="field">
              <label>Piece starts at x (in)</label>
              <Num value={state.pieceStartXIn} onChange={(v) => update({ pieceStartXIn: v })} step={0.5} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Roller motor (all bars are belted to it)</label>
              <select value={state.rollerMotorId} onChange={(e) => update({ rollerMotorId: e.target.value })}>
                {MOTOR_SPECS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Roller output (%)</label>
              <Num value={Math.round(state.rollerOutput * 100)} onChange={(v) => update({ rollerOutput: Math.min(1, Math.max(0, v / 100)) })} min={0} max={100} step={5} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Bumper depth (in)</label>
              <Num value={state.bumper.depthIn} onChange={(v) => update({ bumper: { ...state.bumper, depthIn: Math.max(0.5, v) } })} min={0.5} step={0.25} />
            </div>
            <div className="field">
              <label>Bumper bottom (in)</label>
              <Num value={state.bumper.bottomIn} onChange={(v) => update({ bumper: { ...state.bumper, bottomIn: Math.max(0, v) } })} min={0} step={0.25} />
            </div>
            <div className="field">
              <label>Bumper top (in)</label>
              <Num value={state.bumper.topIn} onChange={(v) => update({ bumper: { ...state.bumper, topIn: Math.max(state.bumper.bottomIn + 0.5, v) } })} step={0.25} />
            </div>
          </div>
          <p className="muted">Check bumper heights in the current year's game manual. The robot drives forward; in the picture the carpet slides toward the robot instead (same physics).</p>
        </div>
      </div>

      <IntakeMath config={config} analysis={analysis} sim={sim} focusBarId={focusBarId} />

      <div className="card">
        <div className="row-between">
          <h2>Surfaces (roller covers and wheels)</h2>
          <button onClick={() => update({ surfaces: ROLLER_SURFACES.map((s) => ({ ...s })) })}>Reset to estimates</button>
        </div>
        <p className="muted">
          These grip (μ) and stiffness numbers are <b>estimates</b> against smooth plastic pieces. Measure your own μ with the tilt test (section 6 above)
          and type it in. Stiffness is how hard it pushes back per inch of squish.
        </p>
        <div className="il-table-wrap">
          <table className="il-table">
            <thead>
              <tr>
                <th>Surface</th>
                <th>Grip μ</th>
                <th>Min grab angle</th>
                <th>Stiffness (lb per in of squish)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {state.surfaces.map((s) => (
                <tr key={s.id}>
                  <td>{s.label}</td>
                  <td>
                    <Num value={s.mu} onChange={(v) => updateSurface(s.id, { mu: Math.min(3, Math.max(0.05, v)) })} min={0.05} step={0.05} width="5em" />
                  </td>
                  <td className="il-num">{((Math.atan(1 / s.mu) * 180) / Math.PI).toFixed(0)}°</td>
                  <td>
                    <Num
                      value={Math.round(s.stiffnessNPerM * NPM_TO_LB_PER_IN)}
                      onChange={(v) => updateSurface(s.id, { stiffnessNPerM: Math.max(1, v) / NPM_TO_LB_PER_IN })}
                      min={1}
                      step={1}
                      width="6em"
                    />
                  </td>
                  <td className="muted">{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="source-note">
        How the simulator works: the piece is a circle with mass, spin and gravity. Where it overlaps the carpet, the bumper or a bar, a stiff spring pushes
        it back out (the squish), and friction up to μ × that push drags its surface toward the other surface's speed. The roller motor slows down along its
        torque-speed line as the load goes up. It's a teaching model: real pieces are 3D, wheels deflect unevenly, and grip changes with wear and dust.
        Use it to understand <i>why</i> a layout works, then prove it with a wood prototype. Contact radius per bar = the bigger of tube and wheels (
        {config.bars.map((b) => `${b.id} ${(barContact(b, config.surfaces).radiusIn * 2).toFixed(2)} in`).join(", ")}).
      </p>
    </div>
  );
}
