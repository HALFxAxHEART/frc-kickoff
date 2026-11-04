// Team diagrams on the kickoff server (tRPC router `wiring`), plus the small bits of state the
// editor keeps in this browser: which team diagram it is linked to, and the editor's name.
import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { AppRouter } from '@frckickoff/server';
import type { Doc } from '../model/types';

export const teamApi = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: '/api/trpc' })],
});

export interface TeamLink {
  id: string;
  name: string;
  /** The server's updatedAt of the version this editor last opened or saved (ISO). */
  updatedAt: string;
  /** JSON of the doc as last saved to the team, to show unsaved changes. */
  savedJson: string;
}

const LINK_KEY = '5090-wiring.teamLink';
const BY_KEY = '5090-wiring.by';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // blocked storage: the link only lasts until reload
  }
}

export function loadLink(): TeamLink | null {
  const raw = read(LINK_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<TeamLink>;
    return v.id && v.name && v.updatedAt && typeof v.savedJson === 'string' ? (v as TeamLink) : null;
  } catch {
    return null;
  }
}
export function storeLink(link: TeamLink | null): void {
  write(LINK_KEY, link ? JSON.stringify(link) : null);
}

export function loadBy(): string {
  return read(BY_KEY) ?? '';
}
export function storeBy(by: string): void {
  write(BY_KEY, by.trim().slice(0, 40));
}

/** The doc as the team copy stores it: comparing these tells whether there are unsaved changes. */
export function docJson(doc: Doc): string {
  return JSON.stringify(doc);
}

export function isConflict(e: unknown): boolean {
  return e instanceof TRPCClientError && (e.data as { code?: string } | undefined)?.code === 'CONFLICT';
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
