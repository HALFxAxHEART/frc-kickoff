import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const concepts = pgTable("concepts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  gameYear: integer("game_year").notNull(),
  summary: text("summary").notNull().default(""),
  cycleScenarioIds: jsonb("cycle_scenario_ids").$type<string[]>().notNull().default([]),
  designMatrixId: uuid("design_matrix_id"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
