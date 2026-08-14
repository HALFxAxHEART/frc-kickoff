import type { GameBreakdown } from "./types";
import { GAME_2026_REBUILT } from "./2026";

export * from "./types";

/** One entry per year. Add a new file + entry here each Kickoff, then bump CURRENT_GAME_YEAR. */
export const GAME_BREAKDOWNS: Record<number, GameBreakdown> = {
  2026: GAME_2026_REBUILT,
};

export const CURRENT_GAME_YEAR = 2026;

export function getGameBreakdown(year: number = CURRENT_GAME_YEAR): GameBreakdown | undefined {
  return GAME_BREAKDOWNS[year];
}

export function listGameYears(): number[] {
  return Object.keys(GAME_BREAKDOWNS)
    .map(Number)
    .sort((a, b) => b - a);
}

/** Seconds of match clock across all phases up to and including `phaseId` (or the whole match if omitted). */
export function cumulativeSecondsThroughPhase(game: GameBreakdown, phaseId?: string): number {
  let total = 0;
  for (const phase of game.phases) {
    total += phase.durationSeconds;
    if (phase.id === phaseId) break;
  }
  return total;
}
