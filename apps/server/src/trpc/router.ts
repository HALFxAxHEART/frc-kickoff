import { router } from "./trpc";
import { gameRouter } from "./routers/game";
import { cycleScenariosRouter } from "./routers/cycle-scenarios";
import { designMatricesRouter } from "./routers/design-matrices";
import { conceptsRouter } from "./routers/concepts";
import { kickoffRouter } from "./routers/kickoff";

export const appRouter = router({
  game: gameRouter,
  cycleScenarios: cycleScenariosRouter,
  designMatrices: designMatricesRouter,
  concepts: conceptsRouter,
  kickoff: kickoffRouter,
});

export type AppRouter = typeof appRouter;
