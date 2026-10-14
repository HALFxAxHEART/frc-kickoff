/**
 * Kickoff Weekend workspace — the shared, live-updating board the whole team uses on Kickoff
 * Saturday/Sunday. Modeled on Team 341 Miss Daisy's kickoff process (Sean Stevens, "Kickoff and
 * Competition Strategy", Comcast Bootcamp, Dec 2025): read the rules → build strategy-critical
 * field parts → mock game → weighted objective table → voted focus → small-group alliance
 * strategies → deep-dive questions → a "Robot Will Do" list the whole team signs off on.
 *
 * Every item lives in a named workspace (e.g. "2027" or "Practice – REEFSCAPE") so the team can do
 * a full practice run on a past game in the fall without touching the real season's board.
 */

export type ChecklistPhase = "fall" | "saturday" | "sunday" | "week1";
export type FieldPartStatus = "todo" | "building" | "done";
export type MockVerdict = "unsure" | "real" | "artifact";
export type WillDoStatus = "active" | "met" | "cut";
export type RpRule = "always" | "ifFavored" | "never";
export type VoteChoice = "need" | "nice" | "skip";

export interface ChecklistData {
  kind: "checklist";
  phase: ChecklistPhase;
  time: string;
  label: string;
  owner: string;
  done: boolean;
}

export interface FieldPartData {
  kind: "fieldPart";
  name: string;
  /** 1 = needed on day one for strategy, 2 = this week, 3 = later / nice to have */
  priority: 1 | 2 | 3;
  why: string;
  owner: string;
  status: FieldPartStatus;
}

export interface MockPropData {
  kind: "mockProp";
  element: string;
  standIn: string;
  ready: boolean;
}

export interface MockTestData {
  kind: "mockTest";
  question: string;
  setup: string;
  redScore: number | null;
  blueScore: number | null;
  takeaway: string;
  /** 341's caution: humans pass/throw far better than robots — is this a real strategy or a mock-game artifact? */
  verdict: MockVerdict;
}

export interface VoteTaskData {
  kind: "voteTask";
  task: string;
}

export interface TimelineRow {
  t: string;
  state: string;
}

export interface SmallGroupData {
  kind: "smallGroup";
  name: string;
  members: string;
  goal: string;
  needs: string;
  auto: string;
  teleop: string;
  endgame: string;
  timeline: TimelineRow[];
}

export interface DeepDiveData {
  kind: "deepDive";
  question: string;
  hint: string;
  answer: string;
}

export interface WillDoData {
  kind: "willDo";
  requirement: string;
  why: string;
  status: WillDoStatus;
  note: string;
}

export interface SignoffData {
  kind: "signoff";
  name: string;
}

export interface RpPlanData {
  kind: "rpPlan";
  name: string;
  /** Points of scoring you give up by chasing this RP instead of just maximizing score. */
  costPoints: number;
  rule: RpRule;
}

export type KickoffItemData =
  | ChecklistData
  | FieldPartData
  | MockPropData
  | MockTestData
  | VoteTaskData
  | SmallGroupData
  | DeepDiveData
  | WillDoData
  | SignoffData
  | RpPlanData;

export type KickoffKind = KickoffItemData["kind"];

export const DEFAULT_WORKSPACE = "2027";

export const CHECKLIST_PHASES: { id: ChecklistPhase; label: string }[] = [
  { id: "fall", label: "Fall prep (before Jan 9)" },
  { id: "saturday", label: "Saturday — Kickoff day" },
  { id: "sunday", label: "Sunday — Split day" },
  { id: "week1", label: "Week 1" },
];

type ChecklistSeed = Pick<ChecklistData, "phase" | "time" | "label">;

/**
 * 5090's real schedule (from the 2027 Gantt): Southgate kickoff event 9–2 Sat, shop 5–8 Sat,
 * Sun 10–5 split between field build (parents + mentors) and strategy. Times are suggestions —
 * every row is editable in the app.
 */
const CHECKLIST_SEED: ChecklistSeed[] = [
  { phase: "fall", time: "Oct–Nov", label: "Do a full practice run of this process on a past game during a fall meeting (use a separate Practice workspace)" },
  { phase: "fall", time: "Nov", label: "Set season expectations (from past results) and SMART goals; get the whole team aligned on them" },
  { phase: "fall", time: "Dec", label: "Recruit 2 mock-game coaches (leave Southgate early, lay out the field in the shop — they don't need the rules)" },
  { phase: "fall", time: "Dec", label: "Recruit parent volunteers for the Sunday field-parts build" },
  { phase: "fall", time: "Dec", label: "Pack a mock-game prop bin: floor tape, cones, totes, cardboard, foam balls, paper plates, solo cups, PVC" },
  { phase: "fall", time: "Dec", label: "Have plywood, 2x4s, screws and tools on hand for field parts" },
  { phase: "fall", time: "Dec", label: "Make sure the shop printer works — print the game manual + field drawings for the strategy room" },
  { phase: "saturday", time: "12:00", label: "Game reveal broadcast" },
  { phase: "saturday", time: "12:30", label: "Read the rules in small groups: tournament structure, ranking points, every way to score, penalties, robot size/weight limits" },
  { phase: "saturday", time: "1:00", label: "Mock-game coaches head to the shop and lay out the field from the field drawings" },
  { phase: "saturday", time: "1:45", label: "Quick rules quiz before leaving Southgate — everyone speaking the same language" },
  { phase: "saturday", time: "5:00", label: "Mock game in the shop — include at least one A/B test match" },
  { phase: "saturday", time: "6:15", label: "Weighted objective table — list every scoring task, points, ease, RP contribution" },
  { phase: "saturday", time: "7:15", label: "Voted focus — everyone votes need / nice / skip on each task (does not decide anything)" },
  { phase: "saturday", time: "7:45", label: "Wrap up — what to think about overnight (Discord is fine)" },
  { phase: "sunday", time: "10:00", label: "Split the team: build half → field parts (with parents) + day-one prototyping; strategy half → small groups" },
  { phase: "sunday", time: "10:00", label: "Small groups of 4–5: alliance strategies (not robot designs) — goal, needs, auto/teleop/endgame" },
  { phase: "sunday", time: "11:30", label: "Each small group presents to the strategy half" },
  { phase: "sunday", time: "12:00", label: "Lunch" },
  { phase: "sunday", time: "12:45", label: "Deep-dive questions — answer every one" },
  { phase: "sunday", time: "2:30", label: "Build half reports prototype findings: what's easier / harder than expected, how the game piece behaves" },
  { phase: "sunday", time: "3:00", label: "Draft the Robot Will Do list — what the robot must do, not how" },
  { phase: "sunday", time: "4:15", label: "Whole team reads the Will Do list and signs off" },
  { phase: "week1", time: "Mon", label: "Requirements → brainstorm → fast elimination of concepts" },
  { phase: "week1", time: "Wed–Thu", label: "Prototype and test the risky parts; keep building field parts by priority" },
  { phase: "week1", time: "Sat Jan 16", label: "Robot direction decided — check it against the Will Do list; mentors place the first parts order" },
];

const DEEP_DIVE_SEED: Pick<DeepDiveData, "question" | "hint">[] = [
  { question: "What are all the scenarios that get every ranking point?", hint: "List every combination — not just the obvious one (e.g. two shallow climbs + a park instead of one deep climb)." },
  { question: "How does the scoring actually work over a match?", hint: "Which pieces get scored early vs. late? Where do scores jump? Are there catch-up mechanics?" },
  { question: "What will the match flow look like?", hint: "How are robots moving? Where do they get pieces? Where do they score? Where will traffic jam?" },
  { question: "Are there non-scoring tasks that make a big difference?", hint: "e.g. 2020's trench forced robots to be short. Height limits, protected zones, field obstacles." },
  { question: "Does the game change between quals and playoffs?", hint: "When ranking points stop mattering, what do you do differently? What must you be ready for?" },
  { question: "What parts of the game can be ignored and still be competitive?", hint: "Make the trade-offs consciously instead of by accident." },
  { question: "What will separate elite robots from good robots?", hint: "341 in 2025: elite = exceptional at L1, not just able to score high. What's this year's version?" },
  { question: "How can we control our own destiny?", hint: "Usually: earn every RP you can. What does that look like in this game?" },
];

export function defaultWorkspaceItems(): KickoffItemData[] {
  const checklist: ChecklistData[] = CHECKLIST_SEED.map((c) => ({ kind: "checklist", ...c, owner: "", done: false }));
  const deepDive: DeepDiveData[] = DEEP_DIVE_SEED.map((d) => ({ kind: "deepDive", ...d, answer: "" }));
  return [...checklist, ...deepDive];
}

/**
 * 341's ranking-point rule: only chase an RP that costs scoring if you're favored by more than
 * that cost — otherwise just play to win. "always" RPs are free/cheap and always attempted.
 */
export function shouldChaseRp(rule: RpRule, costPoints: number, predictedMargin: number): boolean {
  if (rule === "always") return true;
  if (rule === "never") return false;
  return predictedMargin > costPoints;
}
