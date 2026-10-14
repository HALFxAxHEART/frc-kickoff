import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VoteChoice } from "@frckickoff/shared";
import { useTRPC } from "../../lib/trpc";
import type { KickoffApi } from "./useKickoff";
import { POLL_MS } from "./useKickoff";
import { EditText } from "./EditText";

const VOTER_KEY_STORAGE = "frckickoff-voter-key";
const OBJECTIVE_TABLE_STORAGE = "frckickoff-objective-table";

const CHOICES: { id: VoteChoice; label: string; color: string }[] = [
  { id: "need", label: "Need it", color: "var(--status-good)" },
  { id: "nice", label: "Nice to have", color: "var(--status-warning)" },
  { id: "skip", label: "Skip it", color: "var(--status-critical)" },
];

function voterKey(): string {
  let key = localStorage.getItem(VOTER_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(VOTER_KEY_STORAGE, key);
  }
  return key;
}

/** Task names from this browser's Weighted Objective Table (Playbook page), if it has been filled in. */
function objectiveTableTasks(): string[] {
  const raw = localStorage.getItem(OBJECTIVE_TABLE_STORAGE);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || !("rows" in parsed) || !Array.isArray(parsed.rows)) return [];
  return parsed.rows
    .map((r: unknown) => (typeof r === "object" && r !== null && "task" in r && typeof r.task === "string" ? r.task.trim() : ""))
    .filter((t: string) => t.length > 0);
}

export function TeamVote({ api, workspace }: { api: KickoffApi; workspace: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const key = voterKey();
  const tasks = api.of("voteTask");

  const votesKey = trpc.kickoff.votes.queryKey({ workspace, voterKey: key });
  const { data: tally = {} } = useQuery({ ...trpc.kickoff.votes.queryOptions({ workspace, voterKey: key }), refetchInterval: POLL_MS });
  const refresh = () => queryClient.invalidateQueries({ queryKey: votesKey });
  const voteMutation = useMutation(trpc.kickoff.vote.mutationOptions({ onSuccess: refresh }));
  const clearMutation = useMutation(trpc.kickoff.clearVotes.mutationOptions({ onSuccess: refresh }));

  const importable = objectiveTableTasks().filter((t) => !tasks.some((x) => x.data.task.toLowerCase() === t.toLowerCase()));

  const ranked = [...tasks].sort((a, b) => {
    const ta = tally[a.id];
    const tb = tally[b.id];
    const score = (t: typeof ta) => (t ? (t.need * 2 + t.nice - t.skip * 2) / Math.max(1, t.need + t.nice + t.skip) : 0);
    return score(tb) - score(ta);
  });

  return (
    <div>
      <p className="muted">
        After the objective table, everyone votes on each scoring task from their own phone. This is 341's "voted focus" —
        it has <strong>no power over the decision</strong>. It gives the whole team a voice while you're still together,
        and shows where people disagree so you know what to talk about.
      </p>
      {(voteMutation.error ?? clearMutation.error) && <p className="error">{(voteMutation.error ?? clearMutation.error)?.message}</p>}

      <div className="card">
        {ranked.map((t) => {
          const v = tally[t.id] ?? { need: 0, nice: 0, skip: 0, mine: null };
          const total = v.need + v.nice + v.skip;
          return (
            <div key={t.id} className="vote-row">
              <div className="vote-head">
                <EditText value={t.data.task} onCommit={(task) => api.update(t, { task })} placeholder="Scoring task" />
                <button className="icon-btn" aria-label="Delete task" onClick={() => api.remove(t.id)}>
                  ×
                </button>
              </div>
              <div className="vote-buttons">
                {CHOICES.map((c) => (
                  <button
                    key={c.id}
                    className={v.mine === c.id ? "vote-btn selected" : "vote-btn"}
                    style={{ ["--vote-color" as string]: c.color }}
                    onClick={() => voteMutation.mutate({ itemId: t.id, voterKey: key, choice: v.mine === c.id ? null : c.id })}
                  >
                    {c.label} · {v[c.id]}
                  </button>
                ))}
              </div>
              <div className="vote-bar" aria-label={`${v.need} need, ${v.nice} nice, ${v.skip} skip`}>
                {total > 0 &&
                  CHOICES.map((c) => (
                    <div key={c.id} style={{ width: `${(v[c.id] / total) * 100}%`, background: c.color }} />
                  ))}
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && <p className="muted">No tasks to vote on yet.</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={() => api.create({ kind: "voteTask", task: "" })}>+ Task</button>
          {importable.length > 0 && (
            <button onClick={() => importable.forEach((task) => api.create({ kind: "voteTask", task }))}>
              Import {importable.length} task{importable.length === 1 ? "" : "s"} from my Objective Table
            </button>
          )}
          {tasks.length > 0 && (
            <button
              className="danger"
              onClick={() => {
                if (window.confirm("Clear every vote on this board? Tasks stay.")) clearMutation.mutate({ workspace });
              }}
            >
              Clear all votes
            </button>
          )}
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.8rem" }}>
        One vote per device; tap your choice again to take it back. Tasks are sorted by how much the team wants them.
      </p>
    </div>
  );
}
