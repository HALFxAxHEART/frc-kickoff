import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

// Team wiring diagrams from the 5090 Wiring editor (/wiring/). `doc` is a Paradox Diagram
// document ({ format: 'paradox-diagram', version: 1, ... }); the editor validates it on open.
export const wiringDiagrams = pgTable("wiring_diagrams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  doc: jsonb("doc").$type<Record<string, unknown>>().notNull(),
  updatedBy: text("updated_by").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
