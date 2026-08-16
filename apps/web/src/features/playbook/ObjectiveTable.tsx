import { useEffect, useState } from "react";

interface ObjectiveRow {
  id: string;
  task: string;
  points: number;
  ease: number;
  rpFraction: number;
}

const STORAGE_KEY = "frckickoff-objective-table";

function newId() {
  return crypto.randomUUID();
}

function newRow(): ObjectiveRow {
  return { id: newId(), task: "", points: 0, ease: 3, rpFraction: 0 };
}

interface StoredState {
  rows: ObjectiveRow[];
  winRPs: number;
  designWeightPct: number;
  maxScoreOverride: number | null;
}

function loadInitial(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore malformed/local-storage-unavailable cases — starts blank
  }
  return { rows: [newRow()], winRPs: 3, designWeightPct: 5, maxScoreOverride: null };
}

/**
 * Team 341 Miss Daisy's weighted-objective-table method (from their kickoff strategy process):
 * rank scoring tasks by potential points, ease of design, and how much they contribute toward a
 * ranking point — each on its own weight so a task doesn't win purely because it scores the most.
 */
export function ObjectiveTable() {
  const initial = loadInitial();
  const [rows, setRows] = useState<ObjectiveRow[]>(initial.rows);
  const [winRPs, setWinRPs] = useState(initial.winRPs);
  const [designWeightPct, setDesignWeightPct] = useState(initial.designWeightPct);
  const [maxScoreOverride, setMaxScoreOverride] = useState<number | null>(initial.maxScoreOverride);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, winRPs, designWeightPct, maxScoreOverride }));
    } catch {
      // best-effort persistence only
    }
  }, [rows, winRPs, designWeightPct, maxScoreOverride]);

  const summedPoints = rows.reduce((acc, r) => acc + (r.points || 0), 0);
  const maxScoreTotal = maxScoreOverride ?? summedPoints;
  const designWeight = maxScoreTotal * (designWeightPct / 100);
  const rpWeight = winRPs > 0 ? maxScoreTotal / winRPs : 0;

  function updateRow(id: string, field: keyof Omit<ObjectiveRow, "id">, value: string | number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  const scored = rows
    .map((r) => ({
      ...r,
      weightedSum: r.points * 1 + r.ease * designWeight + r.rpFraction * rpWeight,
      weightedSumNoRP: r.points * 1 + r.ease * designWeight,
    }))
    .sort((a, b) => b.weightedSum - a.weightedSum);

  const topId = scored[0]?.task ? scored[0].id : null;

  return (
    <div className="card">
      <h3>Weighted Objective Table</h3>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        List every scoring task from this year's game manual. Score each on potential points, how easy it is to
        design for (1 = very hard, 5 = trivial), and how much it contributes toward a ranking point (0-1, your
        estimate). The weighted sum below tells you what's actually worth building first — points alone can be
        misleading when a task is brutal to design for or barely moves a ranking point.
      </p>

      <table>
        <thead>
          <tr>
            <th>Scoring task</th>
            <th>Potential points</th>
            <th>Ease of design (1-5)</th>
            <th>RP contribution (0-1)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <input type="text" placeholder="e.g. Auto - Leave" value={r.task} onChange={(e) => updateRow(r.id, "task", e.target.value)} style={{ width: 180 }} />
              </td>
              <td>
                <input type="number" min={0} value={r.points} onChange={(e) => updateRow(r.id, "points", Number(e.target.value))} style={{ width: 70 }} />
              </td>
              <td>
                <input type="number" min={1} max={5} value={r.ease} onChange={(e) => updateRow(r.id, "ease", Math.min(5, Math.max(1, Number(e.target.value))))} style={{ width: 60 }} />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={r.rpFraction}
                  onChange={(e) => updateRow(r.id, "rpFraction", Math.min(1, Math.max(0, Number(e.target.value))))}
                  style={{ width: 70 }}
                />
              </td>
              <td>
                <button onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((x) => x.id !== r.id) : prev))} style={{ padding: "2px 6px" }}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setRows((prev) => [...prev, newRow()])} style={{ marginTop: 8 }}>
        + Task
      </button>

      <div className="field-row" style={{ marginTop: 16 }}>
        <div className="field">
          <label>Ranking points needed to win a match</label>
          <input type="number" min={1} value={winRPs} onChange={(e) => setWinRPs(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Design weight (% of max score)</label>
          <input type="number" min={0} max={100} value={designWeightPct} onChange={(e) => setDesignWeightPct(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Theoretical max score (override)</label>
          <input
            type="number"
            min={0}
            placeholder={String(summedPoints)}
            value={maxScoreOverride ?? ""}
            onChange={(e) => setMaxScoreOverride(e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.78rem" }}>
        Max score defaults to the sum of the points column above — override it if you've separately worked out a
        more precise theoretical max (every scorable action at its absolute best, auto + teleop + endgame). Points
        weight is fixed at 1; design weight = max score × the percentage above (341 uses 5%); RP weight = max score ÷
        ranking points needed to win.
      </p>

      <h4 style={{ marginTop: 16, marginBottom: 8 }}>Ranked by weighted sum</h4>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Task</th>
            <th>Weighted sum</th>
            <th>Weighted sum (no RP)</th>
          </tr>
        </thead>
        <tbody>
          {scored
            .filter((r) => r.task)
            .map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: r.id === topId ? 600 : undefined, color: r.id === topId ? "var(--series-1)" : undefined }}>{r.task}</td>
                <td>{r.weightedSum.toFixed(0)}</td>
                <td>{r.weightedSumNoRP.toFixed(0)}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <p className="muted" style={{ fontSize: "0.78rem", marginTop: 8 }}>
        This table tells you what you already suspect — it emphasizes tasks that are both valuable and easy, and
        shows how much a ranking point is really worth. It's a discussion tool, not a decision-maker on its own: a
        team vote on "need it / don't need it" per task is worth doing alongside this, but should inform the
        conversation, not override the numbers.
      </p>
    </div>
  );
}
