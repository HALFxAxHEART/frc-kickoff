import { useState } from "react";
import { shouldChaseRp, type RpRule } from "@frckickoff/shared";
import type { KickoffApi } from "./useKickoff";
import { EditText } from "./EditText";

const RULE_LABEL: Record<RpRule, string> = {
  always: "Every match",
  ifFavored: "Only if favored by more than its cost",
  never: "Never — just win",
};

export function MatchPlan({ api }: { api: KickoffApi }) {
  const rps = api.of("rpPlan");
  const [margin, setMargin] = useState(0);

  return (
    <div>
      <p className="muted">
        Before your first event, decide which ranking points you go for and when. Some RPs cost you scoring. In 2025, 341
        worked out that chasing the coral RP cost about 22 points of cycles, so they only went for it in quals when their
        match predictor had them ahead by more than 22. Their order: auto RP → barge RP → win → coral RP. List yours in
        priority order, then plug in the predicted margin before each match.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Ranking point priority</h3>
        <table className="edit-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>Ranking point</th>
              <th style={{ width: 130 }}>Cost (points)</th>
              <th style={{ width: 260 }}>Go for it</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {rps.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td className="wide">
                  <EditText value={r.data.name} onCommit={(name) => api.update(r, { name })} placeholder="e.g. Auto RP" />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    aria-label="Cost in points"
                    defaultValue={r.data.costPoints}
                    key={r.data.costPoints}
                    onBlur={(e) => {
                      const v = Math.max(0, Number(e.target.value) || 0);
                      if (v !== r.data.costPoints) api.update(r, { costPoints: v });
                    }}
                  />
                </td>
                <td>
                  <select aria-label="When to go for it" value={r.data.rule} onChange={(e) => api.update(r, { rule: e.target.value as RpRule })}>
                    {(Object.keys(RULE_LABEL) as RpRule[]).map((k) => (
                      <option key={k} value={k}>
                        {RULE_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="icon-btn" aria-label="Delete ranking point" onClick={() => api.remove(r.id)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button style={{ marginTop: 8 }} onClick={() => api.create({ kind: "rpPlan", name: "", costPoints: 0, rule: "always" })}>
          + Ranking point
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Before this match</h3>
        <div className="field" style={{ maxWidth: 320 }}>
          <label>Predicted margin (our alliance minus theirs, from scouting)</label>
          <input type="number" value={margin} onChange={(e) => setMargin(Number(e.target.value) || 0)} />
        </div>
        {rps.length === 0 ? (
          <p className="muted">Add your ranking points above first.</p>
        ) : (
          <ol className="rp-calls">
            {rps.map((r) => {
              const go = shouldChaseRp(r.data.rule, r.data.costPoints, margin);
              return (
                <li key={r.id}>
                  <span className={go ? "badge good" : "badge bad"}>{go ? "GO FOR IT" : "PLAY TO WIN"}</span> {r.data.name || "Unnamed RP"}
                  {r.data.rule === "ifFavored" && (
                    <span className="muted"> — costs {r.data.costPoints}, we're {margin >= 0 ? `+${margin}` : margin}</span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 0 }}>
          341's predictor just adds up each robot's scouting averages. It often overestimates (it will happily claim an
          alliance can score 24 L4s), but it shows who contributes what and roughly the margin.
        </p>
      </div>
    </div>
  );
}
