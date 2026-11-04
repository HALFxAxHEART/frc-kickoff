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

## 5090 Wiring (`/wiring/`)

A robot wiring-diagram editor (power, CAN, network, air) built on
[Paradox Diagram](https://github.com/Paradox2102/ParadoxDiagram) by FRC Team 2102 Paradox (MIT License,
see `apps/web/src/wiring/LICENSE-ParadoxDiagram.txt`). Device icons are 2102's CC0 collection in
`apps/web/public/wiring/icons/`, plus three 5090 icons in `icons/5090/` (Brainboxes SW-005, Thriftiest Cam,
power hat).

What 5090 added on top of Paradox Diagram 1.3.4:
- **Team diagrams**: Team menu → save/open/delete on the kickoff server (`wiring` tRPC router,
  `wiring_diagrams` table). A save over someone else's newer save asks before overwriting.
- **5090 templates** (New menu): standard base and the 2026 robot, following the 5090 Electrical Reference
  (`apps/web/src/wiring/team/templates.ts`).
- 5090 branding, dark theme by default, no usage tracking, no MCP/API page.

It is a separate Vite page (`apps/web/wiring/index.html`) so Paradox Diagram's global CSS never touches the
kickoff app, and it type-checks with its own `tsconfig.wiring.json` (upstream's strictness). To update from
upstream: copy `src/` over `apps/web/src/wiring/` (keep `team/`, and re-apply the small edits in `ui/App.tsx`,
`ui/Header.tsx`, `ui/Gallery.tsx`, `ui/theme.ts`, `usage/track.ts`, `export/svg.ts`, `main.tsx`).
