import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../trpc";
import { db, schema } from "@frckickoff/db";
import { NotFoundError } from "../../lib/errors";

const phaseTimesSchema = z.object({
  travelToPickupSeconds: z.number().min(0),
  pickupSeconds: z.number().min(0),
  travelToScoreSeconds: z.number().min(0),
  scoreSeconds: z.number().min(0),
  errorMarginSeconds: z.number().min(0),
});

const upsertInput = z.object({
  name: z.string().min(1),
  gameYear: z.number().int(),
  scoringActionId: z.string().min(1),
  phaseTimes: phaseTimesSchema,
  budgetSeconds: z.number().int().min(0),
  startupSeconds: z.number().int().min(0).default(0),
  pointsPerPiece: z.number().int().min(0).default(1),
  notes: z.string().optional(),
});

export const cycleScenariosRouter = router({
  list: publicProcedure.input(z.object({ gameYear: z.number().int() })).query(async ({ input }) => {
    return db.select().from(schema.cycleScenarios).where(eq(schema.cycleScenarios.gameYear, input.gameYear));
  }),

  get: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const [row] = await db.select().from(schema.cycleScenarios).where(eq(schema.cycleScenarios.id, input.id));
    if (!row) throw new NotFoundError("Cycle scenario");
    return row;
  }),

  create: publicProcedure.input(upsertInput).mutation(async ({ input }) => {
    const [row] = await db.insert(schema.cycleScenarios).values(input).returning();
    return row;
  }),

  update: publicProcedure
    .input(upsertInput.partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const [row] = await db
        .update(schema.cycleScenarios)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(schema.cycleScenarios.id, id))
        .returning();
      if (!row) throw new NotFoundError("Cycle scenario");
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    await db.delete(schema.cycleScenarios).where(eq(schema.cycleScenarios.id, input.id));
    return { ok: true };
  }),
});
