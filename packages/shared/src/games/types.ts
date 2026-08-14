/** A single segment of the match clock — auto, a teleop "shift", endgame, etc. */
export interface MatchPhase {
  id: string;
  label: string;
  durationSeconds: number;
  notes?: string;
}

/** A repeatable or one-time way to score, tagged to the mechanism types that produce it. */
export interface ScoringAction {
  id: string;
  label: string;
  description: string;
  pointsAuto?: number;
  pointsTeleop?: number;
  /** True for cycle-able actions (score a game piece repeatedly). False for one-time actions (climb). */
  cycleable: boolean;
  /** Mechanism library ids this action needs — drives the Mechanism Library's "relevant this year" tags. */
  mechanismTags: string[];
}

export interface RankingPointRule {
  id: string;
  label: string;
  description: string;
  points: number;
}

export interface FieldZone {
  id: string;
  label: string;
  description: string;
}

export interface GameBreakdown {
  year: number;
  gameName: string;
  theme: string;
  summary: string;
  matchDurationSeconds: number;
  phases: MatchPhase[];
  fieldZones: FieldZone[];
  scoringActions: ScoringAction[];
  rankingPoints: RankingPointRule[];
  notableRules: string[];
  /** Where this data came from and how confident to be in it — always show this to Michel. */
  sourceNote: string;
}
