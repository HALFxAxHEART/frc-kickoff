// The Team dialog: every team diagram on the server, newest first, with Open and Delete.
import { useEffect, useState } from 'react';
import { errorText, teamApi } from './api';

interface Row {
  id: string;
  name: string;
  updatedBy: string;
  updatedAt: string;
  devices: number;
}

export function TeamDialog(p: {
  currentId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setError(null);
    teamApi.wiring.list.query().then(
      (r) => setRows(r.map((x) => ({ ...x, updatedAt: new Date(x.updatedAt).toISOString() }))),
      (e: unknown) => setError(errorText(e)),
    );
  };
  useEffect(load, []);

  const remove = async (row: Row) => {
    if (!window.confirm(`Delete the team diagram “${row.name}” for everyone? This cannot be undone.`)) return;
    setBusy(row.id);
    try {
      await teamApi.wiring.delete.mutate({ id: row.id });
      load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="about-backdrop" onPointerDown={p.onClose}>
      <div role="dialog" aria-modal="true" aria-label="Team diagrams" className="about-box team-box" onPointerDown={(e) => e.stopPropagation()}>
        <h2>Team diagrams</h2>
        <p>Saved on the kickoff server, so everyone on the team sees the same list. Opening one replaces the diagram in this browser.</p>
        {error && <p role="alert" className="team-error">Could not reach the team list: {error}</p>}
        {rows === null && !error && <p>Loading…</p>}
        {rows && rows.length === 0 && <p className="problem-none">No team diagrams yet. Use Team → Save to team.</p>}
        {rows && rows.length > 0 && (
          <ul className="team-list">
            {rows.map((r) => (
              <li key={r.id} aria-current={r.id === p.currentId ? 'true' : undefined}>
                <div className="team-row-main">
                  <strong>{r.name}</strong>
                  <span className="team-meta">
                    {r.devices} devices · saved {new Date(r.updatedAt).toLocaleString()}{r.updatedBy ? ` by ${r.updatedBy}` : ''}
                    {r.id === p.currentId ? ' · open now' : ''}
                  </span>
                </div>
                <button type="button" className="primary" disabled={busy !== null} onClick={() => p.onOpen(r.id)}>Open</button>
                <button type="button" disabled={busy !== null} onClick={() => void remove(r)}>{busy === r.id ? 'Deleting…' : 'Delete'}</button>
              </li>
            ))}
          </ul>
        )}
        <div className="row">
          <button type="button" onClick={p.onClose} autoFocus>Close</button>
        </div>
      </div>
    </div>
  );
}
