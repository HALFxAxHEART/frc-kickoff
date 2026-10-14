export function Progress({ done, total, label }: { done: number; total: number; label?: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress" title={`${done} of ${total}`}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="muted">
        {done}/{total}
        {label ? ` ${label}` : ""}
      </span>
    </div>
  );
}
