import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";
import { computeCycleTime, totalCycleSeconds, type CyclePhaseTimes } from "@frckickoff/shared";

const DEFAULT_PHASE_TIMES: CyclePhaseTimes = {
  travelToPickupSeconds: 1.5,
  pickupSeconds: 1,
  travelToScoreSeconds: 1.5,
  scoreSeconds: 1,
  errorMarginSeconds: 0.5,
};

const FIELD_LABELS: { key: keyof CyclePhaseTimes; label: string; hint: string }[] = [
  { key: "travelToPickupSeconds", label: "Travel to pickup", hint: "Drive from wherever you scored last to the next piece." },
  { key: "pickupSeconds", label: "Pickup / intake", hint: "Time to secure the piece once you're on it." },
  { key: "travelToScoreSeconds", label: "Travel to score", hint: "Drive from pickup back to the scoring location." },
  { key: "scoreSeconds", label: "Score / align", hint: "Aligning and releasing/shooting the piece." },
  { key: "errorMarginSeconds", label: "Error margin", hint: "Flat buffer for misses, jams, re-tries." },
];

export function CycleTimePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: game } = useQuery(trpc.game.current.queryOptions());
  const gameYear = game?.year ?? 0;

  const { data: scenarios = [] } = useQuery({
    ...trpc.cycleScenarios.list.queryOptions({ gameYear }),
    enabled: !!gameYear,
  });

  const cycleableActions = useMemo(() => game?.scoringActions.filter((a) => a.cycleable) ?? [], [game]);
  const [actionId, setActionId] = useState<string>("");
  const activeAction = cycleableActions.find((a) => a.id === actionId) ?? cycleableActions[0];

  const teleopSeconds = useMemo(() => (game ? game.phases.filter((p) => p.id !== "auto").reduce((s, p) => s + p.durationSeconds, 0) : 0), [game]);

  const [name, setName] = useState("New scenario");
  const [phaseTimes, setPhaseTimes] = useState<CyclePhaseTimes>(DEFAULT_PHASE_TIMES);
  const [budgetSeconds, setBudgetSeconds] = useState(0);
  const [startupSeconds, setStartupSeconds] = useState(3);
  const [pointsPerPiece, setPointsPerPiece] = useState(1);

  useEffect(() => {
    if (budgetSeconds === 0 && teleopSeconds > 0) {
      setBudgetSeconds(teleopSeconds);
      setPointsPerPiece(activeAction?.pointsTeleop ?? activeAction?.pointsAuto ?? 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teleopSeconds]);

  const result = computeCycleTime(phaseTimes, budgetSeconds, pointsPerPiece, startupSeconds);

  const createMutation = useMutation(
    trpc.cycleScenarios.create.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.cycleScenarios.list.queryKey({ gameYear }) }),
    }),
  );
  const deleteMutation = useMutation(
    trpc.cycleScenarios.delete.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.cycleScenarios.list.queryKey({ gameYear }) }),
    }),
  );

  function updatePhase(key: keyof CyclePhaseTimes, value: number) {
    setPhaseTimes((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  }

  function saveScenario() {
    if (!activeAction || !gameYear) return;
    createMutation.mutate({
      name,
      gameYear,
      scoringActionId: activeAction.id,
      phaseTimes,
      budgetSeconds,
      startupSeconds,
      pointsPerPiece,
    });
  }

  if (!game) return <p className="muted">Loading…</p>;
  if (cycleableActions.length === 0) {
    return <p className="empty-state">This year's game has no repeatable scoring actions to model — nothing to cycle-time here.</p>;
  }

  return (
    <div>
      <h1>Cycle Time Calculator</h1>
      <p className="lede">
        Break a scoring loop into its phases, see how many pieces and points that gets you in the time you have, and
        save a few scenarios side by side — e.g. "fast pickup, slow score" vs. "slow pickup, fast score".
      </p>

      <div className="two-col">
        <div>
          <div className="card">
            <div className="field">
              <label>Scoring action</label>
              <select value={activeAction?.id} onChange={(e) => setActionId(e.target.value)}>
                {cycleableActions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {FIELD_LABELS.map(({ key, label, hint }) => (
              <div className="field" key={key}>
                <label>
                  {label} — {phaseTimes[key].toFixed(1)}s
                </label>
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={0.1}
                  value={phaseTimes[key]}
                  onChange={(e) => updatePhase(key, Number(e.target.value))}
                />
                <div className="muted" style={{ fontSize: "0.78rem" }}>
                  {hint}
                </div>
              </div>
            ))}

            <div className="field-row">
              <div className="field">
                <label>Time budget (s)</label>
                <input type="number" min={0} value={budgetSeconds} onChange={(e) => setBudgetSeconds(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Startup delay (s)</label>
                <input type="number" min={0} value={startupSeconds} onChange={(e) => setStartupSeconds(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Points / piece</label>
                <input type="number" min={0} value={pointsPerPiece} onChange={(e) => setPointsPerPiece(Number(e.target.value))} />
              </div>
            </div>
            <p className="muted" style={{ fontSize: "0.78rem" }}>
              Budget defaults to the full teleop window ({teleopSeconds}s). If your game's scoring location isn't
              always available (like REBUILT's alternating Hub), shrink this to the seconds it's actually usable.
            </p>

            <div className="field">
              <label>Scenario name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button className="primary" onClick={saveScenario} disabled={createMutation.isPending}>
              Save scenario
            </button>
          </div>
        </div>

        <div>
          <div className="card">
            <h3>Result</h3>
            <BigStat label="Cycle time" value={`${totalCycleSeconds(phaseTimes).toFixed(1)}s`} />
            <BigStat label="Cycles in budget" value={String(result.cyclesAvailable)} />
            <BigStat label="Points" value={String(result.pointsScored)} accent />
          </div>
        </div>
      </div>

      {scenarios.length > 0 && (
        <>
          <h2>Saved Scenarios — {gameYear}</h2>
          <ScenarioComparison scenarios={scenarios} />
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Cycle time</th>
                <th>Budget</th>
                <th>Pieces</th>
                <th>Points</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => {
                const r = computeCycleTime(s.phaseTimes, s.budgetSeconds, s.pointsPerPiece, s.startupSeconds);
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{r.cycleSeconds.toFixed(1)}s</td>
                    <td>{s.budgetSeconds}s</td>
                    <td>{r.piecesScored}</td>
                    <td>{r.pointsScored}</td>
                    <td>
                      <button onClick={() => deleteMutation.mutate({ id: s.id })}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function BigStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="muted" style={{ fontSize: "0.8rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.8rem", fontWeight: 700, color: accent ? "var(--series-1)" : "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

type ScenarioRow = {
  id: string;
  name: string;
  phaseTimes: CyclePhaseTimes;
  budgetSeconds: number;
  startupSeconds: number;
  pointsPerPiece: number;
};

function ScenarioComparison({ scenarios }: { scenarios: ScenarioRow[] }) {
  const points = scenarios.map((s) => computeCycleTime(s.phaseTimes, s.budgetSeconds, s.pointsPerPiece, s.startupSeconds).pointsScored);
  const maxPoints = Math.max(1, ...points);
  const barHeight = 26;
  const gap = 10;
  const chartWidth = 560;
  const labelWidth = 160;

  return (
    <div className="chart-wrap">
      <svg width={chartWidth} height={scenarios.length * (barHeight + gap)} role="img" aria-label="Points per scenario">
        {scenarios.map((s, i) => {
          const value = points[i] ?? 0;
          const barMax = chartWidth - labelWidth - 40;
          const w = (value / maxPoints) * barMax;
          const y = i * (barHeight + gap);
          return (
            <g key={s.id}>
              <text x={0} y={y + barHeight / 2 + 4} fontSize="12" fill="var(--text-secondary)">
                {s.name.length > 20 ? s.name.slice(0, 19) + "…" : s.name}
              </text>
              <rect x={labelWidth} y={y} width={Math.max(2, w)} height={barHeight} rx={4} fill="var(--series-1)" />
              <text x={labelWidth + w + 8} y={y + barHeight / 2 + 4} fontSize="12" fill="var(--text-primary)">
                {value} pts
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
