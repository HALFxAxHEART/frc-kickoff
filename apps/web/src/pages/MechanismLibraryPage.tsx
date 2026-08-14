import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";

export function MechanismLibraryPage() {
  const trpc = useTRPC();
  const { data: game } = useQuery(trpc.game.current.queryOptions());
  const { data: categories = [] } = useQuery(trpc.game.mechanisms.queryOptions());
  const [activeId, setActiveId] = useState<string | null>(null);

  const relevantIds = useMemo(() => {
    const ids = new Set<string>();
    game?.scoringActions.forEach((a) => a.mechanismTags.forEach((t) => ids.add(t)));
    return ids;
  }, [game]);

  const active = categories.find((c) => c.id === activeId) ?? categories[0];

  if (categories.length === 0) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Mechanism Library</h1>
      <p className="lede">
        General-purpose reference for the mechanism archetypes most FRC robots are built from. A badge marks the
        ones this year's game actually calls for.
      </p>

      <div className="tabs">
        {categories.map((c) => (
          <button key={c.id} className={c.id === active?.id ? "active" : ""} onClick={() => setActiveId(c.id)}>
            {c.label}
            {relevantIds.has(c.id) && (
              <span className="badge accent" style={{ marginLeft: 6 }}>
                this year
              </span>
            )}
          </button>
        ))}
      </div>

      {active && (
        <div>
          <p className="lede">{active.summary}</p>

          <h2>Variants</h2>
          <div className="card-grid">
            {active.variants.map((v) => (
              <div className="card" key={v.id}>
                <h3>{v.label}</h3>
                <p className="muted" style={{ fontSize: "0.86rem" }}>
                  {v.description}
                </p>
                <div style={{ fontSize: "0.84rem" }}>
                  <strong style={{ color: "var(--status-good)" }}>Pros</strong>
                  <ul style={{ margin: "4px 0 10px", paddingLeft: 18 }}>
                    {v.pros.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                  <strong style={{ color: "var(--status-critical)" }}>Cons</strong>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                    {v.cons.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <h2>Ask at kickoff</h2>
          <ul>
            {active.designQuestions.map((q, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {q}
              </li>
            ))}
          </ul>

          <h2>Examples worth studying</h2>
          <div className="card-grid">
            {active.examples.map((ex, i) => (
              <div className="card" key={i}>
                <strong>{ex.label}</strong>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.86rem" }}>
                  {ex.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
