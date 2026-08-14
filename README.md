# FRC Kickoff

A yearly-refreshed FRC kickoff planning tool: game breakdown, cycle-time calculator,
robot design matrix, and a mechanism (intake/shooter/indexer/climber) reference library.

No login — single shared workspace.

## Updating for a new game each Kickoff

1. Add `packages/shared/src/games/<year>.ts` following the `GameBreakdown` shape in
   `packages/shared/src/games/types.ts`.
2. Register it in `packages/shared/src/games/index.ts`'s `GAME_BREAKDOWNS` map and bump
   `CURRENT_GAME_YEAR`.
3. Redeploy.

## Dev

```
bun install
bun run db:migrate   # needs DATABASE_URL
bun run dev
```
