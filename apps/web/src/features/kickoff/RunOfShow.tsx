import { CHECKLIST_PHASES, type ChecklistPhase } from "@frckickoff/shared";
import type { KickoffApi } from "./useKickoff";
import { EditText } from "./EditText";
import { Progress } from "./Progress";

export function RunOfShow({ api }: { api: KickoffApi }) {
  const rows = api.of("checklist");

  function add(phase: ChecklistPhase) {
    api.create({ kind: "checklist", phase, time: "", label: "", owner: "", done: false });
  }

  return (
    <div>
      <p className="muted">
        The whole weekend in order. Saturday is a full-team strategy day; Sunday the team splits — build starts field
        parts and prototyping while strategy keeps going. Tick things off as you go; everyone sees the same list.
      </p>
      {CHECKLIST_PHASES.map((phase) => {
        const phaseRows = rows.filter((r) => r.data.phase === phase.id);
        const done = phaseRows.filter((r) => r.data.done).length;
        return (
          <div className="card" key={phase.id}>
            <div className="row-between">
              <h3 style={{ margin: 0 }}>{phase.label}</h3>
              <Progress done={done} total={phaseRows.length} />
            </div>
            <table className="edit-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th style={{ width: 110 }}>When</th>
                  <th>Step</th>
                  <th style={{ width: 150 }}>Owner</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {phaseRows.map((r) => (
                  <tr key={r.id} className={r.data.done ? "is-done" : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label="Done"
                        checked={r.data.done}
                        onChange={(e) => api.update(r, { done: e.target.checked })}
                      />
                    </td>
                    <td>
                      <EditText value={r.data.time} onCommit={(time) => api.update(r, { time })} placeholder="Time" />
                    </td>
                    <td className="wide">
                      <EditText autoGrow value={r.data.label} onCommit={(label) => api.update(r, { label })} placeholder="What happens" />
                    </td>
                    <td className="owner">
                      <EditText value={r.data.owner} onCommit={(owner) => api.update(r, { owner })} placeholder="Who" />
                    </td>
                    <td>
                      <button className="icon-btn" aria-label="Delete step" onClick={() => api.remove(r.id)}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button style={{ marginTop: 8 }} onClick={() => add(phase.id)}>
              + Step
            </button>
          </div>
        );
      })}
    </div>
  );
}
