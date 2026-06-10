import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { disciplinesTable } from "./disciplines";
import { transversalDomainsTable } from "./transversalDomains";
import { usersTable } from "./users";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  assignedN1Id: integer("assigned_n1_id").references(() => usersTable.id),
  assignedN2Id: integer("assigned_n2_id").references(() => usersTable.id),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id),
  disciplineId: integer("discipline_id").notNull().references(() => disciplinesTable.id),
  transversalDomainId: integer("transversal_domain_id").references(() => transversalDomainsTable.id),
  description: text("description"),
  status: text("status").notNull().default("new"),
  webexLink: text("webex_link"),
  webexCreatedAt: timestamp("webex_created_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
