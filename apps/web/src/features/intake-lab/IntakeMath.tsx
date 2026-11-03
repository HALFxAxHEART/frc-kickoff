import { barContact, getMotor, type IntakeAnalysis, type IntakeLabConfig, type IntakeSimResult } from "@frckickoff/shared";
import { N_TO_LBF } from "./labState";

interface IntakeMathProps {
  config: IntakeLabConfig;
  analysis: IntakeAnalysis;
  sim: IntakeSimResult;
  focusBarId: string | null;
}

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);
const deg = (rad: number) => (rad * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

/** The "why" behind every number on the page, worked out live with the current setup's numbers. */
export function IntakeMath({ config, analysis, sim, focusBarId }: IntakeMathProps) {
  const bar = config.bars.find((b) => b.id === focusBarId) ?? config.bars[0];
  const a = bar ? analysis.bars.find((x) => x.id === bar.id) : undefined;
  if (!bar || !a) return <div className="card">Add a bar to see the math.</div>;

  const motor = getMotor(config.rollerMotorId);
  const rp = config.piece.diameterIn / 2;
  const R = a.contactDiameterIn / 2;
  const mu = a.surface.mu;
  const D = a.contactDiameterIn;
  const motorRpm = motor.freeSpeedRPM * config.rollerOutput;
  const driveInS = config.driveSpeedFtPerSec * 12;
  const targetRatioFor2x = (Math.PI * D * motorRpm) / 60 / Math.max(2 * driveInS, 1e-6);
  const squishGuess = a.surface.kind === "wheel" ? 0.5 : 0.15;
  const heightAt50 = rp + (rp + R - squishGuess) * Math.sin(rad(50));
  const heightAtMin = rp + (rp + R - squishGuess) * Math.sin(rad(Math.min(a.minGrabAngleDeg + 5, 85)));
  const th = a.firstTouchAngleDeg;
  const pinch = analysis.gaps.find((g) => g.fromId === bar.id || g.toId === bar.id);
  const pinchForceN = pinch && pinch.squishIn > 0 ? pinch.squishIn * 0.0254 * (1 / (1 / a.surface.stiffnessNPerM + 1 / config.piece.stiffnessNPerM)) : 0;
  const stallNm = motor.stallTorqueNm;
  const kt = motor.stallTorqueNm / motor.stallCurrentA;
  // No pinch for this bar? Use the biggest push the simulator actually saw on it instead.
  const simPushN = sim.peakForceByBarN[bar.id] ?? 0;
  const pushN = pinchForceN > 0 ? pinchForceN : simPushN;
  const pullN = mu * pushN;
  const barTorqueNm = pullN * R * 0.0254;
  const motorTorqueNm = barTorqueNm / Math.max(bar.ratio, 1e-6);

  return (
    <div className="card il-math">
      <h2>The math (live, using bar {bar.id})</h2>
      <p className="muted">
        Pick a bar in the table to see its numbers here. All of this is plain geometry, friction, and gearing: no magic. The
        simulator above does the same math thousands of times per second.
      </p>

      <h3>1. How fast is the roller surface moving?</h3>
      <p>
        A roller's <b>surface speed</b> is how far its outside travels each second: one turn moves it one circumference (π × diameter).
      </p>
      <pre className="il-formula">
        {`bar RPM        = motor RPM × output ÷ ratio = ${motor.freeSpeedRPM} × ${f2(config.rollerOutput)} ÷ ${bar.ratio} = ${a.freeRpm.toFixed(0)} RPM
surface speed  = π × D × RPM ÷ 60         = π × ${f2(D)} in × ${a.freeRpm.toFixed(0)} ÷ 60 = ${f1(a.surfaceSpeedFtPerSec * 12)} in/s = ${f1(a.surfaceSpeedFtPerSec)} ft/s
vs. driving    = ${f1(a.surfaceSpeedFtPerSec)} ÷ ${f1(config.driveSpeedFtPerSec)} ft/s = ${f1(a.speedRatioToDrive)}×   (want 2× or more on the front bar)`}
      </pre>
      <p>
        To hit exactly 2× your drive speed with this motor and a {f2(D)} in roller, the ratio would be about <b>{f1(targetRatioFor2x)}:1</b>. (That's
        free speed: under load a motor runs slower, so round the ratio down a little.)
      </p>

      <h3>2. Will the roller grab the piece, or shove it away?</h3>
      <p>
        Where the roller touches the piece, it pushes two ways. The <b>normal force N</b> pushes straight along the line between the two centers: that
        shoves the piece <i>away</i>. <b>Friction</b> (up to μ × N) pushes along the surface in the direction the roller spins: that pulls the piece{" "}
        <i>in</i>. Call θ the angle of the center-to-center line above level.
      </p>
      <pre className="il-formula">
        {`push away = N × cos θ
pull in   = μ × N × sin θ
pull in wins when  μ × sin θ > cos θ   →   tan θ > 1 ÷ μ   →   θ > atan(1 ÷ μ)

${a.surface.label}: μ ≈ ${f2(mu)}   →   θ must be more than atan(1 ÷ ${f2(mu)}) = ${f1(a.minGrabAngleDeg)}°`}
      </pre>
      <p>
        N cancels out! Squeezing harder doesn't fix a bad angle; only <b>more grip (μ)</b> or a <b>higher contact point (θ)</b> does. That's why bare
        polycarb (μ ≈ 0.3 → needs θ &gt; 73°) is a bad grabbing roller, and grip tape (μ ≈ 0.9 → θ &gt; 48°) is a good one.
      </p>
      {bar.passes === "over" && (
        <p className="il-callout">
          {bar.id} is an <b>"over"</b> bar: the piece rides <i>over</i> it, so its front face moves <b>up</b>. When the piece gets pushed into it (by
          the carpet as you drive, or by an "under" bar above), friction on that face lifts the piece. Low "over" bars in front of the bumper are how a
          piece shorter than the bumper gets lifted up and over it. The grab-angle rule below is for "under" bars.
        </p>
      )}
      {analysis.shape.kind === "box" && (
        <p className="il-callout">
          The piece is <b>{analysis.shape.hx > analysis.shape.hy ? "pointing at the robot" : "standing on end"}</b>, so from the side it's a{" "}
          {f2(analysis.shape.hx * 2)} in × {f2(analysis.pieceHeightIn)} in rectangle, not a circle. A roller now meets its <b>top front corner</b> (or, if the
          roller is lower than the top, its flat end face square on, θ = 0°, which can only shove). Same rule, new geometry: θ is the angle from that corner
          up to the roller's center. Watch which bar actually does the work in the animation: often it's a low "over" bar lifting the front end, not the
          front roller.
        </p>
      )}
      <pre className="il-formula">
        {th === null
          ? `${bar.id} never touches a ${f2(analysis.pieceHeightIn)} in tall piece sliding along the carpet (it's too high). It can still help once the piece is lifted.`
          : analysis.shape.kind === "circle"
            ? `first touch, piece on the carpet:  sin θ = (bar height − piece radius) ÷ (piece radius + bar radius)
                                   sin θ = (${f2(bar.yIn)} − ${f2(rp)}) ÷ (${f2(rp)} + ${f2(R)}) = ${f2(Math.sin(rad(th)))}   →   θ = ${f1(th)}°
${th >= a.minGrabAngleDeg ? `${f1(th)}° > ${f1(a.minGrabAngleDeg)}°  ✓  this bar can grab the piece` : `${f1(th)}° < ${f1(a.minGrabAngleDeg)}°  ✗  this bar will shove the piece away (raise it, or add grip)`}`
            : bar.yIn <= analysis.pieceHeightIn
              ? `bar height ${f2(bar.yIn)} in ≤ piece height ${f2(analysis.pieceHeightIn)} in  →  it hits the flat end face square on (θ = 0°)  ✗  it can only shove`
              : `first touch, top front corner:  sin θ = (bar height − piece height) ÷ bar radius
                                sin θ = (${f2(bar.yIn)} − ${f2(analysis.pieceHeightIn)}) ÷ ${f2(R)} = ${f2(Math.sin(rad(th)))}   →   θ = ${f1(th)}°
${th >= a.minGrabAngleDeg ? `${f1(th)}° > ${f1(a.minGrabAngleDeg)}°  ✓  this bar can grab the corner` : `${f1(th)}° < ${f1(a.minGrabAngleDeg)}°  ✗  this bar will shove it (needs a bar height between ${f2(analysis.pieceHeightIn + R * Math.sin(rad(a.minGrabAngleDeg)))} and ${f2(analysis.pieceHeightIn + R)} in)`}`}
      </pre>

      <h3>3. How high should the front roller's axle be?</h3>
      <p>Turn the formula around to find the height for an angle you pick. "Squish" is how far the roller sinks into the piece.</p>
      <pre className="il-formula">
        {`axle height = piece radius + (piece radius + roller radius − squish) × sin θ
at θ = 50°:   ${f2(rp)} + (${f2(rp)} + ${f2(R)} − ${f2(squishGuess)}) × ${f2(Math.sin(rad(50)))} = ${f2(heightAt50)} in
just above the minimum (θ = ${f1(Math.min(a.minGrabAngleDeg + 5, 85))}°): ${f2(heightAtMin)} in`}
      </pre>

      <h3>4. Squish and squeeze</h3>
      <p>
        Squish makes grip. A soft wheel squishes a lot with little force; a polycarb tube barely squishes and pushes back hard. The push is roughly{" "}
        <b>stiffness × squish</b> (a spring), and friction can then pull up to μ × that.
      </p>
      <pre className="il-formula">
        {pinch
          ? `pinch between ${pinch.fromId} and ${pinch.toId}:
gap      = center distance − both radii = ${f2(pinch.gapIn)} in
squish   = piece diameter − gap = ${f2(config.piece.diameterIn)} − ${f2(pinch.gapIn)} = ${f2(pinch.squishIn)} in
${
              pinch.squishIn > 0
                ? `squeeze  ≈ stiffness × squish ≈ ${pinchForceN.toFixed(0)} N (${(pinchForceN * N_TO_LBF).toFixed(0)} lbf)
max pull ≈ μ × squeeze ≈ ${pullN.toFixed(0)} N (${(pullN * N_TO_LBF).toFixed(0)} lbf)`
                : `negative squish: the piece fits through without touching both bars, so this pair can't grip it`
            }`
          : `${bar.id} doesn't form a pinch with an opposite bar. (A pinch is an "under" bar and an "over" bar the piece squeezes between.)`}
      </pre>
      <p className="muted">
        Starting point for compliant wheels: about 1/2 in of squish (what 2025 teams 4795 and 9280 landed on for coral). Polycarb tubes are stiffer, so the
        same squish squeezes harder; how much depends on the tube's wall and how far apart its bearings are. Too little squeeze and the piece slips back
        out; too much and the roller motor bogs down. Try both here, then prove it on a prototype.
      </p>

      <h3>5. Can the roller motor keep up?</h3>
      <pre className="il-formula">
        {`push on ${bar.id}       ≈ ${pushN.toFixed(0)} N (${pinchForceN > 0 ? "from the pinch above" : "biggest push in the simulation"})   →   pull ≤ μ × push = ${f2(mu)} × ${pushN.toFixed(0)} = ${pullN.toFixed(0)} N
torque on the bar   = pull × bar radius = ${pullN.toFixed(0)} N × ${f2(R * 0.0254)} m = ${f2(barTorqueNm)} N·m
torque at the motor = bar torque ÷ ratio = ${f2(barTorqueNm)} ÷ ${bar.ratio} = ${f2(motorTorqueNm)} N·m   (stall: ${f2(stallNm)} N·m)
current             ≈ torque ÷ Kt = ${f2(motorTorqueNm)} ÷ ${(kt * 1000).toFixed(1)} mN·m/A ≈ ${(motorTorqueNm / kt).toFixed(0)} A
simulator: peak roller load ${(sim.peakMotorLoadFraction * 100).toFixed(0)}% of stall, slowest roller speed ${(sim.minRollerSpeedFraction * 100).toFixed(0)}% of free speed`}
      </pre>
      <p className="muted">A motor's speed drops in a straight line as torque goes up: at 50% of stall torque it runs at 50% of its free speed.</p>

      <h3>6. Measure μ yourself (the tilt test)</h3>
      <p>
        The μ values here are estimates. Measure yours: lay a strip of your roller material (grip-taped poly, a flat of silicone, a wheel's tread) on a
        board, set the game piece on it, and slowly tilt the board until the piece starts to slide (not roll: hold it so it can't roll).
      </p>
      <pre className="il-formula">{`μ = tan(tilt angle)        e.g. slides at 42°  →  μ = tan 42° = ${f2(Math.tan(rad(42)))}`}</pre>
      <p className="muted">
        Put your measured μ in the Surfaces table below and every number on this page updates. Angle check: atan(1 ÷ {f2(mu)}) = {f1(deg(Math.atan(1 / mu)))}°.
      </p>
      <p className="muted">
        Contact radius used for {bar.id}: {f2(barContact(bar, config.surfaces).radiusIn)} in ({bar.wheelOdIn > bar.tubeOdIn ? "the wheels stick out past the tube" : "the tube itself"}).
      </p>
    </div>
  );
}
