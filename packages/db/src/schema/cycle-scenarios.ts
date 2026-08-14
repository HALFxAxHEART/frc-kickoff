import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import type { CyclePhaseTimes } from "@frckickoff/shared";

export const cycleScenarios = pgTable("cycle_scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  gameYear: integer("game_year").notNull(),
  scoringActionId: text("scoring_action_id").notNull(),
  phaseTimes: jsonb("phase_times").$type<CyclePhaseTimes>().notNull(),
  budgetSeconds: integer("budget_seconds").notNull(),
  startupSeconds: integer("startup_seconds").notNull().default(0),
  pointsPerPiece: integer("points_per_piece").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
