import type { FieldPartStatus } from "@frckickoff/shared";
import type { KickoffApi } from "./useKickoff";
import { EditText } from "./EditText";
import { Progress } from "./Progress";

const PRIORITY_LABEL = { 1: "Day one", 2: "This week", 3: "Later" } as const;
const STATUS_LABEL: Record<FieldPartStatus, string> = { todo: "Not started", building: "Building", done: "Done" };
const STATUS_ORDER: Record<FieldPartStatus, number> = { building: 0, todo: 1, done: 2 };

export function FieldParts({ api }: { api: KickoffApi }) {
  const parts = [...api.of("fieldPart")].sort(
    (a, b) => a.data.priority - b.data.priority || STATUS_ORDER[a.data.status] - STATUS_ORDER[b.data.status],
  );
  const dayOne = parts.filter((p) => p.data.priority === 1);

  return (
    <div>
      <p className="muted">
        Seeing how the game piece actually interacts with a real field element changes the strategy, so build the
        pieces that matter to strategy first — not the whole field. 341 had parents start building on day one; in 2025
        they did one reef face and a swinging cage first and didn't build the barge until much later because it didn't
        affect their decisions. Use the FIRST Team Version drawings.
      </p>
      <div className="card">
        <div className="row-between">
          <h3 style={{ margin: 0 }}>Build order</h3>
          <Progress done={dayOne.filter((p) => p.data.status === "done").length} total={dayOne.length} label="day-one parts done" />
        </div>
        <table className="edit-table">
          <thead>
            <tr>
              <th>Field element</th>
              <th style={{ width: 120 }}>Priority</th>
              <th>Why it matters to strategy</th>
              <th style={{ width: 140 }}>Who's building</th>
              <th style={{ width: 130 }}>Status</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className={p.data.status === "done" ? "is-done" : undefined}>
                <td className="wide">
                  <EditText autoGrow value={p.data.name} onCommit={(name) => api.update(p, { name })} placeholder="e.g. One reef face" />
                </td>
                <td>
                  <select
                    aria-label="Priority"
                    value={p.data.priority}
                    onChange={(e) => api.update(p, { priority: Number(e.target.value) as 1 | 2 | 3 })}
                  >
                    {([1, 2, 3] as const).map((n) => (
                      <option key={n} value={n}>
                        {PRIORITY_LABEL[n]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="wide">
                  <EditText autoGrow value={p.data.why} onCommit={(why) => api.update(p, { why })} placeholder="What do we need to test on it?" />
                </td>
                <td>
                  <EditText value={p.data.owner} onCommit={(owner) => api.update(p, { owner })} placeholder="Name" />
                </td>
                <td>
                  <select aria-label="Status" value={p.data.status} onChange={(e) => api.update(p, { status: e.target.value as FieldPartStatus })}>
                    {(Object.keys(STATUS_LABEL) as FieldPartStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="icon-btn" aria-label="Delete field part" onClick={() => api.remove(p.id)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {parts.length === 0 && <p className="muted">No field elements yet — add the ones from this year's field drawings.</p>}
        <button
          style={{ marginTop: 8 }}
          onClick={() => api.create({ kind: "fieldPart", name: "", priority: 1, why: "", owner: "", status: "todo" })}
        >
          + Field element
        </button>
      </div>
    </div>
  );
}
