import { pgTable, uuid, text, integer, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import type { KickoffItemData, VoteChoice } from "@frckickoff/shared";

export const kickoffItems = pgTable(
  "kickoff_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspace: text("workspace").notNull(),
    kind: text("kind").$type<KickoffItemData["kind"]>().notNull(),
    sort: integer("sort").notNull().default(0),
    data: jsonb("data").$type<KickoffItemData>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("kickoff_items_workspace_idx").on(t.workspace)],
);

/** One vote per browser per task — voterKey is a random id kept in the voter's localStorage. */
export const kickoffVotes = pgTable(
  "kickoff_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => kickoffItems.id, { onDelete: "cascade" }),
    voterKey: text("voter_key").notNull(),
    choice: text("choice").$type<VoteChoice>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("kickoff_votes_item_voter_idx").on(t.itemId, t.voterKey)],
);
