import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface ChecklistItem {
  id: string;
  text: string;
}

function useLocalChecklist(storageKey: string) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      // ignore malformed/local-storage-unavailable cases — checklist just starts empty
    }
  }, [storageKey]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // best-effort persistence only
      }
      return next;
    });
  }

  return { checked, toggle };
}

function Checklist({ storageKey, items }: { storageKey: string; items: ChecklistItem[] }) {
  const { checked, toggle } = useLocalChecklist(storageKey);
  return (
    <div className="card">
      {items.map((item) => (
        <label key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, width: "auto" }}>
          <input type="checkbox" style={{ width: "auto", marginTop: 3 }} checked={!!checked[item.id]} onChange={() => toggle(item.id)} />
          <span style={{ color: checked[item.id] ? "var(--text-muted)" : "var(--text-primary)", textDecoration: checked[item.id] ? "line-through" : "none" }}>
            {item.text}
          </span>
        </label>
      ))}
    </div>
  );
}

const KICKOFF_DAY_ITEMS: ChecklistItem[] = [
  { id: "match-flow", text: "Match structure & timing — how long is auto, how many phases does teleop have, what happens in endgame?" },
  { id: "scoring-types", text: "Scoring type per action — is it linear (every piece worth the same) or threshold (bonuses at specific counts)?" },
  { id: "placement-types", text: "Placement type per action — stacking, shooting from distance, placing precisely, or just carrying to a zone?" },
  { id: "human-player", text: "Human player role — what can they do, and does that change robot design (e.g. do you need an intake at all)?" },
  { id: "ranking-points", text: "Ranking point conditions — which ones are realistic for your team's likely skill level, and which are stretch goals?" },
  { id: "defense", text: "Defense implications — can this game be played defensively, and does that change what \"good\" looks like?" },
];

const FIRST_DAYS_ITEMS: ChecklistItem[] = [
  { id: "shortlist", text: "Shortlist 2-3 competing concepts for the mechanism that matters most this year — don't lock in the first idea on the whiteboard." },
  { id: "prototype", text: "Build cheap, ugly prototypes of each shortlisted concept before doing real CAD on any of them." },
  { id: "decide-fast", text: "Decide from what the prototypes showed, not from more debate — set a deadline for picking a winner and stick to it." },
  { id: "parallel", text: "Once a mechanism is decided, start fabricating it while later mechanisms are still being prototyped — don't wait for the whole robot to be \"final\" before cutting metal." },
];

export function PlaybookPage() {
  return (
    <div>
      <h1>Kickoff &amp; Build Season Playbook</h1>
      <p className="lede">
        A process, not just a mechanism list — grounded in how two of FRC's most consistently competitive teams
        actually run their first weeks: <strong>1678 Citrus Circuits</strong> (Davis, CA) and{" "}
        <strong>254 The Cheesy Poofs</strong> (San Jose, CA).
      </p>

      <h2>1. Kickoff Day — Read the Game Like a Strategist First</h2>
      <p>
        1678 runs a dedicated Strategy subteam that analyzes every new game before anyone touches CAD — breaking it
        into match flow, scoring types, placement types, and human-player role, the same way a Game Design Committee
        would evaluate it. The temptation on kickoff day is to jump straight to "what should the robot look like."
        Resist it for the first hour or two — work through this instead:
      </p>
      <Checklist storageKey="frckickoff-checklist-kickoff-day" items={KICKOFF_DAY_ITEMS} />
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        The <Link to="/game">Game Breakdown</Link> page on this site is laid out to answer most of this directly —
        use it as your worksheet.
      </p>

      <h2>2. First Days — Prototype, Don't Debate</h2>
      <p>
        254's own kickoff-week build log (Ultimate Ascent, January 2013) is a good record of this in practice: on
        kickoff day they started prototyping three completely different shooter concepts in parallel — a radius
        design, a linear design, and a thrower-arm design — rather than debating which one was best on paper. Two
        days later they'd made a fast, confident call on frame size and drivetrain through continuous mentor/student
        conversation instead of a long, formal design review. By day ten the baseplate was finalized and out the
        door to sponsors for cutting — design and manufacturing running in parallel, not sequentially.
      </p>
      <Checklist storageKey="frckickoff-checklist-first-days" items={FIRST_DAYS_ITEMS} />

      <h2>3. Prioritize With Numbers, Not Gut Feel</h2>
      <p>
        Both teams' strategy process comes down to the same move: compare how long a scoring action realistically
        takes against how many points it's worth, and let that ranking decide what gets built first — not
        excitement about a cool mechanism. That's exactly what the{" "}
        <Link to="/cycle-time">Cycle Time Calculator</Link> on this site is for: model a scoring action's real
        pickup/travel/score time, see the points-per-match it actually produces, and compare it against other
        actions before committing build time to one over another.
      </p>

      <h2>4. Build Season Timeline</h2>
      <p>
        FIRST retired the mandatory "Stop Build Day" / Bag Day deadline back in the 2020 season — there's no
        official cutoff anymore, and your build season runs however long you want between Kickoff and your first
        event. Most teams still self-impose a timeline because an open-ended one tends to slip. Here's a reasonable
        default to adapt, not a rule:
      </p>
      <table>
        <thead>
          <tr>
            <th>Window</th>
            <th>Focus</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Kickoff weekend</td>
            <td>Game breakdown, drivetrain decision, shortlist 2-3 concepts per key mechanism.</td>
          </tr>
          <tr>
            <td>Week 1</td>
            <td>Parallel prototyping of shortlisted concepts. No CAD-final decisions yet.</td>
          </tr>
          <tr>
            <td>Weeks 2-3</td>
            <td>Lock mechanism designs from prototype results, start fabrication, begin drivetrain code.</td>
          </tr>
          <tr>
            <td>Weeks 4-5</td>
            <td>Integration — subsystems onto one chassis, wiring, full-robot programming begins in earnest.</td>
          </tr>
          <tr>
            <td>Week 6+</td>
            <td>Drive practice, autonomous tuning, reliability passes — budget more of this than feels necessary.</td>
          </tr>
        </tbody>
      </table>

      <h2>Further Resources</h2>
      <div className="card-grid">
        <div className="card">
          <h3>Citrus Circuits Scouting Whitepapers</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            1678 publishes a technical whitepaper on their scouting system every year — the process and lessons
            learned generalize well beyond their specific software.
          </p>
          <a href="https://www.citruscircuits.org/scouting" target="_blank" rel="noreferrer">
            citruscircuits.org/scouting
          </a>
        </div>
        <div className="card">
          <h3>Citrus Circuits Training Resources</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Public training material across hardware design, fabrication, electrical, software, and strategy.
          </p>
          <a href="https://www.citruscircuits.org/training-resources" target="_blank" rel="noreferrer">
            citruscircuits.org/training-resources
          </a>
        </div>
        <div className="card">
          <h3>Citrus Circuits Fall Workshops</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Annual technical workshop series (2015-present) covering pre-season prep through competition strategy.
          </p>
          <a href="https://www.youtube.com/@CitrusCircuits" target="_blank" rel="noreferrer">
            youtube.com/@CitrusCircuits
          </a>
        </div>
        <div className="card">
          <h3>254's Build Blog</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Their build-season blog archive is a genuinely useful read for day-by-day decision-making, not just
            highlight-reel robot reveals.
          </p>
          <a href="https://www.team254.com/blog/" target="_blank" rel="noreferrer">
            team254.com/blog
          </a>
        </div>
      </div>

      <p className="source-note">
        Team-specific claims above are drawn from public sources (Citrus Circuits' own site, 254's build-season
        blog archive) as of 2026-08-14 — team practices evolve year to year, so treat this as a starting framework
        to adapt, not a script to copy exactly.
      </p>
    </div>
  );
}
