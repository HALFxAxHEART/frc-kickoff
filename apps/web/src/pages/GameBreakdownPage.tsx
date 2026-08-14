import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";

export function GameBreakdownPage() {
  const trpc = useTRPC();
  const { data: game, isLoading } = useQuery(trpc.game.current.queryOptions());

  if (isLoading) return <p className="muted">Loading…</p>;
  if (!game) return <p className="empty-state">No game loaded yet.</p>;

  const matchMinutes = Math.floor(game.matchDurationSeconds / 60);
  const matchSeconds = game.matchDurationSeconds % 60;

  return (
    <div>
      <h1>
        {game.year} — {game.gameName}
      </h1>
      {game.theme && <p className="muted" style={{ marginTop: -4 }}>{game.theme}</p>}
      <p className="lede">{game.summary}</p>

      <h2>Match Timeline ({matchMinutes}:{String(matchSeconds).padStart(2, "0")} total)</h2>
      <div className="chart-wrap">
        <PhaseTimeline phases={game.phases} totalSeconds={game.matchDurationSeconds} />
      </div>
      <table>
        <thead>
          <tr>
            <th>Phase</th>
            <th>Duration</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {game.phases.map((phase) => (
            <tr key={phase.id}>
              <td>{phase.label}</td>
              <td>{phase.durationSeconds}s</td>
              <td className="muted">{phase.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Field Zones</h2>
      <div className="card-grid">
        {game.fieldZones.map((zone) => (
          <div className="card" key={zone.id}>
            <h3>{zone.label}</h3>
            <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
              {zone.description}
            </p>
          </div>
        ))}
      </div>

      <h2>Scoring</h2>
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Auto</th>
            <th>Teleop</th>
            <th>Cycle-able?</th>
            <th>Mechanisms</th>
          </tr>
        </thead>
        <tbody>
          {game.scoringActions.map((action) => (
            <tr key={action.id}>
              <td>
                <strong>{action.label}</strong>
                <div className="muted" style={{ fontSize: "0.82rem" }}>
                  {action.description}
                </div>
              </td>
              <td>{action.pointsAuto ?? "—"}</td>
              <td>{action.pointsTeleop ?? "—"}</td>
              <td>{action.cycleable ? "Yes" : "One-time"}</td>
              <td>
                {action.mechanismTags.map((tag) => (
                  <span key={tag} className="badge" style={{ marginRight: 4 }}>
                    {tag}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Ranking Points</h2>
      <table>
        <thead>
          <tr>
            <th>RP</th>
            <th>Condition</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {game.rankingPoints.map((rp) => (
            <tr key={rp.id}>
              <td>{rp.label}</td>
              <td className="muted">{rp.description}</td>
              <td>{rp.points}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Notable Rules</h2>
      <ul>
        {game.notableRules.map((rule, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            {rule}
          </li>
        ))}
      </ul>

      <p className="source-note">{game.sourceNote}</p>
    </div>
  );
}

function PhaseTimeline({ phases, totalSeconds }: { phases: { id: string; label: string; durationSeconds: number }[]; totalSeconds: number }) {
  const width = 900;
  const height = 56;
  const seriesColors = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)", "var(--series-7)", "var(--series-8)"];
  let x = 0;
  const gap = 2;

  return (
    <svg width={width} height={height} role="img" aria-label="Match phase timeline">
      {phases.map((phase, i) => {
        const w = Math.max(0, (phase.durationSeconds / totalSeconds) * width - gap);
        const rect = (
          <g key={phase.id}>
            <rect x={x} y={8} width={w} height={28} rx={4} fill={seriesColors[i % seriesColors.length]} />
            <text x={x + w / 2} y={52} textAnchor="middle" fontSize="11" fill="var(--text-secondary)">
              {phase.label}
            </text>
          </g>
        );
        x += w + gap;
        return rect;
      })}
    </svg>
  );
}
