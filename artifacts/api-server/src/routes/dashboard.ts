import { Router, type IRouter } from "express";
import { db, ticketsTable, usersTable, disciplinesTable, schoolsTable } from "@workspace/db";
import { eq, and, count, inArray, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { TokenPayload } from "../lib/jwt.js";
import { authenticate, requireStaff } from "../middlewares/authenticate.js";
import { GetDashboardPgQueryParams, GetDashboardRdQueryParams, ListRdTicketsQueryParams } from "@workspace/api-zod";
import type { Ticket } from "@workspace/db";

const router: IRouter = Router();

type DashboardScope =
  | { type: "all" }
  | { type: "school"; schoolId: number }
  | { type: "discipline"; disciplineId: number }
  | { type: "school_discipline"; schoolId: number; disciplineId: number };

function resolveAdminDashboardScope(
  schoolIdFilter?: number,
  disciplineIdFilter?: number,
): DashboardScope {
  if (schoolIdFilter && disciplineIdFilter) {
    return { type: "school_discipline", schoolId: schoolIdFilter, disciplineId: disciplineIdFilter };
  }
  if (schoolIdFilter) return { type: "school", schoolId: schoolIdFilter };
  if (disciplineIdFilter) return { type: "discipline", disciplineId: disciplineIdFilter };
  return { type: "all" };
}

async function resolveRdScope(
  payload: TokenPayload,
  schoolIdFilter?: number,
  disciplineIdFilter?: number,
): Promise<DashboardScope | { error: string }> {
  if (payload.type !== "staff") return { error: "Forbidden" };

  if (payload.role === "admin") {
    return resolveAdminDashboardScope(schoolIdFilter, disciplineIdFilter);
  }

  if (schoolIdFilter || disciplineIdFilter) {
    return { error: "Forbidden" };
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
  if (payload.role === "direction") {
    if (!user?.schoolId) return { error: "Aucun établissement associé à ce compte" };
    return { type: "school", schoolId: user.schoolId };
  }
  if (payload.role === "rd") {
    if (!user?.disciplineId) return { error: "Aucune discipline associée à ce compte" };
    if (!user?.schoolId) return { error: "Aucun établissement associé à ce compte" };
    return { type: "school_discipline", schoolId: user.schoolId, disciplineId: user.disciplineId };
  }
  return { error: "Forbidden" };
}

async function resolvePgScope(
  payload: TokenPayload,
  schoolIdFilter?: number,
  disciplineIdFilter?: number,
): Promise<DashboardScope | { error: string }> {
  if (payload.type !== "staff") return { error: "Forbidden" };

  if (payload.role === "admin") {
    return resolveAdminDashboardScope(schoolIdFilter, disciplineIdFilter);
  }

  if (schoolIdFilter || disciplineIdFilter) {
    return { error: "Forbidden" };
  }

  if (payload.role === "pg") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
    if (!user?.disciplineId) return { error: "Aucune discipline associée à ce compte" };
    return { type: "discipline", disciplineId: user.disciplineId };
  }

  return { error: "Forbidden" };
}

function scopeTicketConditions(scope: DashboardScope) {
  switch (scope.type) {
    case "school":
      return [eq(ticketsTable.schoolId, scope.schoolId)];
    case "discipline":
      return [eq(ticketsTable.disciplineId, scope.disciplineId)];
    case "school_discipline":
      return [
        eq(ticketsTable.schoolId, scope.schoolId),
        eq(ticketsTable.disciplineId, scope.disciplineId),
      ];
    default:
      return [];
  }
}

function scopeWhere(scope: DashboardScope) {
  const conditions = scopeTicketConditions(scope);
  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function enrichTicketSummary(t: Ticket) {
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

router.get("/dashboard/rd", authenticate, requireStaff("rd", "admin", "direction"), async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rdQueryParams = GetDashboardRdQueryParams.safeParse(req.query);
  const schoolIdFilter = rdQueryParams.success ? rdQueryParams.data.schoolId : undefined;
  const disciplineIdFilter = rdQueryParams.success ? rdQueryParams.data.disciplineId : undefined;

  const scopeResult = await resolveRdScope(payload, schoolIdFilter, disciplineIdFilter);
  if ("error" in scopeResult) {
    res.status(403).json({ error: scopeResult.error });
    return;
  }
  const scope = scopeResult;

  const ticketFilter = scopeWhere(scope);

  const [totalResult] = ticketFilter
    ? await db.select({ total: count() }).from(ticketsTable).where(ticketFilter)
    : await db.select({ total: count() }).from(ticketsTable);
  const [openResult] = ticketFilter
    ? await db.select({ open: count() }).from(ticketsTable).where(
        and(ticketFilter, inArray(ticketsTable.status, ["new", "assigned_n1", "escalated", "assigned_n2"])),
      )
    : await db.select({ open: count() }).from(ticketsTable).where(
        inArray(ticketsTable.status, ["new", "assigned_n1", "escalated", "assigned_n2"]),
      );

  const totalTickets = totalResult?.total ?? 0;
  const openTickets = openResult?.open ?? 0;

  const pickupSql =
    scope.type === "school"
      ? sql`
          SELECT AVG(EXTRACT(EPOCH FROM (te.created_at - t.created_at)) / 60) as avg_minutes
          FROM ticket_events te
          JOIN tickets t ON t.id = te.ticket_id
          WHERE te.event_type = 'claimed_n1' AND t.school_id = ${scope.schoolId}
        `
      : scope.type === "discipline"
        ? sql`
            SELECT AVG(EXTRACT(EPOCH FROM (te.created_at - t.created_at)) / 60) as avg_minutes
            FROM ticket_events te
            JOIN tickets t ON t.id = te.ticket_id
            WHERE te.event_type = 'claimed_n1' AND t.discipline_id = ${scope.disciplineId}
          `
        : scope.type === "school_discipline"
          ? sql`
              SELECT AVG(EXTRACT(EPOCH FROM (te.created_at - t.created_at)) / 60) as avg_minutes
              FROM ticket_events te
              JOIN tickets t ON t.id = te.ticket_id
              WHERE te.event_type = 'claimed_n1'
                AND t.school_id = ${scope.schoolId}
                AND t.discipline_id = ${scope.disciplineId}
            `
          : sql`
              SELECT AVG(EXTRACT(EPOCH FROM (te.created_at - t.created_at)) / 60) as avg_minutes
              FROM ticket_events te
              JOIN tickets t ON t.id = te.ticket_id
              WHERE te.event_type = 'claimed_n1'
            `;
  const pickupData = await db.execute(pickupSql);
  const avgPickupMinutes = (pickupData.rows[0] as { avg_minutes: string | null })?.avg_minutes
    ? parseFloat((pickupData.rows[0] as { avg_minutes: string }).avg_minutes)
    : null;

  const [f2Count] = ticketFilter
    ? await db.select({ c: count() }).from(ticketsTable).where(and(ticketFilter, eq(ticketsTable.status, "closed_n1")))
    : await db.select({ c: count() }).from(ticketsTable).where(eq(ticketsTable.status, "closed_n1"));
  const [f1Count] = ticketFilter
    ? await db.select({ c: count() }).from(ticketsTable).where(and(ticketFilter, eq(ticketsTable.status, "closed_resolved")))
    : await db.select({ c: count() }).from(ticketsTable).where(eq(ticketsTable.status, "closed_resolved"));
  const [webexCount] = ticketFilter
    ? await db.select({ c: count() }).from(ticketsTable).where(and(ticketFilter, eq(ticketsTable.status, "closed_webex")))
    : await db.select({ c: count() }).from(ticketsTable).where(eq(ticketsTable.status, "closed_webex"));

  const byStatusSql =
    scope.type === "school"
      ? sql`SELECT status, COUNT(*) as count FROM tickets WHERE school_id = ${scope.schoolId} GROUP BY status`
      : scope.type === "discipline"
        ? sql`SELECT status, COUNT(*) as count FROM tickets WHERE discipline_id = ${scope.disciplineId} GROUP BY status`
        : scope.type === "school_discipline"
          ? sql`SELECT status, COUNT(*) as count FROM tickets WHERE school_id = ${scope.schoolId} AND discipline_id = ${scope.disciplineId} GROUP BY status`
          : sql`SELECT status, COUNT(*) as count FROM tickets GROUP BY status`;
  const byStatus = await db.execute(byStatusSql);

  type DisciplineRow = {
    discipline_id: number;
    discipline_name: string;
    total_tickets: string;
    escalation_rate: string | null;
    resolution_rate: string | null;
    avg_minutes: string | null;
  };

  const disciplineRankings =
    scope.type === "school"
      ? ((await db.execute(sql`
          SELECT
            d.id as discipline_id,
            d.name as discipline_name,
            COUNT(t.id) as total_tickets,
            ROUND(COUNT(*) FILTER (WHERE t.status IN ('escalated','assigned_n2','closed_resolved','closed_webex'))::numeric / NULLIF(COUNT(t.id), 0) * 100, 1) as escalation_rate,
            ROUND(COUNT(*) FILTER (WHERE t.status IN ('closed_n1','closed_resolved','closed_webex'))::numeric / NULLIF(COUNT(t.id), 0) * 100, 1) as resolution_rate,
            (
              SELECT AVG(EXTRACT(EPOCH FROM (te.created_at - t2.created_at)) / 60)
              FROM tickets t2
              JOIN ticket_events te ON te.ticket_id = t2.id AND te.event_type = 'claimed_n1'
              WHERE t2.school_id = ${scope.schoolId} AND t2.discipline_id = d.id
            ) as avg_minutes
          FROM disciplines d
          INNER JOIN tickets t ON t.discipline_id = d.id AND t.school_id = ${scope.schoolId}
          WHERE d.active = true
          GROUP BY d.id, d.name
          ORDER BY total_tickets DESC
        `)).rows as DisciplineRow[])
      : [];

  const disciplineId = scope.type === "discipline" || scope.type === "school_discipline" ? scope.disciplineId : null;
  const schoolId = scope.type === "school" || scope.type === "school_discipline" ? scope.schoolId : null;
  const [discipline] = disciplineId
    ? await db.select().from(disciplinesTable).where(eq(disciplinesTable.id, disciplineId))
    : [null];
  const [school] = schoolId
    ? await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId))
    : [null];

  res.json({
    totalTickets: Number(totalTickets),
    openTickets: Number(openTickets),
    avgPickupMinutes,
    schoolId,
    schoolName: school?.name ?? null,
    disciplineId,
    disciplineName: discipline?.name ?? null,
    resolutionByLevel: {
      f2: Number(f2Count?.c ?? 0),
      f1: Number(f1Count?.c ?? 0),
      webex: Number(webexCount?.c ?? 0),
    },
    ticketsByStatus: (byStatus.rows as { status: string; count: string }[]).map((r) => ({
      status: r.status,
      count: Number(r.count),
    })),
    disciplineRankings: disciplineRankings.map((r) => ({
      disciplineId: Number(r.discipline_id),
      disciplineName: r.discipline_name,
      totalTickets: Number(r.total_tickets),
      escalationRate: parseFloat(r.escalation_rate ?? "0"),
      resolutionRate: parseFloat(r.resolution_rate ?? "0"),
      avgMinutes: r.avg_minutes ? parseFloat(r.avg_minutes) : null,
    })),
  });
});

router.get("/dashboard/rd/tickets", authenticate, requireStaff("rd", "admin"), async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const queryParams = ListRdTicketsQueryParams.safeParse(req.query);
  const schoolId = queryParams.success ? queryParams.data.schoolId : undefined;
  const status = queryParams.success ? queryParams.data.status : undefined;
  const disciplineIdFilter = queryParams.success ? queryParams.data.disciplineId : undefined;

  const scopeResult = await resolveRdScope(payload, schoolId, disciplineIdFilter);
  if ("error" in scopeResult) {
    res.status(403).json({ error: scopeResult.error });
    return;
  }

  const filters = [...scopeTicketConditions(scopeResult)];
  if (status) filters.push(eq(ticketsTable.status, status));

  const tickets = await db.select().from(ticketsTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(ticketsTable.createdAt));

  res.json(await Promise.all(tickets.map(enrichTicketSummary)));
});

router.get("/dashboard/pg", authenticate, requireStaff("pg", "admin"), async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const queryParams = GetDashboardPgQueryParams.safeParse(req.query);
  const schoolIdFilter = queryParams.success ? queryParams.data.schoolId : undefined;
  const disciplineIdFilter = queryParams.success ? queryParams.data.disciplineId : undefined;

  const scope = await resolvePgScope(payload, schoolIdFilter, disciplineIdFilter);
  if ("error" in scope) {
    res.status(403).json({ error: scope.error });
    return;
  }

  const pgWhereClause =
    scope.type === "school"
      ? sql`WHERE t.school_id = ${scope.schoolId}`
      : scope.type === "discipline"
        ? sql`WHERE t.discipline_id = ${scope.disciplineId}`
        : scope.type === "school_discipline"
          ? sql`WHERE t.school_id = ${scope.schoolId} AND t.discipline_id = ${scope.disciplineId}`
          : sql``;

  const pgSchoolJoinScope =
    scope.type === "school" || scope.type === "school_discipline"
      ? sql`AND t.school_id = ${scope.schoolId}`
      : sql``;

  const pgDisciplineJoinScope =
    scope.type === "discipline" || scope.type === "school_discipline"
      ? sql`AND t.discipline_id = ${scope.disciplineId}`
      : sql``;

  const pgDisciplineFilter =
    scope.type === "discipline" || scope.type === "school_discipline"
      ? sql`AND d.id = ${scope.disciplineId}`
      : sql``;

  const pgSchoolFilter =
    scope.type === "school" || scope.type === "school_discipline"
      ? sql`AND s.id = ${scope.schoolId}`
      : sql``;

  const pgSchoolSubqueryScope =
    scope.type === "school" || scope.type === "school_discipline"
      ? sql`AND t2.school_id = ${scope.schoolId}`
      : sql``;

  const pgDisciplineSubqueryScope =
    scope.type === "discipline" || scope.type === "school_discipline"
      ? sql`AND t2.discipline_id = ${scope.disciplineId}`
      : sql``;

  const disciplineId = scope.type === "discipline" || scope.type === "school_discipline" ? scope.disciplineId : null;
  const schoolId = scope.type === "school" || scope.type === "school_discipline" ? scope.schoolId : null;
  const [discipline] = disciplineId
    ? await db.select().from(disciplinesTable).where(eq(disciplinesTable.id, disciplineId))
    : [null];
  const [school] = schoolId
    ? await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId))
    : [null];

  const whereClause = pgWhereClause;

  const totalResult = await db.execute(sql`
    SELECT COUNT(*) as total FROM tickets t ${whereClause}
  `);
  const totalTickets = Number((totalResult.rows[0] as { total: string })?.total ?? 0);

  const monthlyTrend = await db.execute(sql`
    SELECT TO_CHAR(t.created_at, 'YYYY-MM') as month, COUNT(*) as count
    FROM tickets t
    ${whereClause}
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);

  const schoolRankings = await db.execute(sql`
    SELECT
      s.id as school_id,
      s.name as school_name,
      COUNT(t.id) as total_tickets,
      ROUND(COUNT(*) FILTER (WHERE t.status IN ('escalated','assigned_n2','closed_resolved','closed_webex'))::numeric / NULLIF(COUNT(t.id), 0) * 100, 1) as escalation_rate,
      ROUND(COUNT(*) FILTER (WHERE t.status IN ('closed_n1','closed_resolved','closed_webex'))::numeric / NULLIF(COUNT(t.id), 0) * 100, 1) as resolution_rate,
      (
        SELECT AVG(EXTRACT(EPOCH FROM (te.created_at - t2.created_at)) / 60)
        FROM tickets t2
        JOIN ticket_events te ON te.ticket_id = t2.id AND te.event_type = 'claimed_n1'
        WHERE t2.school_id = s.id
        ${pgDisciplineSubqueryScope}
      ) as avg_minutes
    FROM schools s
    LEFT JOIN tickets t ON t.school_id = s.id ${pgDisciplineJoinScope}
    WHERE s.active = true ${pgSchoolFilter}
    GROUP BY s.id, s.name
    ORDER BY total_tickets DESC
  `);

  const disciplineRankings = await db.execute(sql`
    SELECT
      d.id as discipline_id,
      d.name as discipline_name,
      COUNT(t.id) as total_tickets,
      ROUND(COUNT(*) FILTER (WHERE t.status IN ('escalated','assigned_n2','closed_resolved','closed_webex'))::numeric / NULLIF(COUNT(t.id), 0) * 100, 1) as escalation_rate,
      ROUND(COUNT(*) FILTER (WHERE t.status IN ('closed_n1','closed_resolved','closed_webex'))::numeric / NULLIF(COUNT(t.id), 0) * 100, 1) as resolution_rate,
      (
        SELECT AVG(EXTRACT(EPOCH FROM (te.created_at - t2.created_at)) / 60)
        FROM tickets t2
        JOIN ticket_events te ON te.ticket_id = t2.id AND te.event_type = 'claimed_n1'
        WHERE t2.discipline_id = d.id
        ${pgSchoolSubqueryScope}
      ) as avg_minutes
    FROM disciplines d
    LEFT JOIN tickets t ON t.discipline_id = d.id ${pgSchoolJoinScope}
    WHERE d.active = true ${pgDisciplineFilter}
    GROUP BY d.id, d.name
    ORDER BY total_tickets DESC
  `);

  type MonthlyRow = { month: string; count: string };
  type SchoolRow = { school_id: number; school_name: string; total_tickets: string; escalation_rate: string | null; resolution_rate: string | null; avg_minutes: string | null };
  type DisciplineRow = { discipline_id: number; discipline_name: string; total_tickets: string; escalation_rate: string | null; resolution_rate: string | null; avg_minutes: string | null };

  const mapRanking = (r: { escalation_rate: string | null; resolution_rate: string | null; avg_minutes: string | null; total_tickets: string }) => ({
    totalTickets: Number(r.total_tickets),
    escalationRate: parseFloat(r.escalation_rate ?? "0"),
    resolutionRate: parseFloat(r.resolution_rate ?? "0"),
    avgMinutes: r.avg_minutes ? parseFloat(r.avg_minutes) : null,
  });

  res.json({
    totalTickets,
    schoolId,
    schoolName: school?.name ?? null,
    disciplineId,
    disciplineName: discipline?.name ?? null,
    monthlyTrend: (monthlyTrend.rows as MonthlyRow[]).map((r) => ({
      month: r.month,
      count: Number(r.count),
    })),
    schoolRankings: (schoolRankings.rows as SchoolRow[]).map((r) => ({
      schoolId: Number(r.school_id),
      schoolName: r.school_name,
      ...mapRanking(r),
    })),
    disciplineRankings: (disciplineRankings.rows as DisciplineRow[]).map((r) => ({
      disciplineId: Number(r.discipline_id),
      disciplineName: r.discipline_name,
      ...mapRanking(r),
    })),
  });
});

export default router;
