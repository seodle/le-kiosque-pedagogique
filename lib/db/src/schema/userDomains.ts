import { pgTable, integer, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { transversalDomainsTable } from "./transversalDomains";

export const userDomainsTable = pgTable(
  "user_domains",
  {
    userId: integer("user_id").notNull().references(() => usersTable.id),
    domainId: integer("domain_id").notNull().references(() => transversalDomainsTable.id),
  },
  (t) => [primaryKey({ columns: [t.userId, t.domainId] })],
);

export type UserDomain = typeof userDomainsTable.$inferSelect;
