export interface ClimberStageConfig {
  /** How tall the stowed climber is allowed to be (also becomes each stage's length). */
  maxStowedHeightM: number;
  /** How tall it needs to reach fully extended. */
  targetExtendedHeightM: number;
  /** Minimum bearing overlap kept between adjacent stages at full extension, for rigidity. */
  minOverlapM: number;
  /** If set, use exactly this many stages instead of the computed minimum. */
  forcedStageCount?: number;
}

export interface ClimberStage {
  /** 1 = the fixed base tube, N = the topmost/moving stage. */
  stageNumber: number;
  lengthM: number;
  /** Overlap maintained with the next stage out at full extension (0 for the last stage). */
  overlapWithNextM: number;
  /** Total extended height once this stage (and all before it) are accounted for. */
  cumulativeExtendedHeightM: number;
}

export interface ClimberStageResult {
  feasible: boolean;
  stageCount: number;
  stageLengthM: number;
  stowedHeightM: number;
  extendedHeightM: number;
  totalTravelM: number;
  stages: ClimberStage[];
  warning?: string;
}

/**
 * Sizes a uniform-stage cascade telescoping mechanism (e.g. a climber) given a stowed-height
 * limit and a target reach. Simplified geometric model: stage 1 is the fixed base contributing
 * its full length; each stage after it adds its own length minus the overlap it must keep
 * engaged with the stage before it for structural rigidity. Real designs vary by rigging type
 * (cascade vs. continuous) and bearing/guide choice — treat this as a starting sizing pass, not
 * final structural design.
 */
export function computeClimberStages(config: ClimberStageConfig): ClimberStageResult {
  const L = config.maxStowedHeightM;
  const o = config.minOverlapM;
  const target = config.targetExtendedHeightM;

  if (L <= o) {
    return {
      feasible: false,
      stageCount: 0,
      stageLengthM: L,
      stowedHeightM: L,
      extendedHeightM: 0,
      totalTravelM: 0,
      stages: [],
      warning: "Max stowed height must be greater than the minimum overlap — no stage can add any reach at all.",
    };
  }

  const minimumStages = Math.max(1, Math.ceil((target - o) / (L - o)));
  const N = Math.max(1, config.forcedStageCount ?? minimumStages);

  const extendedHeightM = L + (N - 1) * (L - o);
  // Stage 1 is the fixed base and doesn't move; total travel is how far the top of the
  // mechanism actually moves, i.e. extendedHeight - stowedHeight.
  const totalTravelM = (N - 1) * (L - o);
  const stages: ClimberStage[] = [];
  let cumulative = 0;
  for (let i = 1; i <= N; i++) {
    cumulative += i === 1 ? L : L - o;
    stages.push({
      stageNumber: i,
      lengthM: L,
      overlapWithNextM: i < N ? o : 0,
      cumulativeExtendedHeightM: cumulative,
    });
  }

  const feasible = extendedHeightM >= target - 1e-9;
  return {
    feasible,
    stageCount: N,
    stageLengthM: L,
    stowedHeightM: L,
    extendedHeightM,
    totalTravelM,
    stages,
    warning: !feasible
      ? "Even at this stage count, the target extended height isn't reachable — add stages, allow a taller stowed height, or reduce overlap."
      : undefined,
  };
}
