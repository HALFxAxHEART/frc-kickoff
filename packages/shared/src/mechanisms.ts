export interface MechanismVariant {
  id: string;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
}

export interface MechanismExample {
  label: string;
  note: string;
}

export interface MechanismCategory {
  id: string;
  label: string;
  summary: string;
  variants: MechanismVariant[];
  /** Questions worth answering at kickoff before committing to this mechanism. */
  designQuestions: string[];
  examples: MechanismExample[];
}

/**
 * General-purpose FRC mechanism reference — not tied to a specific year. A game's scoring
 * actions tag which of these are relevant (see ScoringAction.mechanismTags in games/types.ts).
 * Examples below name well-established FRC archetypes/teams, kept intentionally general —
 * treat as a starting point for film study, not a citation.
 */
export const MECHANISM_LIBRARY: MechanismCategory[] = [
  {
    id: "intake",
    label: "Intakes",
    summary: "Whatever gets a game piece off the field and into the robot. Usually the single biggest lever on cycle time — a slow or unreliable intake caps everything downstream.",
    variants: [
      {
        id: "over-bumper-roller",
        label: "Over-the-bumper roller",
        description: "Compliant wheels/rollers mounted above bumper height, pull the piece up and over into the robot.",
        pros: ["Doesn't need a bumper cutout", "Simple geometry, easy to prototype fast", "Usually tolerant of piece position/rotation"],
        cons: ["Higher pickup point can be slower to align to a piece on the carpet", "Compliant wheels wear out over a season"],
      },
      {
        id: "under-bumper",
        label: "Under-the-bumper (ground) intake",
        description: "Intake rollers/belts sit low, close to the carpet, often behind a bumper cutout, so the robot can drive straight over a piece to collect it.",
        pros: ["Fastest pickup — often no fine alignment needed, just drive over it", "Piece is low and central, easy hand-off to an indexer"],
        cons: ["Needs a bumper cutout (rules/robustness tradeoff)", "More vulnerable to damage from defense/collisions"],
      },
      {
        id: "claw-clamp",
        label: "Claw / clamp",
        description: "A pincer or clamping end-effector that grips a piece directly, often on an arm.",
        pros: ["Very secure hold once gripped — good for pieces that need controlled placement, not just scoring by volume", "Works well for oddly-shaped or rigid pieces"],
        cons: ["Slower cycle — needs precise alignment to grip", "More failure points (grip sensors, pneumatics/motors for open-close)"],
      },
      {
        id: "vacuum",
        label: "Vacuum / suction",
        description: "Fans or pumps create suction to grab a piece on contact.",
        pros: ["Very fast, forgiving pickup — minimal alignment needed", "Can hold a piece against an odd surface"],
        cons: ["Power-hungry, adds weight (pumps/fans)", "Seal/reliability risk — a punctured or dirty piece can break the seal"],
      },
    ],
    designQuestions: [
      "How precisely does the drive team need to align to the piece — drive-over-it forgiving, or does it need a controlled approach?",
      "Does the piece need to be re-oriented on the way in, or does the indexer handle that?",
      "What's the realistic time from 'piece visible' to 'piece secured in robot' — that's your pickup-time input for the cycle calculator.",
      "How does this survive contact — bumping a defender, or a piece jamming halfway in?",
    ],
    examples: [
      { label: "Under-bumper roller intakes", note: "The dominant archetype for ground game pieces since the mid-2010s (cubes, cones, notes, coral) — teams like 254 and 1678 are consistently cited for making these both fast and robust." },
      { label: "Claw/clamp end-effectors", note: "Common wherever precise placement matters more than raw speed, e.g. 2023 Charged Up cone scoring." },
    ],
  },
  {
    id: "indexer",
    label: "Indexers",
    summary: "Moves and holds pieces inside the robot between intake and the scoring mechanism. Often invisible in game highlight reels but is where most jams and cycle-time losses actually happen.",
    variants: [
      {
        id: "belt-serializer",
        label: "Belt/roller serializer",
        description: "Belts or rollers carry pieces along a channel, usually single-filing multiple pieces toward the shooter/scorer.",
        pros: ["Handles multiple pieces in queue — good if the game rewards carrying capacity", "Straightforward to tune speed to match shooter feed rate"],
        cons: ["Jams are the #1 failure mode — needs sensors/vision or a manual unjam plan", "Adds length/weight to the robot"],
      },
      {
        id: "hopper-funnel",
        label: "Hopper / funnel",
        description: "A passive or lightly-agitated bin that funnels pieces down to a single feed point by gravity.",
        pros: ["Fewer moving parts than a belt system", "Naturally buffers pieces without active control"],
        cons: ["Can bridge/jam with certain piece shapes", "Less precise about feed timing"],
      },
      {
        id: "direct-feed",
        label: "Direct feed (no indexer)",
        description: "Intake feeds straight into the shooter/scoring mechanism — no intermediate storage.",
        pros: ["Simplest, lightest, fewest failure points", "Fastest single-piece cycle — no hand-off delay"],
        cons: ["Zero buffer — can't intake while scoring", "Bad fit if the game rewards holding multiple pieces at once"],
      },
    ],
    designQuestions: [
      "Does this year's game reward holding multiple pieces at once, or is one-at-a-time scoring competitive?",
      "What happens when a piece jams mid-match — can a driver clear it without a pit visit?",
      "Does the indexer need to track how many pieces it's holding (sensors) for driver feedback or auto-aim logic?",
    ],
    examples: [
      { label: "Belt serializers for high-capacity games", note: "Common in games with lots of small game pieces on the field at once (e.g. 2022 Rapid React cargo, 2024 Crescendo notes)." },
      { label: "Direct-feed, no indexer", note: "Common when the scoring cycle is already fast and simple — adding an indexer would just add mass and failure points." },
    ],
  },
  {
    id: "shooter",
    label: "Shooters / Launchers",
    summary: "Scores a piece from a distance instead of driving it to the goal directly. Trades mechanical complexity for cycle-time and positioning flexibility.",
    variants: [
      {
        id: "flywheel",
        label: "Flywheel (spinning wheel launcher)",
        description: "One or two spinning wheels fling the piece toward the goal at a fixed or variable angle/speed.",
        pros: ["Very fast cycle once spun up — no aiming mechanism needed beyond drivetrain heading", "Well-understood, lots of prior art to learn from"],
        cons: ["Accuracy depends on consistent piece compression/spin-up time", "Usually needs a hood/turret for variable distance, adding complexity"],
      },
      {
        id: "turret",
        label: "Turret-mounted shooter",
        description: "A flywheel or launcher on a rotating turret, often paired with vision tracking, so the drivetrain doesn't need to face the goal to score.",
        pros: ["Can shoot on the move — huge cycle-time win if the field layout rewards it", "Decouples aiming from driving, easier for the driver"],
        cons: ["Significant added complexity (rotation control, wiring through a rotating joint, vision)", "More that can go wrong under time pressure"],
      },
      {
        id: "catapult",
        label: "Catapult / flipper",
        description: "A spring, pneumatic, or motor-driven arm flings the piece in one motion rather than a continuous spin-up.",
        pros: ["Simple, robust, few tuning variables once dialed in", "Low continuous power draw"],
        cons: ["Slow cycle — usually one shot at a time with a reset/recharge delay", "Harder to vary distance/power on the fly"],
      },
    ],
    designQuestions: [
      "Does the game's point structure reward shooting from a distance, or is it just as good to drive up and place the piece?",
      "How much does accuracy degrade with distance, and is that a driver skill problem or a mechanical one?",
      "What's the realistic spin-up/reset time between shots — that's a direct input to the cycle calculator.",
    ],
    examples: [
      { label: "Two-wheel flywheels", note: "Became the standard high-goal shooter archetype in 2022 Rapid React — widely copied because of the speed/accuracy tradeoff being well understood." },
      { label: "Swerve + turret combo", note: "Teams like 254, 1678, and 2910 are frequently cited for pairing swerve drive with a vision-tracked turret to shoot while moving." },
    ],
  },
  {
    id: "climber",
    label: "Climbers",
    summary: "One-time endgame mechanism, not a repeated cycle — but often worth as many points as several fuel/game-piece cycles combined, so it's a real build-vs-buy tradeoff against more intake/scoring polish.",
    variants: [
      {
        id: "telescoping-elevator",
        label: "Telescoping / elevator climber",
        description: "A vertical stage (often on the same elevator used for scoring) extends up to hook or reach a climbing structure.",
        pros: ["Can reuse the scoring elevator's motors/structure — less added weight", "Scales naturally to multi-level climbs"],
        cons: ["Tall stowed height can be a packaging/stability problem", "Elevator failure late in a match loses both scoring and climbing"],
      },
      {
        id: "winch-hook",
        label: "Winch + static hook",
        description: "A fixed hook engages a bar/rung, then a winch pulls the robot up.",
        pros: ["Mechanically simple and very reliable once the hook is engaged", "Independent of the scoring mechanism — one failure doesn't take out the other"],
        cons: ["Needs precise driver positioning to engage the hook", "Slow — winching up takes real time, budget it in endgame planning"],
      },
      {
        id: "pneumatic-piston",
        label: "Pneumatic piston climb",
        description: "Compressed air pistons extend to push/pull the robot up in one fast motion.",
        pros: ["Very fast once triggered", "Simple control (just a solenoid), low code complexity"],
        cons: ["Limited by air budget (compressor/tank size) — usually a one-shot mechanism", "Less controllable mid-climb than a motor-driven system"],
      },
      {
        id: "passive-park",
        label: "Passive park / no climb",
        description: "Skip climbing — just get to the required zone for a smaller guaranteed points.",
        pros: ["Zero added mechanism, weight, or failure risk", "Guaranteed points if the zone is easy to reach"],
        cons: ["Leaves significant points on the table if climbing pays much more (check this year's point table)", "Can lose a tiebreaker/ranking point that requires actual climb points"],
      },
    ],
    designQuestions: [
      "How many points is the highest climb level worth vs. how many extra scoring cycles that time/weight budget could buy instead?",
      "How long does a full climb actually take in practice, including alignment — does it fit the endgame window with margin for a bad approach?",
      "What happens if the climb fails halfway — does the robot fall, foul, or just fail to score (no penalty)?",
      "Does this need to work with a partner robot also climbing at the same time/structure?",
    ],
    examples: [
      { label: "Telescoping elevator reuse", note: "Common when a game's scoring mechanism is already an elevator (e.g. 2023 Charged Up, 2025 Reefscape) — climbing becomes almost free." },
      { label: "Winch + hook endgame", note: "A long-running FRC archetype (2018 Power Up climb, 2020/2025 style bar climbs) valued for reliability over speed." },
    ],
  },
];

export function getMechanismCategory(id: string): MechanismCategory | undefined {
  return MECHANISM_LIBRARY.find((m) => m.id === id);
}
