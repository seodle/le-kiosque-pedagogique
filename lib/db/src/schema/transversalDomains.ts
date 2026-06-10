import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transversalDomainsTable = pgTable("transversal_domains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const insertTransversalDomainSchema = createInsertSchema(transversalDomainsTable).omit({ id: true });
export type InsertTransversalDomain = z.infer<typeof insertTransversalDomainSchema>;
export type TransversalDomain = typeof transversalDomainsTable.$inferSelect;
