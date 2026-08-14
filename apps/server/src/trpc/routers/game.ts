import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { NotFoundError } from "../../lib/errors";
import { getGameBreakdown, listGameYears, CURRENT_GAME_YEAR, MECHANISM_LIBRARY } from "@frckickoff/shared";

export const gameRouter = router({
  current: publicProcedure.query(() => {
    const game = getGameBreakdown(CURRENT_GAME_YEAR);
    if (!game) throw new NotFoundError("Current game breakdown");
    return game;
  }),

  get: publicProcedure.input(z.object({ year: z.number().int() })).query(({ input }) => {
    const game = getGameBreakdown(input.year);
    if (!game) throw new NotFoundError(`Game breakdown for ${input.year}`);
    return game;
  }),

  years: publicProcedure.query(() => listGameYears()),

  mechanisms: publicProcedure.query(() => MECHANISM_LIBRARY),
});
