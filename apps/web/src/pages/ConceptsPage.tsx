import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";

function blank(gameYear: number) {
  return {
    id: null as string | null,
    name: "New concept",
    gameYear,
    summary: "",
    notes: "",
    cycleScenarioIds: [] as string[],
    designMatrixId: null as string | null,
  };
}

export function ConceptsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: game } = useQuery(trpc.game.current.queryOptions());
  const gameYear = game?.year ?? 0;

  const { data: concepts = [] } = useQuery({ ...trpc.concepts.list.queryOptions({ gameYear }), enabled: !!gameYear });
  const { data: scenarios = [] } = useQuery({ ...trpc.cycleScenarios.list.queryOptions({ gameYear }), enabled: !!gameYear });
  const { data: matrices = [] } = useQuery({ ...trpc.designMatrices.list.queryOptions({ gameYear }), enabled: !!gameYear });

  const [draft, setDraft] = useState(blank(0));
  useEffect(() => {
    if (gameYear && draft.gameYear === 0) setDraft(blank(gameYear));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameYear]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.concepts.list.queryKey({ gameYear }) });
  const createMutation = useMutation(trpc.concepts.create.mutationOptions({ onSuccess: invalidate }));
  const updateMutation = useMutation(trpc.concepts.update.mutationOptions({ onSuccess: invalidate }));
  const deleteMutation = useMutation(trpc.concepts.delete.mutationOptions({ onSuccess: invalidate }));

  function save() {
    const payload = {
      name: draft.name,
      gameYear: draft.gameYear,
      summary: draft.summary,
      notes: draft.notes,
      cycleScenarioIds: draft.cycleScenarioIds,
      designMatrixId: draft.designMatrixId,
    };
    if (draft.id) updateMutation.mutate({ id: draft.id, ...payload });
    else createMutation.mutate(payload);
    setDraft(blank(gameYear));
  }

  function toggleScenario(id: string) {
    setDraft((d) => ({
      ...d,
      cycleScenarioIds: d.cycleScenarioIds.includes(id) ? d.cycleScenarioIds.filter((x) => x !== id) : [...d.cycleScenarioIds, id],
    }));
  }

  if (!game) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Concepts</h1>
      <p className="lede">
        Bundle a robot concept together — a name, your notes, and the cycle-time scenarios / design matrix that back
        it up — so you can compare 2-3 real options before committing at the end of kickoff weekend.
      </p>

      <div className="card">
        <div className="field">
          <label>Name</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Summary</label>
          <input value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="e.g. Under-bumper intake, flywheel shooter, winch climb" />
        </div>

        {scenarios.length > 0 && (
          <div className="field">
            <label>Linked cycle-time scenarios</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {scenarios.map((s) => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, width: "auto", marginBottom: 0 }}>
                  <input type="checkbox" style={{ width: "auto" }} checked={draft.cycleScenarioIds.includes(s.id)} onChange={() => toggleScenario(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {matrices.length > 0 && (
          <div className="field">
            <label>Linked design matrix</label>
            <select value={draft.designMatrixId ?? ""} onChange={(e) => setDraft({ ...draft, designMatrixId: e.target.value || null })}>
              <option value="">— none —</option>
              {matrices.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label>Notes</label>
          <textarea rows={4} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </div>

        <button className="primary" onClick={save} disabled={createMutation.isPending || updateMutation.isPending}>
          {draft.id ? "Save changes" : "Add concept"}
        </button>
      </div>

      <h2>Saved Concepts</h2>
      {concepts.length === 0 && <p className="empty-state">No concepts saved yet.</p>}
      <div className="card-grid">
        {concepts.map((c) => (
          <div className="card" key={c.id}>
            <h3>{c.name}</h3>
            {c.summary && <p className="muted" style={{ fontSize: "0.86rem" }}>{c.summary}</p>}
            {c.cycleScenarioIds.length > 0 && (
              <p className="muted" style={{ fontSize: "0.8rem" }}>
                {c.cycleScenarioIds.length} linked scenario{c.cycleScenarioIds.length > 1 ? "s" : ""}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={() =>
                  setDraft({
                    id: c.id,
                    name: c.name,
                    gameYear: c.gameYear,
                    summary: c.summary,
                    notes: c.notes,
                    cycleScenarioIds: c.cycleScenarioIds,
                    designMatrixId: c.designMatrixId,
                  })
                }
              >
                Edit
              </button>
              <button className="danger" onClick={() => deleteMutation.mutate({ id: c.id })}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
