import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ticketsTable } from "./tickets";
import { usersTable } from "./users";

export const ticketEventsTable = pgTable("ticket_events", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => ticketsTable.id),
  actorId: integer("actor_id").references(() => usersTable.id),
  actorRole: text("actor_role"),
  eventType: text("event_type").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTicketEventSchema = createInsertSchema(ticketEventsTable).omit({ id: true, createdAt: true });
export type InsertTicketEvent = z.infer<typeof insertTicketEventSchema>;
export type TicketEvent = typeof ticketEventsTable.$inferSelect;
