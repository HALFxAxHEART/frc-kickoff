import { z } from "zod";
import {
  GAME_PIECE_PRESETS,
  ROLLER_SURFACES,
  type GamePieceSpec,
  type IntakeArmDrive,
  type IntakeBar,
  type IntakeLabConfig,
  type IntakeLinkage,
  type PieceOrientation,
  type RollerSurfaceSpec,
} from "@frckickoff/shared";

/** Everything the Intake Lab remembers between visits (saved in this browser only). */
export interface LabState {
  pieces: GamePieceSpec[];
  pieceId: string;
  pieceStartXIn: number;
  bars: IntakeBar[];
  driveSpeedFtPerSec: number;
  rollerMotorId: string;
  rollerOutput: number;
  bumper: { depthIn: number; bottomIn: number; topIn: number };
  surfaces: RollerSurfaceSpec[];
  linkage: IntakeLinkage;
  armDrive: IntakeArmDrive;
  /** how a tube-shaped piece lies on the carpet for the pickup test */
  orientation: PieceOrientation;
}

const bar = (id: string, xIn: number, yIn: number, passes: IntakeBar["passes"]): IntakeBar => ({
  id,
  xIn,
  yIn,
  tubeOdIn: 2,
  tubeSurface: "poly-grip",
  wheelOdIn: 0,
  wheelSurface: "flex-wheel",
  ratio: 2,
  passes,
});

/** A layout that pulls a 2025 coral in at 2-15 ft/s (checked in the simulator), all 2 in polycarb tubes with grip tape. */
export const DEFAULT_BARS: IntakeBar[] = [
  bar("B1", 13, 5, "under"),
  bar("B2", 6.5, 1.6, "over"),
  bar("B3", 7.5, 11, "under"),
  bar("B4", 3.3, 7.2, "over"),
  bar("B5", -1, 11.5, "under"),
];

/** A buildable 4-bar for the default bars (found by searching layouts in the simulator): links 4-10 in,
 *  stows inside the frame, clears the bumper and the fixed roller B5, folds up when hit, stays 40+ degrees from toggle. */
export function defaultLinkage(): IntakeLinkage {
  return { a: { x: -6.8, y: 11.5 }, b: { x: -9.8, y: 14.5 }, c: { x: 3.1, y: 14.5 }, d: { x: -1.7, y: 18.7 }, stowedDriverDeg: 141.5, barsOnArm: ["B1", "B2", "B3", "B4"] };
}

export function defaultArmDrive(): IntakeArmDrive {
  return { motorId: "kraken-x60", numMotors: 1, ratio: 45, statorLimitA: 60, efficiency: 0.85, plateMassLb: 5, barMassLb: 0.8, linkMassLb: 1 };
}

export function defaultLabState(): LabState {
  return {
    pieces: GAME_PIECE_PRESETS.map((p) => ({ ...p })),
    pieceId: "coral-2025",
    pieceStartXIn: 22,
    bars: DEFAULT_BARS.map((b) => ({ ...b })),
    driveSpeedFtPerSec: 8,
    rollerMotorId: "kraken-x60",
    rollerOutput: 0.8,
    bumper: { depthIn: 3.5, bottomIn: 1, topIn: 6 },
    surfaces: ROLLER_SURFACES.map((s) => ({ ...s })),
    linkage: defaultLinkage(),
    armDrive: defaultArmDrive(),
    orientation: "sideways",
  };
}

const surfaceId = z.enum([
  "poly-bare",
  "poly-grip",
  "poly-silicone",
  "compliant-wheel",
  "flex-wheel",
  "star-flex-30a",
  "star-flex-45a",
  "star-flex-60a",
  "stealth-wheel",
]);
const pt = z.object({ x: z.number(), y: z.number() });
const labSchema = z.object({
  pieces: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        diameterIn: z.number(),
        weightLb: z.number(),
        shape: z.enum(["tube", "ball"]),
        stiffnessNPerM: z.number(),
        carpetMu: z.number(),
        lengthIn: z.number().optional(),
      }),
    )
    .min(1),
  pieceId: z.string(),
  pieceStartXIn: z.number(),
  bars: z.array(
    z.object({
      id: z.string(),
      xIn: z.number(),
      yIn: z.number(),
      tubeOdIn: z.number(),
      tubeSurface: surfaceId,
      wheelOdIn: z.number(),
      wheelSurface: surfaceId,
      ratio: z.number(),
      passes: z.enum(["under", "over"]),
    }),
  ),
  driveSpeedFtPerSec: z.number(),
  rollerMotorId: z.string(),
  rollerOutput: z.number(),
  bumper: z.object({ depthIn: z.number(), bottomIn: z.number(), topIn: z.number() }),
  surfaces: z.array(
    z.object({
      id: surfaceId,
      label: z.string(),
      kind: z.enum(["tube", "wheel"]),
      mu: z.number(),
      stiffnessNPerM: z.number(),
      note: z.string(),
    }),
  ),
  // added later: older saved setups don't have these, so they get the defaults
  linkage: z
    .object({ a: pt, b: pt, c: pt, d: pt, stowedDriverDeg: z.number(), barsOnArm: z.array(z.string()) })
    .optional()
    .transform((v) => v ?? defaultLinkage()),
  armDrive: z
    .object({
      motorId: z.string(),
      numMotors: z.number(),
      ratio: z.number(),
      statorLimitA: z.number(),
      efficiency: z.number(),
      plateMassLb: z.number(),
      barMassLb: z.number(),
      linkMassLb: z.number(),
    })
    .optional()
    .transform((v) => v ?? defaultArmDrive()),
  orientation: z.enum(["sideways", "end-on", "standing"]).optional().transform((v) => v ?? "sideways"),
});

const STORAGE_KEY = "intake-lab-v1";

export function loadLabState(): LabState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultLabState();
  try {
    const parsed = labSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      const data: LabState = parsed.data;
      // surfaces added after this setup was saved (e.g. WCP Star Flex) get their default numbers
      const missing = ROLLER_SURFACES.filter((d) => !data.surfaces.some((s) => s.id === d.id)).map((d) => ({ ...d }));
      // coral saved before tubes had a length gets its real length back
      const pieces = data.pieces.map((p) => (p.id === "coral-2025" && p.lengthIn === undefined ? { ...p, lengthIn: 11.875 } : p));
      return { ...data, pieces, surfaces: [...data.surfaces, ...missing] };
    }
    console.warn("Intake Lab: saved setup didn't match the current format, starting fresh", parsed.error);
  } catch (err) {
    console.warn("Intake Lab: couldn't read saved setup, starting fresh", err);
  }
  return defaultLabState();
}

export function saveLabState(state: LabState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function activePiece(state: LabState): GamePieceSpec {
  return state.pieces.find((p) => p.id === state.pieceId) ?? state.pieces[0] ?? GAME_PIECE_PRESETS[0]!;
}

export function toConfig(state: LabState): IntakeLabConfig {
  return {
    piece: activePiece(state),
    pieceStartXIn: state.pieceStartXIn,
    bars: state.bars,
    driveSpeedFtPerSec: state.driveSpeedFtPerSec,
    rollerMotorId: state.rollerMotorId,
    rollerOutput: state.rollerOutput,
    bumper: state.bumper,
    surfaces: state.surfaces,
    orientation: state.orientation,
  };
}

/** Next unused bar name: B1, B2, ... */
export function nextBarId(bars: IntakeBar[]): string {
  for (let n = 1; ; n++) {
    const id = `B${n}`;
    if (!bars.some((b) => b.id === id)) return id;
  }
}

export const N_TO_LBF = 0.224809;
/** N/m -> lb per inch of squish */
export const NPM_TO_LB_PER_IN = 0.224809 * 0.0254;
