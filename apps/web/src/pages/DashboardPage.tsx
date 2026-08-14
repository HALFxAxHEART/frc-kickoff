import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTRPC } from "../lib/trpc";

const TILES = [
  { to: "/game", emoji: "📖", title: "Game Breakdown", desc: "Match timing, field zones, scoring table, and ranking points for the current game." },
  { to: "/playbook", emoji: "🧭", title: "Kickoff & Build Season Playbook", desc: "A process grounded in how 1678 and 254 actually run their first weeks — game analysis, fast prototyping, and a build timeline." },
  { to: "/cycle-time", emoji: "⏱️", title: "Cycle Time Calculator", desc: "Model pickup vs. score time and see how many pieces and points a design can realistically put up." },
  { to: "/design-matrix", emoji: "📐", title: "Robot Design Matrix", desc: "Weigh robot concepts against your own criteria and let the numbers rank them." },
  { to: "/mechanisms", emoji: "⚙️", title: "Mechanism Library", desc: "Intakes, shooters, indexers, climbers — variants, tradeoffs, and real examples." },
  { to: "/concepts", emoji: "🗂️", title: "Concepts", desc: "Save named robot concepts that bundle a design-matrix result and cycle-time scenarios." },
];

export function DashboardPage() {
  const trpc = useTRPC();
  const { data: game } = useQuery(trpc.game.current.queryOptions());

  return (
    <div>
      <h1>Kickoff Strategy</h1>
      <p className="lede">
        {game
          ? `Currently set up for ${game.year} — ${game.gameName}${game.theme ? " " + game.theme : ""}. Tell Claude the new game each Kickoff and this updates.`
          : "Loading this year's game…"}
      </p>
      <div className="card-grid" style={{ marginTop: 20 }}>
        {TILES.map((tile) => (
          <Link key={tile.to} to={tile.to} className="tile-link">
            <div className="card">
              <div className="tile-emoji">{tile.emoji}</div>
              <h3>{tile.title}</h3>
              <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
                {tile.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
