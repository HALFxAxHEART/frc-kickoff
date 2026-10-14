import type { TimelineRow } from "@frckickoff/shared";
import type { Item, KickoffApi } from "./useKickoff";
import { EditText } from "./EditText";

function nextTime(timeline: TimelineRow[]): string {
  const last = timeline[timeline.length - 1]?.t ?? "";
  const m = /^(\d+):(\d{2})$/.exec(last);
  if (!m) return timeline.length === 0 ? "Auto" : "0:00";
  const secs = Number(m[1]) * 60 + Number(m[2]) + 15;
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

function GroupCard({ group, api }: { group: Item<"smallGroup">; api: KickoffApi }) {
  const g = group.data;
  const setTimeline = (timeline: TimelineRow[]) => api.update(group, { timeline });

  return (
    <div className="card">
      <div className="vote-head">
        <EditText value={g.name} onCommit={(name) => api.update(group, { name })} placeholder="Group name" style={{ fontWeight: 600, maxWidth: 260 }} />
        <button className="icon-btn" aria-label="Delete group" onClick={() => api.remove(group.id)}>
          ×
        </button>
      </div>
      <div className="field" style={{ marginTop: 8 }}>
        <label>Members</label>
        <EditText value={g.members} onCommit={(members) => api.update(group, { members })} placeholder="4–5 names" />
      </div>
      <div className="field">
        <label>Alliance goal — how does this alliance win?</label>
        <EditText multiline rows={2} value={g.goal} onCommit={(goal) => api.update(group, { goal })} />
      </div>
      <div className="field">
        <label>Functional needs — what must the three robots be able to do?</label>
        <EditText multiline rows={2} value={g.needs} onCommit={(needs) => api.update(group, { needs })} />
      </div>
      <div className="two-col">
        <div className="field">
          <label>Auto</label>
          <EditText multiline rows={3} value={g.auto} onCommit={(auto) => api.update(group, { auto })} />
        </div>
        <div className="field">
          <label>Teleop</label>
          <EditText multiline rows={3} value={g.teleop} onCommit={(teleop) => api.update(group, { teleop })} />
        </div>
      </div>
      <div className="field">
        <label>Endgame — what's the end state?</label>
        <EditText multiline rows={2} value={g.endgame} onCommit={(endgame) => api.update(group, { endgame })} />
      </div>

      <label>Match timeline (optional — 341's best 2018 group did every ~15 seconds)</label>
      {g.timeline.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <EditText
            value={row.t}
            onCommit={(t) => setTimeline(g.timeline.map((r, j) => (j === i ? { ...r, t } : r)))}
            placeholder="0:15"
            style={{ width: 80 }}
          />
          <EditText
            value={row.state}
            onCommit={(state) => setTimeline(g.timeline.map((r, j) => (j === i ? { ...r, state } : r)))}
            placeholder="What should the field look like by now?"
            autoGrow
          />
          <button className="icon-btn" aria-label="Delete timeline row" onClick={() => setTimeline(g.timeline.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button onClick={() => setTimeline([...g.timeline, { t: nextTime(g.timeline), state: "" }])}>+ Timeline row</button>
    </div>
  );
}

export function SmallGroups({ api }: { api: KickoffApi }) {
  const groups = api.of("smallGroup");
  return (
    <div>
      <p className="muted">
        Sunday morning, groups of 4–5 each lay out an <strong>alliance strategy — not a robot design</strong>. What is the
        alliance trying to do, and what does it need from its robots? Run 5–6 groups, then each presents. 341 found that
        almost every strategy that comes up here gets tried by someone during the season, so you've already thought it
        through.
      </p>
      <div className="card good-bad">
        <div>
          <strong style={{ color: "var(--status-good)" }}>Good</strong>
          <ul>
            <li>Focuses on the parts of the field that matter</li>
            <li>Clear goals for auto, teleop and endgame</li>
            <li>A timeline of what should be true when</li>
            <li>"How do we win if we can't control X?"</li>
          </ul>
        </div>
        <div>
          <strong style={{ color: "var(--status-critical)" }}>Bad</strong>
          <ul>
            <li>Arrows on a field drawing with no words or plan</li>
            <li>Robot designs instead of alliance strategy</li>
            <li>Legs. Don't put legs on a robot.</li>
          </ul>
        </div>
      </div>
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} api={api} />
      ))}
      <button
        onClick={() =>
          api.create({
            kind: "smallGroup",
            name: `Group ${groups.length + 1}`,
            members: "",
            goal: "",
            needs: "",
            auto: "",
            teleop: "",
            endgame: "",
            timeline: [],
          })
        }
      >
        + Group
      </button>
    </div>
  );
}
