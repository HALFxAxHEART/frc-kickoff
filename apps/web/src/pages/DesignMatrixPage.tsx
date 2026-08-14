import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";

interface Criterion {
  id: string;
  label: string;
  weight: number;
}
interface Option {
  id: string;
  label: string;
  notes?: string;
  scores: Record<string, number>;
}

function newId() {
  return crypto.randomUUID();
}

const DEFAULT_CRITERIA: Criterion[] = [
  { id: newId(), label: "Cycle speed", weight: 30 },
  { id: newId(), label: "Reliability", weight: 25 },
  { id: newId(), label: "Build complexity (lower=better)", weight: 20 },
  { id: newId(), label: "Defense capability", weight: 15 },
  { id: newId(), label: "Driver skill required (lower=better)", weight: 10 },
];

function blankMatrix(gameYear: number) {
  return {
    id: null as string | null,
    name: "New robot concept matrix",
    gameYear,
    criteria: DEFAULT_CRITERIA,
    options: [
      { id: newId(), label: "Concept A", scores: {} },
      { id: newId(), label: "Concept B", scores: {} },
    ] as Option[],
  };
}

export function DesignMatrixPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: game } = useQuery(trpc.game.current.queryOptions());
  const gameYear = game?.year ?? 0;

  const { data: saved = [] } = useQuery({
    ...trpc.designMatrices.list.queryOptions({ gameYear }),
    enabled: !!gameYear,
  });

  const [draft, setDraft] = useState(blankMatrix(0));

  useEffect(() => {
    if (gameYear && draft.gameYear === 0) setDraft(blankMatrix(gameYear));
  }, [gameYear, draft.gameYear]);

  const createMutation = useMutation(
    trpc.designMatrices.create.mutationOptions({
      onSuccess: (row) => {
        queryClient.invalidateQueries({ queryKey: trpc.designMatrices.list.queryKey({ gameYear }) });
        if (row) setDraft({ ...draft, id: row.id });
      },
    }),
  );
  const updateMutation = useMutation(
    trpc.designMatrices.update.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.designMatrices.list.queryKey({ gameYear }) }),
    }),
  );
  const deleteMutation = useMutation(
    trpc.designMatrices.delete.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.designMatrices.list.queryKey({ gameYear }) }),
    }),
  );

  function save() {
    const payload = { name: draft.name, gameYear: draft.gameYear, criteria: draft.criteria, options: draft.options };
    if (draft.id) updateMutation.mutate({ id: draft.id, ...payload });
    else createMutation.mutate(payload);
  }

  function load(matrix: typeof saved[number]) {
    setDraft({ id: matrix.id, name: matrix.name, gameYear: matrix.gameYear, criteria: matrix.criteria, options: matrix.options });
  }

  function addCriterion() {
    setDraft({ ...draft, criteria: [...draft.criteria, { id: newId(), label: "New criterion", weight: 10 }] });
  }
  function removeCriterion(id: string) {
    setDraft({ ...draft, criteria: draft.criteria.filter((c) => c.id !== id) });
  }
  function addOption() {
    setDraft({ ...draft, options: [...draft.options, { id: newId(), label: `Concept ${draft.options.length + 1}`, scores: {} }] });
  }
  function removeOption(id: string) {
    setDraft({ ...draft, options: draft.options.filter((o) => o.id !== id) });
  }

  const totalWeight = draft.criteria.reduce((s, c) => s + c.weight, 0) || 1;
  const scored = draft.options
    .map((o) => {
      const weightedTotal = draft.criteria.reduce((sum, c) => sum + ((o.scores[c.id] ?? 0) * c.weight) / totalWeight, 0);
      return { ...o, weightedTotal };
    })
    .sort((a, b) => b.weightedTotal - a.weightedTotal);

  if (!game) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Robot Design Matrix</h1>
      <p className="lede">
        Weigh each robot concept against your own criteria. Score 1 (bad) to 5 (great) per cell — the weighted total
        ranks them for you. Framing matters: for a criterion like complexity where lower is better, score it as
        "how well does this concept minimize complexity" so higher is still better.
      </p>

      {saved.length > 0 && (
        <div className="field" style={{ maxWidth: 360 }}>
          <label>Load a saved matrix</label>
          <select
            value={draft.id ?? ""}
            onChange={(e) => {
              const m = saved.find((x) => x.id === e.target.value);
              if (m) load(m);
              else setDraft(blankMatrix(gameYear));
            }}
          >
            <option value="">— New matrix —</option>
            {saved.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field" style={{ maxWidth: 360 }}>
        <label>Matrix name</label>
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </div>

      <div className="chart-wrap">
        <table>
          <thead>
            <tr>
              <th>Concept</th>
              {draft.criteria.map((c) => (
                <th key={c.id}>
                  <input
                    value={c.label}
                    onChange={(e) =>
                      setDraft({ ...draft, criteria: draft.criteria.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)) })
                    }
                    style={{ marginBottom: 4, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number"
                      min={0}
                      value={c.weight}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          criteria: draft.criteria.map((x) => (x.id === c.id ? { ...x, weight: Number(e.target.value) } : x)),
                        })
                      }
                      style={{ width: 60 }}
                    />
                    <button onClick={() => removeCriterion(c.id)} title="Remove criterion" style={{ padding: "2px 6px" }}>
                      ×
                    </button>
                  </div>
                </th>
              ))}
              <th>Weighted total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scored.map((o) => (
              <tr key={o.id}>
                <td>
                  <input value={o.label} onChange={(e) => setDraft({ ...draft, options: draft.options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })} />
                </td>
                {draft.criteria.map((c) => (
                  <td key={c.id}>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={o.scores[c.id] ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          options: draft.options.map((x) =>
                            x.id === o.id ? { ...x, scores: { ...x.scores, [c.id]: Number(e.target.value) } } : x,
                          ),
                        })
                      }
                      style={{ width: 56 }}
                    />
                  </td>
                ))}
                <td>
                  <strong style={{ color: "var(--series-1)" }}>{o.weightedTotal.toFixed(2)}</strong>
                </td>
                <td>
                  <button onClick={() => removeOption(o.id)} style={{ padding: "2px 6px" }}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={addCriterion}>+ Criterion</button>
        <button onClick={addOption}>+ Concept</button>
        <button className="primary" onClick={save} disabled={createMutation.isPending || updateMutation.isPending}>
          {draft.id ? "Save changes" : "Save matrix"}
        </button>
        {draft.id && (
          <button
            className="danger"
            onClick={() => {
              deleteMutation.mutate({ id: draft.id! });
              setDraft(blankMatrix(gameYear));
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
