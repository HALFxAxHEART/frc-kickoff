import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export interface MatrixCriterion {
  id: string;
  label: string;
  weight: number;
}

export interface MatrixOption {
  id: string;
  label: string;
  notes?: string;
  /** criterionId -> score (1-5) */
  scores: Record<string, number>;
}

export const designMatrices = pgTable("design_matrices", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  gameYear: integer("game_year").notNull(),
  criteria: jsonb("criteria").$type<MatrixCriterion[]>().notNull(),
  options: jsonb("options").$type<MatrixOption[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
