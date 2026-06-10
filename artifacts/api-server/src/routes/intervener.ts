import { Router, type IRouter } from "express";
import { db, ticketsTable, schoolsTable, disciplinesTable, transversalDomainsTable, userDomainsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { authenticate, requireStaff } from "../middlewares/authenticate.js";

const router: IRouter = Router();

router.get("/intervener/pool", authenticate, requireStaff("n1", "n2"), async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  let tickets;

  if (payload.role === "n1") {
    // N1: only new tickets from their school
    const users = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
    const user = users[0];
    if (!user?.schoolId) {
      res.json([]);
      return;
    }
    tickets = await db.select().from(ticketsTable).where(
      and(eq(ticketsTable.status, "new"), eq(ticketsTable.schoolId, user.schoolId)),
    );
  } else {
    // N2: only escalated tickets matching their domains
    const domainLinks = await db.select().from(userDomainsTable).where(eq(userDomainsTable.userId, payload.userId));
    const domainIds = domainLinks.map((d) => d.domainId);
    if (!domainIds.length) {
      res.json([]);
      return;
    }
    tickets = await db.select().from(ticketsTable).where(
      and(
        eq(ticketsTable.status, "escalated"),
        inArray(ticketsTable.transversalDomainId, domainIds),
      ),
    );
  }

  const enriched = await Promise.all(tickets.map(async (t) => {
    const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, t.schoolId));
    const [discipline] = await db.select().from(disciplinesTable).where(eq(disciplinesTable.id, t.disciplineId));
    const [domain] = t.transversalDomainId
      ? await db.select().from(transversalDomainsTable).where(eq(transversalDomainsTable.id, t.transversalDomainId))
      : [null];
    return {
      id: t.id,
      status: t.status,
      schoolId: t.schoolId,
      disciplineId: t.disciplineId,
      transversalDomainId: t.transversalDomainId ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      school: school ?? undefined,
      discipline: discipline ?? undefined,
      transversalDomain: domain ?? undefined,
    };
  }));

  res.json(enriched);
});

router.get("/intervener/my-tickets", authenticate, requireStaff("n1", "n2"), async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const statusFilter = payload.role === "n1"
    ? ["assigned_n1"]
    : ["assigned_n2"];

  const tickets = await db.select().from(ticketsTable).where(
    and(
      inArray(ticketsTable.status, statusFilter),
      payload.role === "n1"
        ? eq(ticketsTable.assignedN1Id, payload.userId)
        : eq(ticketsTable.assignedN2Id!, payload.userId),
    ),
  );

  const enriched = await Promise.all(tickets.map(async (t) => {
    const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, t.schoolId));
    const [discipline] = await db.select().from(disciplinesTable).where(eq(disciplinesTable.id, t.disciplineId));
    const [domain] = t.transversalDomainId
      ? await db.select().from(transversalDomainsTable).where(eq(transversalDomainsTable.id, t.transversalDomainId))
      : [null];
    return {
      id: t.id,
      status: t.status,
      schoolId: t.schoolId,
      disciplineId: t.disciplineId,
      transversalDomainId: t.transversalDomainId ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      school: school ?? undefined,
      discipline: discipline ?? undefined,
      transversalDomain: domain ?? undefined,
    };
  }));

  res.json(enriched);
});

export default router;
