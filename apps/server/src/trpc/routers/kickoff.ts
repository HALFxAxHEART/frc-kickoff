import { z } from "zod";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { router, publicProcedure } from "../trpc";
import { db, schema } from "@frckickoff/db";
import { defaultWorkspaceItems, type KickoffItemData, type VoteChoice } from "@frckickoff/shared";
import { NotFoundError, ValidationError } from "../../lib/errors";

const shortText = z.string().trim().max(200);
const longText = z.string().max(4000);
const workspaceName = z.string().trim().min(1).max(60);
const voteChoice = z.enum(["need", "nice", "skip"]);

const itemData = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("checklist"),
    phase: z.enum(["fall", "saturday", "sunday", "week1"]),
    time: shortText,
    label: longText,
    owner: shortText,
    done: z.boolean(),
  }),
  z.object({
    kind: z.literal("fieldPart"),
    name: shortText,
    priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    why: longText,
    owner: shortText,
    status: z.enum(["todo", "building", "done"]),
  }),
  z.object({ kind: z.literal("mockProp"), element: shortText, standIn: shortText, ready: z.boolean() }),
  z.object({
    kind: z.literal("mockTest"),
    question: longText,
    setup: longText,
    redScore: z.number().int().min(0).max(9999).nullable(),
    blueScore: z.number().int().min(0).max(9999).nullable(),
    takeaway: longText,
    verdict: z.enum(["unsure", "real", "artifact"]),
  }),
  z.object({ kind: z.literal("voteTask"), task: shortText }),
  z.object({
    kind: z.literal("smallGroup"),
    name: shortText,
    members: shortText,
    goal: longText,
    needs: longText,
    auto: longText,
    teleop: longText,
    endgame: longText,
    timeline: z.array(z.object({ t: z.string().max(20), state: longText })).max(40),
  }),
  z.object({ kind: z.literal("deepDive"), question: longText, hint: longText, answer: longText }),
  z.object({
    kind: z.literal("willDo"),
    requirement: longText,
    why: longText,
    status: z.enum(["active", "met", "cut"]),
    note: longText,
  }),
  z.object({ kind: z.literal("signoff"), name: shortText.min(1) }),
  z.object({
    kind: z.literal("rpPlan"),
    name: shortText,
    costPoints: z.number().min(0).max(9999),
    rule: z.enum(["always", "ifFavored", "never"]),
  }),
]) satisfies z.ZodType<KickoffItemData>;

async function nextSort(workspace: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${schema.kickoffItems.sort})` })
    .from(schema.kickoffItems)
    .where(eq(schema.kickoffItems.workspace, workspace));
  return (row?.max ?? -1) + 1;
}

export const kickoffRouter = router({
  workspaces: publicProcedure.query(async () => {
    const rows = await db
      .selectDistinct({ workspace: schema.kickoffItems.workspace })
      .from(schema.kickoffItems)
      .orderBy(asc(schema.kickoffItems.workspace));
    return rows.map((r) => r.workspace);
  }),

  items: publicProcedure.input(z.object({ workspace: workspaceName })).query(async ({ input }) => {
    return db
      .select()
      .from(schema.kickoffItems)
      .where(eq(schema.kickoffItems.workspace, input.workspace))
      .orderBy(asc(schema.kickoffItems.sort), asc(schema.kickoffItems.createdAt));
  }),

  /** Creates the default run-of-show checklist + deep-dive questions — only if the workspace is empty. */
  seed: publicProcedure.input(z.object({ workspace: workspaceName })).mutation(async ({ input }) => {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: schema.kickoffItems.id })
        .from(schema.kickoffItems)
        .where(eq(schema.kickoffItems.workspace, input.workspace))
        .limit(1);
      if (existing) return { created: 0 };
      const rows = defaultWorkspaceItems().map((data, i) => ({ workspace: input.workspace, kind: data.kind, sort: i, data }));
      await tx.insert(schema.kickoffItems).values(rows);
      return { created: rows.length };
    });
  }),

  create: publicProcedure.input(z.object({ workspace: workspaceName, data: itemData })).mutation(async ({ input }) => {
    const [row] = await db
      .insert(schema.kickoffItems)
      .values({ workspace: input.workspace, kind: input.data.kind, sort: await nextSort(input.workspace), data: input.data })
      .returning();
    return row;
  }),

  update: publicProcedure.input(z.object({ id: z.string().uuid(), data: itemData })).mutation(async ({ input }) => {
    const [existing] = await db.select({ kind: schema.kickoffItems.kind }).from(schema.kickoffItems).where(eq(schema.kickoffItems.id, input.id));
    if (!existing) throw new NotFoundError("Kickoff item");
    if (existing.kind !== input.data.kind) throw new ValidationError(`Item is a ${existing.kind}, not a ${input.data.kind}`);
    const [row] = await db
      .update(schema.kickoffItems)
      .set({ data: input.data, updatedAt: new Date() })
      .where(eq(schema.kickoffItems.id, input.id))
      .returning();
    return row;
  }),

  delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    await db.delete(schema.kickoffItems).where(eq(schema.kickoffItems.id, input.id));
    return { ok: true };
  }),

  /** Tally per vote task plus this browser's own vote, so a voter can see and change their choice. */
  votes: publicProcedure
    .input(z.object({ workspace: workspaceName, voterKey: z.string().min(8).max(64) }))
    .query(async ({ input }) => {
      const tasks = await db
        .select({ id: schema.kickoffItems.id })
        .from(schema.kickoffItems)
        .where(and(eq(schema.kickoffItems.workspace, input.workspace), eq(schema.kickoffItems.kind, "voteTask")));
      const ids = tasks.map((t) => t.id);
      const tally: Record<string, Record<VoteChoice, number> & { mine: VoteChoice | null }> = {};
      for (const id of ids) tally[id] = { need: 0, nice: 0, skip: 0, mine: null };
      if (ids.length === 0) return tally;

      const votes = await db.select().from(schema.kickoffVotes).where(inArray(schema.kickoffVotes.itemId, ids));
      for (const v of votes) {
        const entry = tally[v.itemId];
        if (!entry) continue;
        entry[v.choice] += 1;
        if (v.voterKey === input.voterKey) entry.mine = v.choice;
      }
      return tally;
    }),

  vote: publicProcedure
    .input(z.object({ itemId: z.string().uuid(), voterKey: z.string().min(8).max(64), choice: voteChoice.nullable() }))
    .mutation(async ({ input }) => {
      if (input.choice === null) {
        await db
          .delete(schema.kickoffVotes)
          .where(and(eq(schema.kickoffVotes.itemId, input.itemId), eq(schema.kickoffVotes.voterKey, input.voterKey)));
        return { ok: true };
      }
      const [task] = await db
        .select({ id: schema.kickoffItems.id })
        .from(schema.kickoffItems)
        .where(and(eq(schema.kickoffItems.id, input.itemId), eq(schema.kickoffItems.kind, "voteTask")));
      if (!task) throw new NotFoundError("Vote task");
      await db
        .insert(schema.kickoffVotes)
        .values({ itemId: input.itemId, voterKey: input.voterKey, choice: input.choice })
        .onConflictDoUpdate({
          target: [schema.kickoffVotes.itemId, schema.kickoffVotes.voterKey],
          set: { choice: input.choice },
        });
      return { ok: true };
    }),

  clearVotes: publicProcedure.input(z.object({ workspace: workspaceName })).mutation(async ({ input }) => {
    const tasks = db
      .select({ id: schema.kickoffItems.id })
      .from(schema.kickoffItems)
      .where(and(eq(schema.kickoffItems.workspace, input.workspace), eq(schema.kickoffItems.kind, "voteTask")));
    await db.delete(schema.kickoffVotes).where(inArray(schema.kickoffVotes.itemId, tasks));
    return { ok: true };
  }),
});
