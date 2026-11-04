import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db, schema } from "@frckickoff/db";
import { NotFoundError } from "../../lib/errors";

// Team wiring diagrams for the 5090 Wiring editor (/wiring/). The editor checks a document's
// devices and wires against its icon catalog when it opens one, so the server only checks the
// envelope and the size.
const MAX_DOC_BYTES = 2_000_000;

const docInput = z
  .object({
    format: z.literal("paradox-diagram"),
    version: z.literal(1),
    title: z.string().max(200),
    devices: z.array(z.unknown()).max(2000),
    wires: z.array(z.unknown()).max(5000),
    hideTags: z.boolean().optional(),
    team: z.string().max(40).optional(),
    revision: z.string().max(20).optional(),
  })
  .refine((d) => JSON.stringify(d).length <= MAX_DOC_BYTES, { message: "Diagram is larger than 2 MB" });

const nameInput = z.string().trim().min(1).max(80);
const byInput = z.string().trim().max(40).default("");

export const wiringRouter = router({
  list: publicProcedure.query(async () => {
    return db
      .select({
        id: schema.wiringDiagrams.id,
        name: schema.wiringDiagrams.name,
        updatedBy: schema.wiringDiagrams.updatedBy,
        updatedAt: schema.wiringDiagrams.updatedAt,
        // The bun-sql driver can store the document as a JSON string inside jsonb, so read through it either way.
        devices: sql<number>`coalesce(jsonb_array_length(case jsonb_typeof(${schema.wiringDiagrams.doc}) when 'string' then (${schema.wiringDiagrams.doc} #>> '{}')::jsonb else ${schema.wiringDiagrams.doc} end -> 'devices'), 0)`.mapWith(Number),
      })
      .from(schema.wiringDiagrams)
      .orderBy(desc(schema.wiringDiagrams.updatedAt));
  }),

  get: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const [row] = await db.select().from(schema.wiringDiagrams).where(eq(schema.wiringDiagrams.id, input.id));
    if (!row) throw new NotFoundError("Wiring diagram");
    return row;
  }),

  create: publicProcedure
    .input(z.object({ name: nameInput, doc: docInput, by: byInput }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(schema.wiringDiagrams)
        .values({ name: input.name, doc: input.doc, updatedBy: input.by })
        .returning({ id: schema.wiringDiagrams.id, name: schema.wiringDiagrams.name, updatedAt: schema.wiringDiagrams.updatedAt });
      return row;
    }),

  // `baseUpdatedAt` is the version the editor opened; a save over someone else's newer save is refused
  // unless `force` is set, so two people editing at once cannot silently overwrite each other.
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: nameInput,
        doc: docInput,
        by: byInput,
        baseUpdatedAt: z.string().datetime({ offset: true }).optional(),
        force: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      const [current] = await db
        .select({ updatedAt: schema.wiringDiagrams.updatedAt, updatedBy: schema.wiringDiagrams.updatedBy })
        .from(schema.wiringDiagrams)
        .where(eq(schema.wiringDiagrams.id, input.id));
      if (!current) throw new NotFoundError("Wiring diagram");
      if (!input.force && input.baseUpdatedAt && current.updatedAt.getTime() > new Date(input.baseUpdatedAt).getTime()) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${current.updatedBy || "Someone else"} saved a newer version after you opened it`,
        });
      }
      const [row] = await db
        .update(schema.wiringDiagrams)
        .set({ name: input.name, doc: input.doc, updatedBy: input.by, updatedAt: new Date() })
        .where(eq(schema.wiringDiagrams.id, input.id))
        .returning({ id: schema.wiringDiagrams.id, name: schema.wiringDiagrams.name, updatedAt: schema.wiringDiagrams.updatedAt });
      if (!row) throw new NotFoundError("Wiring diagram");
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    await db.delete(schema.wiringDiagrams).where(eq(schema.wiringDiagrams.id, input.id));
    return { ok: true };
  }),
});
