import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../trpc";
import { db, schema } from "@frckickoff/db";
import { NotFoundError } from "../../lib/errors";

const criterionSchema = z.object({ id: z.string(), label: z.string().min(1), weight: z.number().min(0) });
const optionSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  notes: z.string().optional(),
  scores: z.record(z.string(), z.number().min(0).max(5)),
});

const upsertInput = z.object({
  name: z.string().min(1),
  gameYear: z.number().int(),
  criteria: z.array(criterionSchema),
  options: z.array(optionSchema),
});

export const designMatricesRouter = router({
  list: publicProcedure.input(z.object({ gameYear: z.number().int() })).query(async ({ input }) => {
    return db.select().from(schema.designMatrices).where(eq(schema.designMatrices.gameYear, input.gameYear));
  }),

  get: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const [row] = await db.select().from(schema.designMatrices).where(eq(schema.designMatrices.id, input.id));
    if (!row) throw new NotFoundError("Design matrix");
    return row;
  }),

  create: publicProcedure.input(upsertInput).mutation(async ({ input }) => {
    const [row] = await db.insert(schema.designMatrices).values(input).returning();
    return row;
  }),

  update: publicProcedure
    .input(upsertInput.partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const [row] = await db
        .update(schema.designMatrices)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(schema.designMatrices.id, id))
        .returning();
      if (!row) throw new NotFoundError("Design matrix");
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    await db.delete(schema.designMatrices).where(eq(schema.designMatrices.id, input.id));
    return { ok: true };
  }),
});
