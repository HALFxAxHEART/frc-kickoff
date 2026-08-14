import { NavLink, Routes, Route } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { GameBreakdownPage } from "./pages/GameBreakdownPage";
import { CycleTimePage } from "./pages/CycleTimePage";
import { DesignMatrixPage } from "./pages/DesignMatrixPage";
import { MechanismLibraryPage } from "./pages/MechanismLibraryPage";
import { ConceptsPage } from "./pages/ConceptsPage";
import { PlaybookPage } from "./pages/PlaybookPage";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/game", label: "Game Breakdown" },
  { to: "/playbook", label: "Playbook" },
  { to: "/cycle-time", label: "Cycle Time" },
  { to: "/design-matrix", label: "Design Matrix" },
  { to: "/mechanisms", label: "Mechanisms" },
  { to: "/concepts", label: "Concepts" },
];

export function App() {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <NavLink to="/" className="brand">
          🏗️ FRC Kickoff
        </NavLink>
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/game" element={<GameBreakdownPage />} />
          <Route path="/playbook" element={<PlaybookPage />} />
          <Route path="/cycle-time" element={<CycleTimePage />} />
          <Route path="/design-matrix" element={<DesignMatrixPage />} />
          <Route path="/mechanisms" element={<MechanismLibraryPage />} />
          <Route path="/concepts" element={<ConceptsPage />} />
        </Routes>
      </main>
    </div>
  );
}
