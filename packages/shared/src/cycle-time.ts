/** One phase of a robot's repeated scoring loop, in seconds. Any phase can be 0 if it doesn't apply. */
export interface CyclePhaseTimes {
  travelToPickupSeconds: number;
  pickupSeconds: number;
  travelToScoreSeconds: number;
  scoreSeconds: number;
  /** Extra seconds tacked on for misses/jams/re-tries — a flat buffer, not a probability model. */
  errorMarginSeconds: number;
}

export interface CycleTimeResult {
  cycleSeconds: number;
  cyclesAvailable: number;
  piecesScored: number;
  pointsScored: number;
}

export function totalCycleSeconds(phases: CyclePhaseTimes): number {
  return (
    phases.travelToPickupSeconds +
    phases.pickupSeconds +
    phases.travelToScoreSeconds +
    phases.scoreSeconds +
    phases.errorMarginSeconds
  );
}

/**
 * How many scoring cycles fit in a time budget, and the resulting points. `pointsPerPiece`
 * lets a scenario mix auto/teleop point values by passing the right value for the window
 * being modeled. `startupSeconds` accounts for a one-time delay before the first cycle
 * (e.g. driving off the start line) that shouldn't count against every subsequent cycle.
 */
export function computeCycleTime(
  phases: CyclePhaseTimes,
  budgetSeconds: number,
  pointsPerPiece: number,
  startupSeconds = 0,
): CycleTimeResult {
  const cycleSeconds = totalCycleSeconds(phases);
  const usableSeconds = Math.max(0, budgetSeconds - startupSeconds);
  const cyclesAvailable = cycleSeconds > 0 ? Math.floor(usableSeconds / cycleSeconds) : 0;
  return {
    cycleSeconds,
    cyclesAvailable,
    piecesScored: cyclesAvailable,
    pointsScored: cyclesAvailable * pointsPerPiece,
  };
}
