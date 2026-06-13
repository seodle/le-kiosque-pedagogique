import { Router, type IRouter } from "express";
import { db, ticketsTable, schoolsTable, disciplinesTable, usersTable, type Ticket } from "@workspace/db";
import { eq, and, inArray, desc, ne } from "drizzle-orm";
import { authenticate, requireStaff } from "../middlewares/authenticate.js";

const router: IRouter = Router();

async function enrichTicket(t: Ticket) {
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, t.schoolId));
  const [discipline] = await db.select().from(disciplinesTable).where(eq(disciplinesTable.id, t.disciplineId));
  return {
    id: t.id,
    status: t.status,
    description: t.description ?? null,
    schoolId: t.schoolId,
    disciplineId: t.disciplineId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    school: school ?? undefined,
    discipline: discipline ?? undefined,
  };
}

router.get("/intervener/pool", authenticate, requireStaff("f2", "f1"), async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  let tickets;

  if (payload.role === "f2") {
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
    tickets = await db.select().from(ticketsTable).where(eq(ticketsTable.status, "escalated"));
  }

  res.json(await Promise.all(tickets.map(enrichTicket)));
});

router.get("/intervener/my-tickets", authenticate, requireStaff("f2", "f1"), async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const resolved = req.query.resolved === "true";
  const statusFilter = payload.role === "f2"
    ? (resolved ? ["closed_n1"] : ["assigned_n1", "escalated", "assigned_n2", "closed_webex"])
    : (resolved ? ["closed_resolved"] : ["assigned_n2", "closed_webex"]);

  const tickets = await db.select().from(ticketsTable).where(
    and(
      inArray(ticketsTable.status, statusFilter),
      payload.role === "f2"
        ? eq(ticketsTable.assignedN1Id, payload.userId)
        : eq(ticketsTable.assignedN2Id!, payload.userId),
    ),
  ).orderBy(desc(ticketsTable.updatedAt));

  res.json(await Promise.all(tickets.map(enrichTicket)));
});

router.get("/intervener/colleagues", authenticate, requireStaff("f2", "f1"), async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (payload.role === "f2") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
    if (!user?.schoolId) {
      res.json([]);
      return;
    }
    const colleagues = await db
      .select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.role, "f2"),
          eq(usersTable.schoolId, user.schoolId),
          eq(usersTable.active, true),
          ne(usersTable.id, payload.userId),
        ),
      )
      .orderBy(usersTable.username);
    res.json(colleagues);
    return;
  }

  const colleagues = await db
    .select({ id: usersTable.id, username: usersTable.username })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "f1"),
        eq(usersTable.active, true),
        ne(usersTable.id, payload.userId),
      ),
    )
    .orderBy(usersTable.username);
  res.json(colleagues);
});

export default router;
