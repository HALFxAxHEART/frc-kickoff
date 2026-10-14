import type { KickoffApi } from "./useKickoff";
import { EditText } from "./EditText";
import { Progress } from "./Progress";

export function DeepDive({ api }: { api: KickoffApi }) {
  const questions = api.of("deepDive");
  const answered = questions.filter((q) => q.data.answer.trim().length > 0).length;

  return (
    <div>
      <div className="row-between">
        <p className="muted" style={{ margin: 0 }}>
          341's deep-dive questions — the meat of the strategy work. Answer every one before writing the Will Do list.
        </p>
        <Progress done={answered} total={questions.length} label="answered" />
      </div>
      {questions.map((q, i) => (
        <div className="card" key={q.id} style={{ marginTop: 12 }}>
          <div className="vote-head">
            <EditText
              autoGrow
              value={q.data.question}
              onCommit={(question) => api.update(q, { question })}
              placeholder={`Question ${i + 1}`}
              style={{ fontWeight: 600 }}
            />
            <button className="icon-btn" aria-label="Delete question" onClick={() => api.remove(q.id)}>
              ×
            </button>
          </div>
          {q.data.hint && (
            <p className="muted" style={{ fontSize: "0.82rem", margin: "6px 0" }}>
              {q.data.hint}
            </p>
          )}
          <EditText multiline rows={4} value={q.data.answer} onCommit={(answer) => api.update(q, { answer })} placeholder="Our answer" />
        </div>
      ))}
      <button style={{ marginTop: 12 }} onClick={() => api.create({ kind: "deepDive", question: "", hint: "", answer: "" })}>
        + Question
      </button>
    </div>
  );
}
