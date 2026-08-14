import type { GameBreakdown } from "./types";

export const GAME_2026_REBUILT: GameBreakdown = {
  year: 2026,
  gameName: "REBUILT",
  theme: "presented by Haas",
  summary:
    "Two alliances shoot foam FUEL balls into their HUB and climb a 3-level TOWER before time runs out. " +
    "The twist: each alliance's HUB alternates between active and inactive through the match, based on how " +
    "well they did in autonomous — so cycle planning has to account for dead scoring windows, not just raw speed.",
  matchDurationSeconds: 160,
  phases: [
    { id: "auto", label: "Autonomous", durationSeconds: 20, notes: "Both HUBs active. Up to 2 robots can climb TOWER Level 1 for 15 pts each." },
    { id: "transition", label: "Transition Shift", durationSeconds: 10, notes: "Both HUBs active again — a brief window between auto and driver control." },
    { id: "shift1", label: "Shift 1", durationSeconds: 25, notes: "Only one alliance's HUB is active (the one that scored less FUEL in auto)." },
    { id: "shift2", label: "Shift 2", durationSeconds: 25, notes: "Active HUB flips to the other alliance." },
    { id: "shift3", label: "Shift 3", durationSeconds: 25, notes: "Flips again." },
    { id: "shift4", label: "Shift 4", durationSeconds: 25, notes: "Flips again." },
    { id: "endgame", label: "End Game", durationSeconds: 30, notes: "Both HUBs active again. Last chance to climb the TOWER." },
  ],
  fieldZones: [
    { id: "hub", label: "Hub", description: "Central goal each alliance shoots FUEL into. Scores when a ball passes the sensor array at the top opening." },
    { id: "tower", label: "Tower", description: "3-rung climbing structure. Robots earn points for how high their bumpers clear a rung, not just for touching it." },
    { id: "depot", label: "Depot", description: "Enclosed FUEL staging area near each alliance, ~24 FUEL per depot at match start." },
    { id: "outpost", label: "Outpost / Outpost Chute", description: "Human player station — a teammate feeds FUEL to robots from here without leaving the alliance area." },
    { id: "neutral-zone", label: "Neutral Zone", description: "Center of the field (~206in x 72in), holds the bulk of loose FUEL (360-408 pieces). Robots can collect here but cannot score from it." },
    { id: "alliance-area", label: "Alliance Area", description: "Behind the human-player starting line on each side." },
  ],
  scoringActions: [
    {
      id: "fuel-hub",
      label: "Score FUEL in HUB",
      description: "1 point per ball, in auto or teleop — but only while your alliance's HUB is active for that phase.",
      pointsAuto: 1,
      pointsTeleop: 1,
      cycleable: true,
      mechanismTags: ["intake", "indexer", "shooter"],
    },
    {
      id: "tower-l1",
      label: "Tower — Level 1",
      description: "Robot no longer touching carpet or tower base. Up to 2 robots can score this in auto (15 pts each); worth 10 pts in teleop.",
      pointsAuto: 15,
      pointsTeleop: 10,
      cycleable: false,
      mechanismTags: ["climber"],
    },
    {
      id: "tower-l2",
      label: "Tower — Level 2",
      description: "Bumpers fully above the LOW rung. Teleop/endgame only.",
      pointsTeleop: 20,
      cycleable: false,
      mechanismTags: ["climber"],
    },
    {
      id: "tower-l3",
      label: "Tower — Level 3",
      description: "Bumpers fully above the MID rung. Teleop/endgame only, hardest and highest-value climb.",
      pointsTeleop: 30,
      cycleable: false,
      mechanismTags: ["climber"],
    },
  ],
  rankingPoints: [
    { id: "win", label: "Win", description: "Won the match.", points: 3 },
    { id: "tie", label: "Tie", description: "Tied the match.", points: 1 },
    { id: "energized", label: "Energized RP", description: "Alliance scored 100+ FUEL in an active HUB over the match.", points: 1 },
    { id: "supercharged", label: "Supercharged RP", description: "Alliance scored 360+ FUEL in an active HUB over the match.", points: 1 },
    { id: "traversal", label: "Traversal RP", description: "Alliance earned 50+ TOWER points over the match.", points: 1 },
  ],
  notableRules: [
    "HUB activity alternates: whichever alliance scored MORE fuel in auto gets their HUB set inactive first for Shift 1, then it flips every shift. Both HUBs are always active during Auto, the Transition Shift, and End Game.",
    "A robot can earn TOWER points once in auto AND again in teleop, but only one level per period — no stacking multiple levels in the same period.",
    "Minor foul = 5 pts to the opponent, major foul = 15 pts.",
    "504 FUEL on the field per match (up to 600 at District Championships/FIRST Championship): ~48 preloaded across robots, the rest split between depots, outpost chutes, and the neutral zone.",
  ],
  sourceNote:
    "Compiled 2026-08-14 from public post-kickoff summaries (frcmanual.com, team community game breakdowns), " +
    "cross-checked for internal consistency (phase durations sum to the stated 2:40 match length). " +
    "Verify exact numbers against the official 2026 FIRST Robotics Competition Game Manual before locking in " +
    "robot decisions — this is a planning aid, not a rules authority.",
};
