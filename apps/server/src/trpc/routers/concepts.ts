import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../trpc";
import { db, schema } from "@frckickoff/db";
import { NotFoundError } from "../../lib/errors";

const upsertInput = z.object({
  name: z.string().min(1),
  gameYear: z.number().int(),
  summary: z.string().default(""),
  cycleScenarioIds: z.array(z.string().uuid()).default([]),
  designMatrixId: z.string().uuid().nullable().optional(),
  notes: z.string().default(""),
});

export const conceptsRouter = router({
  list: publicProcedure.input(z.object({ gameYear: z.number().int() })).query(async ({ input }) => {
    return db.select().from(schema.concepts).where(eq(schema.concepts.gameYear, input.gameYear));
  }),

  get: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const [row] = await db.select().from(schema.concepts).where(eq(schema.concepts.id, input.id));
    if (!row) throw new NotFoundError("Concept");
    return row;
  }),

  create: publicProcedure.input(upsertInput).mutation(async ({ input }) => {
    const [row] = await db.insert(schema.concepts).values(input).returning();
    return row;
  }),

  update: publicProcedure
    .input(upsertInput.partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const [row] = await db
        .update(schema.concepts)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(schema.concepts.id, id))
        .returning();
      if (!row) throw new NotFoundError("Concept");
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    await db.delete(schema.concepts).where(eq(schema.concepts.id, input.id));
    return { ok: true };
  }),
});
