import { useState } from "react";
import type { WillDoStatus } from "@frckickoff/shared";
import type { KickoffApi } from "./useKickoff";
import { EditText } from "./EditText";

const STATUS_LABEL: Record<WillDoStatus, string> = { active: "Working on it", met: "Robot does this", cut: "Cut" };

/**
 * Strategy says what and why, never how ("trust the mechanical team"). These words usually mean a
 * requirement has slipped into prescribing a mechanism.
 */
const HOW_WORDS =
  /\b(motors?|kraken|falcon|neo|vortex|gear(ing|box)?|ratio|belts?|chain|pulleys?|elevator|arm|wrist|turret|flywheel|shooter|swerve|tank|pneumatic|cylinder|roller|4-?bar|four.bar|cascade|telescop\w*)\b/i;

export function WillDo({ api }: { api: KickoffApi }) {
  const reqs = api.of("willDo");
  const signoffs = api.of("signoff");
  const [name, setName] = useState("");

  const active = reqs.filter((r) => r.data.status !== "cut");

  function sign() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!signoffs.some((s) => s.data.name.toLowerCase() === trimmed.toLowerCase())) api.create({ kind: "signoff", name: trimmed });
    setName("");
  }

  return (
    <div>
      <p className="muted">
        Everything the robot has to do for a successful season — the end product of the whole weekend. 341 got the idea
        from 118 Robonauts. Say <strong>what</strong> and <strong>why</strong>, not how ("faster at L1 than L2–4", not
        "use the L4 ratio"). The whole team signs off, then come back to it all season: mark things done as the robot
        does them, and cut things on purpose (341 cut "hold algae without hurting coral" to keep the robot simple).
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Our robot will…</h3>
        <ol className="willdo-list">
          {reqs.map((r) => {
            const looksLikeHow = HOW_WORDS.test(r.data.requirement);
            return (
              <li key={r.id} className={r.data.status === "cut" ? "is-cut" : undefined}>
                <div className="willdo-grid">
                  <EditText autoGrow value={r.data.requirement} onCommit={(requirement) => api.update(r, { requirement })} placeholder="…pick up game pieces from the floor and the human player" />
                  <select aria-label="Status" value={r.data.status} onChange={(e) => api.update(r, { status: e.target.value as WillDoStatus })}>
                    {(Object.keys(STATUS_LABEL) as WillDoStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <button className="icon-btn" aria-label="Delete requirement" onClick={() => api.remove(r.id)}>
                    ×
                  </button>
                </div>
                <EditText autoGrow value={r.data.why} onCommit={(why) => api.update(r, { why })} placeholder="Why — which deep-dive answer or test match says so?" />
                {r.data.status === "cut" && (
                  <EditText value={r.data.note} onCommit={(note) => api.update(r, { note })} placeholder="Why we cut it" />
                )}
                {looksLikeHow && r.data.status !== "cut" && (
                  <p className="hint">This sounds like a <em>how</em>. Can you say what the robot needs to achieve instead, and let the build team pick the mechanism?</p>
                )}
              </li>
            );
          })}
        </ol>
        <button onClick={() => api.create({ kind: "willDo", requirement: "", why: "", status: "active", note: "" })}>+ Requirement</button>
        <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 0 }}>
          {active.filter((r) => r.data.status === "met").length} of {active.length} active requirements met.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Team sign-off ({signoffs.length})</h3>
        <p className="muted" style={{ fontSize: "0.82rem" }}>
          Signing means "I agree this is what our robot has to do." No hidden disagreements later.
        </p>
        <div className="chips">
          {signoffs.map((s) => (
            <span className="chip" key={s.id}>
              {s.data.name}
              <button className="icon-btn" aria-label={`Remove ${s.data.name}`} onClick={() => api.remove(s.id)}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, maxWidth: 420 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sign()}
            placeholder="Your name"
            aria-label="Your name"
            maxLength={200}
          />
          <button className="primary" onClick={sign} disabled={!name.trim() || active.length === 0}>
            Sign
          </button>
        </div>
      </div>
    </div>
  );
}
