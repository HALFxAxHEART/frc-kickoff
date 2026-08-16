import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ObjectiveTable } from "../features/playbook/ObjectiveTable";

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

const DEEP_DIVE_ITEMS: ChecklistItem[] = [
  { id: "rp-scenarios", text: "What are the realistic scenarios to earn every ranking point this game offers?" },
  { id: "scoring-detail", text: "How does scoring actually work, in full detail — not just the point values?" },
  { id: "match-flow-detail", text: "What will match flow look like, phase by phase, for a strong alliance?" },
  { id: "non-scoring", text: "Are there non-scoring tasks (defense, blocking a shared resource, denying the opponent) that could swing a match?" },
  { id: "quals-vs-playoffs", text: "How does optimal strategy change between qualification matches and playoffs?" },
  { id: "ignorable", text: "What parts of the game can you ignore entirely and still be competitive?" },
  { id: "elite-vs-good", text: "What will separate an elite robot from a merely good one this year?" },
  { id: "control-destiny", text: "How can you control your own match outcome, independent of who you're paired with?" },
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
        A process, not just a mechanism list — grounded in how consistently competitive teams actually run their
        first weeks and their events: <strong>1678 Citrus Circuits</strong> (Davis, CA),{" "}
        <strong>254 The Cheesy Poofs</strong> (San Jose, CA), and <strong>341 Miss Daisy</strong>{" "}
        (Ambler, PA — 2025 FIRST Mid-Atlantic District Springside Chestnut Hill winner).
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
      <p>
        For a concrete example of this in practice, 254's 2014 kickoff-day blog post walks through exactly this
        sequence: a full-team read-through of the game manual, a list of clarifying questions drafted for FIRST, and
        a strategy scoring spreadsheet ranking scoring actions by value — all before lunch, with prototyping starting
        that same afternoon.
      </p>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        <strong>Build the field parts early.</strong> Seeing and physically handling actual field elements changes
        the decisions you make far more than reading dimensions off a PDF — if you have parents or mentors free on
        kickoff weekend, put them on constructing field parts (from the official field drawings released alongside
        the manual) while the team works through strategy, prioritizing whichever elements are most strategically
        significant first.
      </p>
      <p>Once the rules make sense, push past the surface-level scoring table into questions that actually change design decisions:</p>
      <Checklist storageKey="frckickoff-checklist-deep-dive" items={DEEP_DIVE_ITEMS} />
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        <strong>Write a Robot "Will Do" List.</strong> A short, low-detail list of everything the robot must be able
        to do for the season to count as a success — not a spec sheet, just a checkable list the whole team can
        agree on in the first day or two and revisit periodically to stay focused as build season gets noisy.
      </p>

      <h2>2. Weighted Objective Table — Rank Scoring Tasks by Real Value</h2>
      <p>
        A simple point-value ranking overrates tasks that are miserable to design for and underrates tasks that
        quietly unlock a ranking point. This tool — the core of Team 341 Miss Daisy's own kickoff process — scores
        every scoring task on three separate weights (points, ease of design, ranking-point contribution) and adds
        them into one comparable number, so the "what should we build first" conversation runs on the same numbers
        for everyone in the room.
      </p>
      <ObjectiveTable />
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        This table tells you what you already suspect, not something magic — its real value is forcing everyone to
        commit to numbers instead of vibes before the debate starts. Pair it with an informal team vote (need it /
        don't need it, per task) done live in the room — the vote has no power over the result, but surfaces where
        the room actually disagrees with what the math says, which is usually worth a conversation.
      </p>

      <h2>3. First Days — Prototype, Don't Debate</h2>
      <p>
        254's own kickoff-week build log (Ultimate Ascent, January 2013) is a good record of this in practice: on
        kickoff day they started prototyping three completely different shooter concepts in parallel — a radius
        design, a linear design, and a thrower-arm design — rather than debating which one was best on paper. Two
        days later they'd made a fast, confident call on frame size and drivetrain through continuous mentor/student
        conversation instead of a long, formal design review. By day ten the baseplate was finalized and out the
        door to sponsors for cutting — design and manufacturing running in parallel, not sequentially.
      </p>
      <Checklist storageKey="frckickoff-checklist-first-days" items={FIRST_DAYS_ITEMS} />

      <h2>4. Prioritize With Numbers, Not Gut Feel</h2>
      <p>
        Both teams' strategy process comes down to the same move: compare how long a scoring action realistically
        takes against how many points it's worth, and let that ranking decide what gets built first — not
        excitement about a cool mechanism. That's exactly what the{" "}
        <Link to="/cycle-time">Cycle Time Calculator</Link> on this site is for: model a scoring action's real
        pickup/travel/score time, see the points-per-match it actually produces, and compare it against other
        actions before committing build time to one over another. Use it alongside the weighted objective table
        above — cycle time tells you how fast a task really is once you can do it; the objective table tells you
        whether it's worth building at all.
      </p>

      <h2>5. Build Season Timeline</h2>
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

      <h2>6. Organize the Team</h2>
      <p>
        Kickoff weekend is also when it's easiest to sort out who's doing what — before build season pressure makes
        it awkward to renegotiate. 1678's real subteam breakdown is a solid model to adapt for a team of almost any
        size (scale it down to "one person wearing this hat" if you're small, rather than skipping it):
      </p>
      <div className="card-grid">
        <div className="card">
          <h3>Hardware Design</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>CAD, mechanism design, prototyping decisions.</p>
        </div>
        <div className="card">
          <h3>Hardware Fabrication</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>Machining, assembly, turning CAD into real parts.</p>
        </div>
        <div className="card">
          <h3>Hardware Electrical</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>Wiring, power distribution, pneumatics, sensors.</p>
        </div>
        <div className="card">
          <h3>Software (Robot)</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>Drivetrain code, mechanism control, autonomous.</p>
        </div>
        <div className="card">
          <h3>Software (Scouting)</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>Match data collection and analysis tooling — this is the subteam behind 1678's well-known scouting system.</p>
        </div>
        <div className="card">
          <h3>Business &amp; Media</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>Sponsorship, outreach, documentation, awards.</p>
        </div>
        <div className="card">
          <h3>Strategy <span className="badge" style={{ marginLeft: 4 }}>secondary</span></h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>Game analysis and match strategy — opt-in on top of a primary subteam above, at 1678.</p>
        </div>
        <div className="card">
          <h3>Impact Award <span className="badge" style={{ marginLeft: 4 }}>secondary</span></h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>FIRST's top team award — community impact, not just robot performance.</p>
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.8rem" }}>
        Source: <a href="https://www.citruscircuits.org/subteams" target="_blank" rel="noreferrer">citruscircuits.org/subteams</a>.
        Strategy and Impact Award are secondary/opt-in subteams at 1678, layered on top of a primary assignment above
        — not everyone needs one, but it's worth deciding on purpose rather than by default.
      </p>

      <h2>7. Set Team Goals — Expectations vs. Stretch</h2>
      <p>
        Team 341 sets two distinct kinds of season goals rather than one blended list: <strong>expectations</strong>{" "}
        (grounded in your team's actual past performance — win rate, ranking points, how deep you've gone in
        playoffs before) and <strong>goals</strong> (a deliberate stretch beyond that). Keeping them separate makes
        it possible to tell "we did about as well as we usually do" apart from "we actually grew this year," instead
        of one number blurring both. Make every goal SMART, and be honest about what you actually want rather than
        a safe, easily-hit number:
      </p>
      <div className="card-grid">
        <div className="card">
          <h3>S — Specific</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>Narrow enough to plan against, not a vague aspiration.</p>
        </div>
        <div className="card">
          <h3>M — Measurable</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>You and your progress toward it can both be tracked with a number.</p>
        </div>
        <div className="card">
          <h3>A — Achievable</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>Reachable within the season, given your team's actual resources.</p>
        </div>
        <div className="card">
          <h3>R — Relevant</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>Aligned with your team's real values and long-term objectives.</p>
        </div>
        <div className="card">
          <h3>T — Time-based</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>A realistic but ambitious end date to force prioritization.</p>
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        <strong>Growth mindset, in practice:</strong> the healthiest way to hold these goals through a rough
        competition is to focus on the process of playing well, not just whether you won — treat every match as a
        chance to get better, prepare and practice deliberately, sweat the details, and correct mistakes one match at
        a time rather than spiraling over a bad qual round. Teams that "play to improve" tend to outlast teams that
        are only "playing to not lose."
      </p>

      <h2>8. Scouting &amp; the Match-Day Strategy Loop</h2>
      <p>
        Scouting only pays off if it feeds a real loop — data in, a decision out, every match. A workable structure
        that scales from a handful of scouts to a large team:
      </p>
      <div className="card-grid">
        <div className="card">
          <h3>Why scout at all</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            To build match strategies, give the drive team real feedback, build alliance-selection picklists, and
            prepare playoff strategy — four distinct jobs, not one generic "collect data" task.
          </p>
        </div>
        <div className="card">
          <h3>Roles &amp; data flow</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Coach → scouting leads → match scouts and pit scouts, feeding one shared database that a match
            predictor/analyst can query before every match. It doesn't need to be fancy software — a shared
            spreadsheet works at small scale; the roles and the loop matter more than the tooling.
          </p>
        </div>
        <div className="card">
          <h3>Pre-match</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Pull each upcoming team's scouted data, get a quick expected-points read for both alliances, and hand
            that to the drive team before they're on the field — not after.
          </p>
        </div>
        <div className="card">
          <h3>Post-match</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Review what actually happened (video helps) with the drive team right after the match, log what to do
            differently, and let scouts flag back to the analyst anything they want tracked differently going
            forward — the loop only works if it closes.
          </p>
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        At the end of an event (or the season), review your goals honestly: did you hit them, did you put in your
        best effort toward them regardless of outcome, what did you actually learn, and what would you do
        differently next time? That review is what turns next year's expectations into something grounded in real
        data instead of a guess.
      </p>

      <h2>Further Resources</h2>

      <h3>From 1678 Citrus Circuits</h3>
      <div className="card-grid">
        <div className="card">
          <h3>Scouting Whitepapers</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            A technical whitepaper on their scouting system every year — the process and lessons learned generalize
            well beyond their specific software.
          </p>
          <a href="https://www.citruscircuits.org/scouting" target="_blank" rel="noreferrer">
            citruscircuits.org/scouting
          </a>
        </div>
        <div className="card">
          <h3>Strategic Design Workshop</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            1678's own Strategic Design deck — how they run game analysis before mechanism design, straight from
            their Fall Workshop Series.
          </p>
          <a
            href="https://www.citruscircuits.org/uploads/6/9/3/4/6934550/strategic_design_2022.pdf"
            target="_blank"
            rel="noreferrer"
          >
            Strategic Design (PDF)
          </a>
        </div>
        <div className="card">
          <h3>Training Resources</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Public training material across hardware design, fabrication, electrical, software, and strategy.
          </p>
          <a href="https://www.citruscircuits.org/training-resources" target="_blank" rel="noreferrer">
            citruscircuits.org/training-resources
          </a>
        </div>
        <div className="card">
          <h3>Fall Workshops</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Annual technical workshop series (2015-present) covering pre-season prep through competition strategy.
          </p>
          <a href="https://www.youtube.com/@CitrusCircuits" target="_blank" rel="noreferrer">
            youtube.com/@CitrusCircuits
          </a>
        </div>
      </div>

      <h3>From 254 The Cheesy Poofs</h3>
      <div className="card-grid">
        <div className="card">
          <h3>Day 1: Kickoff and Game Analysis</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            A blow-by-blow of Team 254's actual kickoff day — rules breakdown, strategy scoring model, and same-day
            prototyping. Narrower and more concrete than a season-long blog archive.
          </p>
          <a href="https://www.team254.com/2014frc-day1/" target="_blank" rel="noreferrer">
            team254.com/2014frc-day1
          </a>
        </div>
        <div className="card">
          <h3>Build Blog</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Their build-season blog archive is a genuinely useful read for day-by-day decision-making, not just
            highlight-reel robot reveals.
          </p>
          <a href="https://www.team254.com/blog/" target="_blank" rel="noreferrer">
            team254.com/blog
          </a>
        </div>
        <div className="card">
          <h3>Public Code Archive</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Their full competition robot codebase, published publicly every year since 2012 — real competition-grade
            FRC Java code to learn from, not just a highlight reel.
          </p>
          <a href="https://github.com/Team254" target="_blank" rel="noreferrer">
            github.com/Team254
          </a>
        </div>
      </div>

      <h3>Community</h3>
      <div className="card-grid">
        <div className="card">
          <h3>"Cheesy Drive" Explained</h3>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            A curvature-based teleop drive scheme originated by 254 and now a common default across FRC — a concrete
            week-one win for a new programming subteam. Third-party writeup, not 254's own.
          </p>
          <a href="https://wiki.purduesigbots.com/software/robotics-basics/curvature-cheesy-drive" target="_blank" rel="noreferrer">
            wiki.purduesigbots.com
          </a>
        </div>
      </div>

      <p className="source-note">
        Team-specific claims above are drawn from public sources (Citrus Circuits' own site, 254's build-season blog
        and public GitHub, the Purdue SIGBots/BLRS wiki) as of 2026-08-14, plus Team 341 Miss Daisy's own kickoff and
        competition strategy process (Wissahickon HS, Ambler PA — 2025 FIRST Mid-Atlantic District Springside
        Chestnut Hill winner), shared directly with this team by a 341 mentor in December 2025 — team practices
        evolve year to year, and subteam structures/workshop materials get updated season to season, so treat this
        as a starting framework to adapt, not a script to copy exactly.
      </p>
    </div>
  );
}
