import { Router, type IRouter } from "express";
import { db, ticketsTable, transversalDomainsTable, schoolsTable, ticketEventsTable } from "@workspace/db";
import { eq, and, count, avg, sql, inArray } from "drizzle-orm";
import { authenticate, requireStaff } from "../middlewares/authenticate.js";
import { GetDashboardPgQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/rd", authenticate, requireStaff("rd", "pg", "admin"), async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Total and open tickets
  const [totalResult] = await db.select({ total: count() }).from(ticketsTable);
  const [openResult] = await db.select({ open: count() }).from(ticketsTable)
    .where(inArray(ticketsTable.status, ["new", "assigned_n1", "escalated", "assigned_n2"]));

  const totalTickets = totalResult?.total ?? 0;
  const openTickets = openResult?.open ?? 0;

  // Avg pickup minutes: time from created_at to first claimed_n1 event
  const pickupData = await db.execute(sql`
    SELECT AVG(EXTRACT(EPOCH FROM (te.created_at - t.created_at)) / 60) as avg_minutes
    FROM ticket_events te
    JOIN tickets t ON t.id = te.ticket_id
    WHERE te.event_type = 'claimed_n1'
  `);
  const avgPickupMinutes = (pickupData.rows[0] as { avg_minutes: string | null })?.avg_minutes
    ? parseFloat((pickupData.rows[0] as { avg_minutes: string }).avg_minutes)
    : null;

  // Resolution by level
  const [n1Count] = await db.select({ c: count() }).from(ticketsTable).where(eq(ticketsTable.status, "closed_n1"));
  const [n2Count] = await db.select({ c: count() }).from(ticketsTable).where(eq(ticketsTable.status, "closed_resolved"));
  const [webexCount] = await db.select({ c: count() }).from(ticketsTable).where(eq(ticketsTable.status, "closed_webex"));

  // Escalations by domain
  const escalationsByDomain = await db.execute(sql`
    SELECT td.name as domain, COUNT(t.id) as count
    FROM tickets t
    JOIN transversal_domains td ON td.id = t.transversal_domain_id
    WHERE t.transversal_domain_id IS NOT NULL
    GROUP BY td.name
    ORDER BY count DESC
  `);

  // Tickets by status
  const byStatus = await db.execute(sql`
    SELECT status, COUNT(*) as count FROM tickets GROUP BY status
  `);

  res.json({
    totalTickets: Number(totalTickets),
    openTickets: Number(openTickets),
    avgPickupMinutes: avgPickupMinutes,
    resolutionByLevel: {
      n1: Number(n1Count?.c ?? 0),
      n2: Number(n2Count?.c ?? 0),
      webex: Number(webexCount?.c ?? 0),
    },
    escalationsByDomain: (escalationsByDomain.rows as { domain: string; count: string }[]).map((r) => ({
      domain: r.domain,
      count: Number(r.count),
    })),
    ticketsByStatus: (byStatus.rows as { status: string; count: string }[]).map((r) => ({
      status: r.status,
      count: Number(r.count),
    })),
  });
});

router.get("/dashboard/pg", authenticate, requireStaff("pg", "admin"), async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const queryParams = GetDashboardPgQueryParams.safeParse(req.query);
  const disciplineId = queryParams.success ? queryParams.data.disciplineId : undefined;

  const whereClause = disciplineId ? sql`WHERE t.discipline_id = ${disciplineId}` : sql``;

  // Total tickets
  const totalResult = await db.execute(sql`
    SELECT COUNT(*) as total FROM tickets t ${whereClause}
  `);
  const totalTickets = Number((totalResult.rows[0] as { total: string })?.total ?? 0);

  // Monthly trend
  const monthlyTrend = await db.execute(sql`
    SELECT TO_CHAR(t.created_at, 'YYYY-MM') as month, COUNT(*) as count
    FROM tickets t
    ${whereClause}
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);

  // School rankings
  const schoolRankings = await db.execute(sql`
    SELECT
      s.id as school_id,
      s.name as school_name,
      COUNT(t.id) as total_tickets,
      ROUND(SUM(CASE WHEN t.status IN ('escalated','assigned_n2','closed_resolved','closed_webex') THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(t.id), 0) * 100, 1) as escalation_rate,
      AVG(CASE
        WHEN te.created_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (te.created_at - t.created_at)) / 60
      END) as avg_minutes,
      (SELECT td.name FROM transversal_domains td
       JOIN tickets t2 ON t2.transversal_domain_id = td.id
       WHERE t2.school_id = s.id AND t2.transversal_domain_id IS NOT NULL
       GROUP BY td.name ORDER BY COUNT(*) DESC LIMIT 1) as dominant_domain
    FROM schools s
    LEFT JOIN tickets t ON t.school_id = s.id
    LEFT JOIN ticket_events te ON te.ticket_id = t.id AND te.event_type = 'claimed_n1'
    WHERE s.active = true
    GROUP BY s.id, s.name
    ORDER BY total_tickets DESC
  `);

  // Top domains
  const topDomains = await db.execute(sql`
    SELECT td.name as domain, COUNT(t.id) as count
    FROM tickets t
    JOIN transversal_domains td ON td.id = t.transversal_domain_id
    WHERE t.transversal_domain_id IS NOT NULL
    GROUP BY td.name
    ORDER BY count DESC
    LIMIT 10
  `);

  type MonthlyRow = { month: string; count: string };
  type SchoolRow = { school_id: number; school_name: string; total_tickets: string; escalation_rate: string | null; avg_minutes: string | null; dominant_domain: string | null };
  type DomainRow = { domain: string; count: string };

  res.json({
    totalTickets,
    monthlyTrend: (monthlyTrend.rows as MonthlyRow[]).map((r) => ({
      month: r.month,
      count: Number(r.count),
    })),
    schoolRankings: (schoolRankings.rows as SchoolRow[]).map((r) => ({
      schoolId: Number(r.school_id),
      schoolName: r.school_name,
      totalTickets: Number(r.total_tickets),
      escalationRate: parseFloat(r.escalation_rate ?? "0"),
      avgMinutes: r.avg_minutes ? parseFloat(r.avg_minutes) : null,
      dominantDomain: r.dominant_domain ?? null,
    })),
    topDomains: (topDomains.rows as DomainRow[]).map((r) => ({
      domain: r.domain,
      count: Number(r.count),
    })),
  });
});

export default router;
