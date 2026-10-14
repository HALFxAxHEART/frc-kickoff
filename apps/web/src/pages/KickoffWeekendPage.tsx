import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_WORKSPACE } from "@frckickoff/shared";
import { useTRPC } from "../lib/trpc";
import { useKickoff } from "../features/kickoff/useKickoff";
import { RunOfShow } from "../features/kickoff/RunOfShow";
import { FieldParts } from "../features/kickoff/FieldParts";
import { MockGame } from "../features/kickoff/MockGame";
import { TeamVote } from "../features/kickoff/TeamVote";
import { SmallGroups } from "../features/kickoff/SmallGroups";
import { DeepDive } from "../features/kickoff/DeepDive";
import { WillDo } from "../features/kickoff/WillDo";
import { MatchPlan } from "../features/kickoff/MatchPlan";

const TABS = [
  { id: "run", label: "1. Run of Show" },
  { id: "field", label: "2. Field Parts" },
  { id: "mock", label: "3. Mock Game" },
  { id: "vote", label: "4. Team Vote" },
  { id: "groups", label: "5. Small Groups" },
  { id: "deepdive", label: "6. Deep Dive" },
  { id: "willdo", label: "7. Robot Will Do" },
  { id: "match", label: "Match Plan" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function KickoffWeekendPage() {
  // URL is the source of truth for both workspace and tab (same pattern as Simulate), so a link
  // like /weekend?ws=2027&tab=vote can be texted to the whole team on kickoff day.
  const [searchParams, setSearchParams] = useSearchParams();
  const workspace = searchParams.get("ws")?.trim() || DEFAULT_WORKSPACE;
  const fromQuery = searchParams.get("tab") as TabId | null;
  const tab: TabId = fromQuery && TABS.some((t) => t.id === fromQuery) ? fromQuery : "run";

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const api = useKickoff(workspace);
  const { data: workspaces = [] } = useQuery(trpc.kickoff.workspaces.queryOptions());
  const seedMutation = useMutation(
    trpc.kickoff.seed.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.kickoff.items.queryKey({ workspace }) });
        queryClient.invalidateQueries({ queryKey: trpc.kickoff.workspaces.queryKey() });
      },
    }),
  );
  const [newName, setNewName] = useState("");

  function setParam(key: "ws" | "tab", value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      return next;
    });
  }

  const allWorkspaces = workspaces.includes(workspace) ? workspaces : [...workspaces, workspace];

  return (
    <div>
      <h1>Kickoff Weekend</h1>
      <p className="lede">
        The live board for kickoff weekend, following Team 341 Miss Daisy's process: read the rules → field parts → mock
        game → objective table → team vote → small groups → deep dive → a Robot Will Do list everyone signs off on.
        Everyone can edit from their own phone and changes show up for everyone within a few seconds.
      </p>

      <div className="card workspace-bar">
        <div className="field" style={{ margin: 0 }}>
          <label>Board</label>
          <select value={workspace} onChange={(e) => setParam("ws", e.target.value)}>
            {allWorkspaces.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>New board (e.g. a fall practice run on an old game)</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} placeholder="Practice – REEFSCAPE" />
            <button
              disabled={!newName.trim()}
              onClick={() => {
                setParam("ws", newName.trim());
                setNewName("");
              }}
            >
              Open
            </button>
          </div>
        </div>
      </div>

      {api.error && <p className="error">Couldn't reach the server: {api.error.message}</p>}

      {api.isEmpty ? (
        <div className="card empty-state">
          <h3>Board "{workspace}" is empty</h3>
          <p className="muted">
            Set it up with the default run-of-show for 5090's kickoff (Southgate Saturday, shop Saturday night, split
            Sunday) and 341's eight deep-dive questions. Everything is editable afterwards.
          </p>
          <button className="primary" disabled={seedMutation.isPending} onClick={() => seedMutation.mutate({ workspace })}>
            Set up this board
          </button>
          {seedMutation.error && <p className="error">{seedMutation.error.message}</p>}
        </div>
      ) : api.loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={t.id === tab ? "active" : ""} onClick={() => setParam("tab", t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === "run" && <RunOfShow api={api} />}
          {tab === "field" && <FieldParts api={api} />}
          {tab === "mock" && <MockGame api={api} />}
          {tab === "vote" && <TeamVote api={api} workspace={workspace} />}
          {tab === "groups" && <SmallGroups api={api} />}
          {tab === "deepdive" && <DeepDive api={api} />}
          {tab === "willdo" && <WillDo api={api} />}
          {tab === "match" && <MatchPlan api={api} />}
        </>
      )}

      <p className="source-note">
        Process from Sean Stevens (Team 341 Miss Daisy drive coach), "Kickoff and Competition Strategy," Comcast Bootcamp,
        Dec 7, 2025 — recording on the FRC Team 316 YouTube channel. The Robot Will Do list idea is credited there to Team
        118 Robonauts. Times in the run of show are a suggested fit to 5090's kickoff schedule, not 341's.
      </p>
    </div>
  );
}
