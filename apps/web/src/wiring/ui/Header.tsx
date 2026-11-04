import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Layer } from '../catalog/catalog';
import type { Problem } from '../model/problems';
import { TEMPLATES, type TemplateId } from '../team/templates';
import { ThemeButton } from './ThemeButton';
import { track } from '../usage/track';

export type ExportKind = 'svg' | 'png2' | 'png4' | 'json' | 'csv';
export type LayerView = Layer | 'all';

export const LAYER_VIEWS: { id: LayerView; label: string; swatch: string[] }[] = [
  { id: 'all', label: 'All', swatch: [] },
  { id: 'power', label: 'Power', swatch: ['#cf222e', '#0d1117'] },
  { id: 'can', label: 'CAN', swatch: ['#e3b341', '#2da44e'] },
  { id: 'network', label: 'Network', swatch: ['#0969da', '#8250df'] },
  { id: 'air', label: 'Air', swatch: ['#1b7c83'] },
];

const EXPORTS: { id: ExportKind; label: string }[] = [
  { id: 'svg', label: 'SVG' },
  { id: 'png2', label: 'PNG 2x' },
  { id: 'png4', label: 'PNG 4x' },
  { id: 'json', label: 'JSON' },
  { id: 'csv', label: 'Table (CSV)' },
];

export interface HeaderProps {
  title: string;
  onTitle: (t: string) => void;
  layer: LayerView;
  onLayer: (l: LayerView) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Start a new diagram: empty, a 5090 template, or a copy of the 2102 example robot. */
  onNew: (kind: 'empty' | 'example' | TemplateId) => void;
  onOpen: (file: File) => void;
  onExport: (kind: ExportKind) => void;
  saved: boolean;
  labels: boolean;
  onLabels: (show: boolean) => void;
  /** Makes a snapshot share link of the current diagram. */
  onShare: () => Promise<string>;
  /** The live badge, while the diagram is shared live with an AI. */
  live?: ReactNode;
  /** The problems of the current diagram, for the Check list. */
  problems: Problem[];
  /** Selects the devices of a problem picked from the Check list. */
  onPick: (ids: string[]) => void;
  /** SVG and PNG exports get a title block (the viewer's choice, kept in this browser). */
  titleBlock: boolean;
  onTitleBlock: (on: boolean) => void;
  /** 5090: the team copy on the kickoff server. */
  team: {
    name: string | null;
    dirty: boolean;
    busy: boolean;
    onSave: () => void;
    onSaveAs: () => void;
    onBrowse: () => void;
    onUnlink: () => void;
  };
}

/** A button with a list under it. The list closes on a pick (the children get close) or a click outside it. */
function Menu(p: { label: string; className?: string; title?: string; listClassName?: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button type="button" className={p.className} title={p.title} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {p.label}
      </button>
      {open && <div role="menu" className={['menu-list', p.listClassName].filter(Boolean).join(' ')}>{p.children(() => setOpen(false))}</div>}
    </div>
  );
}

type ShareState = { url: string; copied: boolean } | { error: string } | null;

export function Header(p: HeaderProps) {
  const [title, setTitle] = useState(p.title);
  const [about, setAbout] = useState(false);
  const [share, setShare] = useState<ShareState>(null);
  const onShare = async () => {
    try {
      const url = await p.onShare();
      track('share');
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        // no clipboard access (permission or an insecure page): the link box still shows the link
      }
      setShare({ url, copied });
    } catch (e) {
      setShare({ error: (e as Error).message });
    }
  };
  // a new or opened document brings its own title
  useEffect(() => setTitle(p.title), [p.title]);
  const commitTitle = () => {
    if (title !== p.title) p.onTitle(title);
  };
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="bar">
      <div className="brand">
        <a className="back-kickoff" href="/" title="Back to the FRC Kickoff site">← Kickoff</a>
        <img src="/wiring/logo-5090.svg" width={26} height={26} alt="" />
        <span className="brand-name">5090 Wiring</span>
      </div>
      <input
        className="title" aria-label="Diagram title" value={title}
        onChange={(e) => setTitle(e.target.value)} onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') setTitle(p.title);
        }}
      />
      <nav className="layers" aria-label="Layer">
        {LAYER_VIEWS.map((v) => (
          <button
            key={v.id} type="button" aria-pressed={p.layer === v.id}
            onClick={() => p.onLayer(v.id)} className={`layer layer-${v.id}`}
          >
            {v.swatch.length > 0 && (
              <span className="swatch" aria-hidden="true">
                {v.swatch.map((c) => <i key={c} style={{ background: c }} />)}
              </span>
            )}
            {v.label}
          </button>
        ))}
      </nav>
      <button
        type="button" className="labels-switch" aria-pressed={p.labels} onClick={() => p.onLabels(!p.labels)}
        title="Show or hide every device label"
      >
        Labels
      </button>
      <div className="actions">
        {p.live}
        {!p.saved && <span className="unsaved">Not saved in this browser</span>}
        {p.team.name && (
          <span className={p.team.dirty ? 'team-status dirty' : 'team-status'} title="The team copy this diagram is linked to">
            Team: {p.team.name}{p.team.busy ? ' · saving…' : p.team.dirty ? ' · unsaved changes' : ' · saved'}
          </span>
        )}
        <button type="button" onClick={p.onUndo} disabled={!p.canUndo} title="Undo (Ctrl/Cmd+Z)">Undo</button>
        <button type="button" onClick={p.onRedo} disabled={!p.canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">Redo</button>
        <Menu label="New" listClassName="nowrap-menu">
          {(close) => (
            <>
              <button type="button" role="menuitem" onClick={() => { close(); p.onNew('empty'); }}>Empty diagram</button>
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" role="menuitem" onClick={() => { close(); p.onNew(t.id); }}>{t.label}</button>
              ))}
              <button type="button" role="menuitem" onClick={() => { close(); p.onNew('example'); }}>2102 example robot</button>
            </>
          )}
        </Menu>
        <Menu label={p.team.dirty ? 'Team •' : 'Team'} className={p.team.dirty ? 'team-dirty' : undefined} title="Team diagrams saved on the kickoff server" listClassName="nowrap-menu">
          {(close) => (
            <>
              <button type="button" role="menuitem" disabled={p.team.busy} onClick={() => { close(); p.team.onSave(); }}>
                {p.team.name ? `Save to team (“${p.team.name}”)` : 'Save to team…'}
              </button>
              {p.team.name && (
                <button type="button" role="menuitem" disabled={p.team.busy} onClick={() => { close(); p.team.onSaveAs(); }}>Save as a new team diagram…</button>
              )}
              <button type="button" role="menuitem" onClick={() => { close(); p.team.onBrowse(); }}>Open team diagram…</button>
              {p.team.name && (
                <button type="button" role="menuitem" onClick={() => { close(); p.team.onUnlink(); }}>Stop linking (keep a browser-only copy)</button>
              )}
            </>
          )}
        </Menu>
        <button type="button" onClick={() => fileRef.current?.click()}>Open</button>
        <input
          ref={fileRef} type="file" accept=".json,application/json" hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) p.onOpen(f);
            e.target.value = '';
          }}
        />
        <Menu
          label={p.problems.length ? `Check (${p.problems.length})` : 'Check'}
          className={p.problems.length ? 'has-problems' : undefined}
          title="Problems: CAN IDs, power, overlaps" listClassName="problem-list"
        >
          {(close) => p.problems.length
            ? p.problems.map((x, i) => (
              <button key={i} type="button" role="menuitem" onClick={() => { close(); p.onPick(x.ids); }}>{x.message}</button>
            ))
            : <p className="problem-none">No problems found.</p>}
        </Menu>
        <button type="button" onClick={onShare} title="Copy a link that opens this version of the diagram">Share</button>
        <ThemeButton className="theme-button" />
        <a className="nav-button" href="gallery" title="Browse and download the device icons">Icons</a>
        <button type="button" onClick={() => setAbout(true)}>About</button>
        <Menu label="Export" className="primary">
          {(close) => (
            <>
              {EXPORTS.map((x) => (
                <button
                  key={x.id} type="button" role="menuitem"
                  onClick={() => {
                    close();
                    p.onExport(x.id);
                    track('export');
                  }}
                >
                  {x.label}
                </button>
              ))}
              <button
                type="button" role="menuitemcheckbox" aria-checked={p.titleBlock} className="menu-check"
                title="Title, team, revision and date under SVG and PNG exports" onClick={() => p.onTitleBlock(!p.titleBlock)}
              >
                Title block
              </button>
            </>
          )}
        </Menu>
      </div>
      {share && (
        <div className="about-backdrop" onPointerDown={() => setShare(null)}>
          <div role="dialog" aria-modal="true" aria-label="Share link" className="about-box share-box" onPointerDown={(e) => e.stopPropagation()}>
            <h2>Share this diagram</h2>
            {'error' in share ? (
              <p role="alert">Could not make a link: {share.error}</p>
            ) : (
              <>
                <p>
                  {share.copied ? 'The link is copied. ' : ''}Anyone who opens it sees this version of the diagram and
                  can keep a copy. Later changes need a new link.
                </p>
                <input
                  aria-label="Share link" readOnly value={share.url} onFocus={(e) => e.currentTarget.select()} autoFocus
                />
                <p className="share-meta">{share.url.length.toLocaleString('en-US')} characters</p>
              </>
            )}
            <div className="row">
              {!('error' in share) && (
                <button type="button" onClick={() => navigator.clipboard?.writeText(share.url).then(() => setShare({ ...share, copied: true }), () => {})}>
                  Copy
                </button>
              )}
              <button type="button" onClick={() => setShare(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {about && (
        <div className="about-backdrop" onPointerDown={() => setAbout(false)}>
          <div role="dialog" aria-modal="true" aria-label="About 5090 Wiring" className="about-box" onPointerDown={(e) => e.stopPropagation()}>
            <h2>
              <img src="/wiring/logo-5090.svg" width={22} height={22} alt="" /> 5090 Wiring
            </h2>
            <p>Lay out an FRC robot wiring diagram: power, CAN, network and air, with the real ports of each device.</p>
            <p>
              <strong>Built on Paradox Diagram by FRC Team 2102 Paradox</strong> (MIT License,{' '}
              <a href="https://github.com/Paradox2102/ParadoxDiagram" target="_blank" rel="noreferrer">source</a>,{' '}
              <a href="https://diagram.team2102.org" target="_blank" rel="noreferrer">original site</a>). The editor, wire routing,
              Check and exports are theirs; thank you, 2102.
            </p>
            <p>
              Device icons: the FRC device icon collection by FRC Team 2102 Paradox, CC0 1.0 (public domain). Three icons
              were added by 5090 in the same style: Brainboxes SW-005, Thriftiest Cam and the power hat.
            </p>
            <p>
              What 5090 added: team diagrams saved on the kickoff server (Team menu), 5090 starting templates that follow
              the 5090 Electrical Reference, and those three parts. Your working copy is also kept in this browser.
              Nothing is sent anywhere else.
            </p>
            <p className="about-request">
              Missing a part? For 2102's icon collection, ask 2102: email{' '}
              <a href="mailto:nickfoote@team2102.org?subject=Paradox%20Diagram%3A%20component%20request">nickfoote@team2102.org</a>{' '}
              or open a <a href="https://github.com/Paradox2102/ParadoxDiagram/issues/new" target="_blank" rel="noreferrer">GitHub issue</a>.
              For a 5090-only part, ask Michel.
            </p>
            <p className="about-version">Version {__APP_VERSION__}</p>
            <button type="button" onClick={() => setAbout(false)} autoFocus>Close</button>
          </div>
        </div>
      )}
    </header>
  );
}
