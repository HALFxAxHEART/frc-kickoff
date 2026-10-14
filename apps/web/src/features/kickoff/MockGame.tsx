import type { MockVerdict } from "@frckickoff/shared";
import type { KickoffApi } from "./useKickoff";
import { EditText } from "./EditText";
import { Progress } from "./Progress";

const VERDICT_LABEL: Record<MockVerdict, string> = {
  unsure: "Not sure yet",
  real: "Real — robots could do this",
  artifact: "Mock-game artifact (humans only)",
};

function NumberCell({ value, onCommit, label }: { value: number | null; onCommit: (v: number | null) => void; label: string }) {
  return (
    <input
      type="number"
      min={0}
      aria-label={label}
      placeholder="—"
      defaultValue={value ?? ""}
      key={value ?? "empty"}
      onBlur={(e) => {
        const next = e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value)));
        if (next !== value) onCommit(next);
      }}
      style={{ width: 80 }}
    />
  );
}

export function MockGame({ api }: { api: KickoffApi }) {
  const props = api.of("mockProp");
  const tests = api.of("mockTest");

  return (
    <div>
      <p className="muted">
        Right after reading the rules, play the game with people as robots. Have a couple of mock-game coaches set up the
        field while everyone else reads the rules — they only need the field layout. Then run test matches that answer
        a real question. 341's 2025 test: one alliance could only load from the human player, the other could pick up
        off the floor. The floor alliance won by about 20 pieces, so a floor intake went on the must-have list.
      </p>

      <div className="card">
        <div className="row-between">
          <h3 style={{ margin: 0 }}>Field stand-ins</h3>
          <Progress done={props.filter((p) => p.data.ready).length} total={props.length} label="ready" />
        </div>
        <p className="muted" style={{ fontSize: "0.82rem" }}>
          Things 341 has used: folded lunch tables (reef), a half-taped-shut tote (speaker), paper plates (notes), red
          solo cups (cones), cardboard boxes (cages), old outreach-robot goals turned sideways.
        </p>
        <table className="edit-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>Ready</th>
              <th>Field element / game piece</th>
              <th>Stand-in</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {props.map((p) => (
              <tr key={p.id}>
                <td>
                  <input type="checkbox" aria-label="Ready" checked={p.data.ready} onChange={(e) => api.update(p, { ready: e.target.checked })} />
                </td>
                <td className="wide">
                  <EditText autoGrow value={p.data.element} onCommit={(element) => api.update(p, { element })} placeholder="e.g. Game piece" />
                </td>
                <td className="wide">
                  <EditText autoGrow value={p.data.standIn} onCommit={(standIn) => api.update(p, { standIn })} placeholder="e.g. Paper plates" />
                </td>
                <td>
                  <button className="icon-btn" aria-label="Delete stand-in" onClick={() => api.remove(p.id)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button style={{ marginTop: 8 }} onClick={() => api.create({ kind: "mockProp", element: "", standIn: "", ready: false })}>
          + Stand-in
        </button>
      </div>

      <h3>Test matches</h3>
      <p className="muted" style={{ fontSize: "0.82rem" }}>
        Ask one question per match and change one thing between alliances. Watch for strategies that only work because
        humans are good at catching and passing — 341 saw feeding in their 2024 mock game and had to decide whether it
        was real (it was).
      </p>
      {tests.map((t, i) => (
        <div className="card" key={t.id}>
          <div className="row-between">
            <strong>Match {i + 1}</strong>
            <button className="icon-btn" aria-label="Delete test match" onClick={() => api.remove(t.id)}>
              ×
            </button>
          </div>
          <div className="field">
            <label>Question we're testing</label>
            <EditText autoGrow value={t.data.question} onCommit={(question) => api.update(t, { question })} placeholder="e.g. How much does a floor intake matter?" />
          </div>
          <div className="field">
            <label>Setup — what's different between alliances</label>
            <EditText
              autoGrow
              value={t.data.setup}
              onCommit={(setup) => api.update(t, { setup })}
              placeholder="e.g. Red: human-player loading only. Blue: pieces thrown onto the floor, pick up anywhere."
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Red score</label>
              <NumberCell value={t.data.redScore} onCommit={(redScore) => api.update(t, { redScore })} label="Red score" />
            </div>
            <div className="field">
              <label>Blue score</label>
              <NumberCell value={t.data.blueScore} onCommit={(blueScore) => api.update(t, { blueScore })} label="Blue score" />
            </div>
            <div className="field">
              <label>Real or artifact?</label>
              <select value={t.data.verdict} onChange={(e) => api.update(t, { verdict: e.target.value as MockVerdict })}>
                {(Object.keys(VERDICT_LABEL) as MockVerdict[]).map((v) => (
                  <option key={v} value={v}>
                    {VERDICT_LABEL[v]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>What we learned</label>
            <EditText multiline value={t.data.takeaway} onCommit={(takeaway) => api.update(t, { takeaway })} placeholder="e.g. Floor pickup = ~20 more pieces. Floor intake is a must." />
          </div>
        </div>
      ))}
      <button
        onClick={() =>
          api.create({ kind: "mockTest", question: "", setup: "", redScore: null, blueScore: null, takeaway: "", verdict: "unsure" })
        }
      >
        + Test match
      </button>
    </div>
  );
}
