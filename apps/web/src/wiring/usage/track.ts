// Usage counts: Paradox Diagram's own site counts shares/exports from its web host's log.
// The 5090 Kickoff copy sends nothing anywhere; track() is kept so the editor code is unchanged.
export type UsageEvent = 'share' | 'export' | 'icon';

export function track(_event: UsageEvent): void {
  // intentionally no-op on the 5090 Kickoff site
}
