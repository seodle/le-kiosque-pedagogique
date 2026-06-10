import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, ticketsTable, schoolsTable, disciplinesTable, transversalDomainsTable, messagesTable, ticketEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateTicketBody,
  LoginTicketBody,
  GetTicketParams,
  ClaimTicketParams,
  EscalateTicketParams,
  EscalateTicketBody,
  ResolveTicketN1Params,
  ResolveTicketParams,
  CloseTicketWebexParams,
  CloseTicketWebexBody,
} from "@workspace/api-zod";
import { signToken } from "../lib/jwt.js";
import { generateReadablePassword } from "../lib/password.js";
import { authenticate, requireStaff, requireTeacherOrStaff } from "../middlewares/authenticate.js";

const router: IRouter = Router();

// ── CREATE TICKET (anonymous) ───────────────────────────────────────────────
router.post("/tickets/create", async (req, res): Promise<void> => {
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { schoolId, disciplineId, description } = parsed.data;

  const plainPassword = generateReadablePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const [ticket] = await db.insert(ticketsTable).values({
    schoolId,
    disciplineId,
    description,
    passwordHash,
    status: "new",
  }).returning();

  await db.insert(ticketEventsTable).values({
    ticketId: ticket.id,
    actorRole: "teacher",
    eventType: "ticket_created",
    newStatus: "new",
  });

  const token = signToken({ type: "teacher", ticketId: ticket.id }, "30d");

  res.status(201).json({ ticketNumber: ticket.id, password: plainPassword, token });
});

// ── TEACHER LOGIN ────────────────────────────────────────────────────────────
router.post("/tickets/login", async (req, res): Promise<void> => {
  const parsed = LoginTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { ticketNumber, password } = parsed.data;
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketNumber));

  if (!ticket) {
    res.status(401).json({ error: "Ticket introuvable" });
    return;
  }

  const valid = await bcrypt.compare(password, ticket.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Mot de passe incorrect" });
    return;
  }

  const token = signToken({ type: "teacher", ticketId: ticket.id }, "30d");
  res.json({ token });
});

// ── MY TICKET (teacher) ──────────────────────────────────────────────────────
router.get("/tickets/me", authenticate, async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "teacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, payload.ticketId));
  if (!ticket) {
    res.status(404).json({ error: "Ticket introuvable" });
    return;
  }

  res.json(await buildTicketDetail(ticket));
});

// ── GET TICKET BY ID (staff) ─────────────────────────────────────────────────
router.get("/tickets/:id", authenticate, requireTeacherOrStaff, async (req, res): Promise<void> => {
  const params = GetTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const payload = req.authPayload!;

  // Teacher can only access their own ticket
  if (payload.type === "teacher") {
    if (payload.ticketId !== params.data.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, params.data.id));
  if (!ticket) {
    res.status(404).json({ error: "Ticket introuvable" });
    return;
  }

  res.json(await buildTicketDetail(ticket));
});

// ── CLAIM TICKET (N1 or N2) ──────────────────────────────────────────────────
router.patch("/tickets/:id/claim", authenticate, requireStaff("n1", "n2"), async (req, res): Promise<void> => {
  const params = ClaimTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, params.data.id));
  if (!ticket) {
    res.status(404).json({ error: "Ticket introuvable" });
    return;
  }

  const isN1 = payload.role === "n1";
  const isN2 = payload.role === "n2";

  if (isN1 && ticket.status !== "new") {
    res.status(409).json({ error: "Ticket non disponible" });
    return;
  }
  if (isN2 && ticket.status !== "escalated") {
    res.status(409).json({ error: "Ticket non disponible pour N2" });
    return;
  }

  const newStatus = isN1 ? "assigned_n1" : "assigned_n2";
  const updateData = isN1
    ? { status: newStatus, assignedN1Id: payload.userId }
    : { status: newStatus, assignedN2Id: payload.userId };

  const [updated] = await db.update(ticketsTable).set(updateData).where(eq(ticketsTable.id, params.data.id)).returning();

  await db.insert(ticketEventsTable).values({
    ticketId: ticket.id,
    actorId: payload.userId,
    actorRole: payload.role,
    eventType: isN1 ? "claimed_n1" : "claimed_n2",
    oldStatus: ticket.status,
    newStatus,
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: isN1 ? "Un intervenant N1 a pris en charge votre demande." : "Un expert N2 a pris en charge votre demande.",
    messageType: "system",
  });

  res.json(await buildTicketDetail(updated));
});

// ── ESCALATE (N1 → N2) ───────────────────────────────────────────────────────
router.patch("/tickets/:id/escalate", authenticate, requireStaff("n1"), async (req, res): Promise<void> => {
  const params = EscalateTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = EscalateTicketBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, params.data.id));
  if (!ticket || ticket.status !== "assigned_n1") {
    res.status(409).json({ error: "Ticket ne peut pas être escaladé" });
    return;
  }

  const [updated] = await db.update(ticketsTable).set({
    status: "escalated",
    transversalDomainId: body.data.transversalDomainId,
  }).where(eq(ticketsTable.id, params.data.id)).returning();

  await db.insert(ticketEventsTable).values({
    ticketId: ticket.id,
    actorId: payload.userId,
    actorRole: "n1",
    eventType: "escalated",
    oldStatus: "assigned_n1",
    newStatus: "escalated",
    metadata: { transversalDomainId: body.data.transversalDomainId },
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: "Votre demande a été escaladée vers un expert de niveau 2.",
    messageType: "system",
  });

  res.json(await buildTicketDetail(updated));
});

// ── RESOLVE N1 ───────────────────────────────────────────────────────────────
router.patch("/tickets/:id/resolve-n1", authenticate, requireStaff("n1"), async (req, res): Promise<void> => {
  const params = ResolveTicketN1Params.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, params.data.id));
  if (!ticket || ticket.status !== "assigned_n1") {
    res.status(409).json({ error: "Ticket ne peut pas être résolu" });
    return;
  }

  const [updated] = await db.update(ticketsTable).set({ status: "closed_n1" }).where(eq(ticketsTable.id, params.data.id)).returning();

  await db.insert(ticketEventsTable).values({
    ticketId: ticket.id,
    actorId: payload.userId,
    actorRole: "n1",
    eventType: "resolved_n1",
    oldStatus: "assigned_n1",
    newStatus: "closed_n1",
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: "Votre demande a été résolue au niveau 1. Merci.",
    messageType: "system",
  });

  res.json(await buildTicketDetail(updated));
});

// ── RESOLVE N2 ───────────────────────────────────────────────────────────────
router.patch("/tickets/:id/resolve", authenticate, requireStaff("n2"), async (req, res): Promise<void> => {
  const params = ResolveTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, params.data.id));
  if (!ticket || ticket.status !== "assigned_n2") {
    res.status(409).json({ error: "Ticket ne peut pas être résolu" });
    return;
  }

  const [updated] = await db.update(ticketsTable).set({ status: "closed_resolved" }).where(eq(ticketsTable.id, params.data.id)).returning();

  await db.insert(ticketEventsTable).values({
    ticketId: ticket.id,
    actorId: payload.userId,
    actorRole: "n2",
    eventType: "resolved_n2",
    oldStatus: "assigned_n2",
    newStatus: "closed_resolved",
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: "Votre demande a été résolue par l'expert de niveau 2. Merci.",
    messageType: "system",
  });

  res.json(await buildTicketDetail(updated));
});

// ── WEBEX CLOSE ───────────────────────────────────────────────────────────────
router.patch("/tickets/:id/webex", authenticate, requireStaff("n2"), async (req, res): Promise<void> => {
  const params = CloseTicketWebexParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CloseTicketWebexBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, params.data.id));
  if (!ticket || ticket.status !== "assigned_n2") {
    res.status(409).json({ error: "Ticket ne peut pas être clôturé" });
    return;
  }

  const [updated] = await db.update(ticketsTable).set({
    status: "closed_webex",
    webexLink: body.data.webexLink,
    webexCreatedAt: new Date(),
  }).where(eq(ticketsTable.id, params.data.id)).returning();

  await db.insert(ticketEventsTable).values({
    ticketId: ticket.id,
    actorId: payload.userId,
    actorRole: "n2",
    eventType: "webex_invitation",
    oldStatus: "assigned_n2",
    newStatus: "closed_webex",
    metadata: { webexLink: body.data.webexLink },
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: `Une session collective Webex a été organisée : ${body.data.webexLink}`,
    messageType: "webex",
  });

  res.json(await buildTicketDetail(updated));
});

// ── HELPERS ──────────────────────────────────────────────────────────────────
async function buildTicketDetail(ticket: typeof ticketsTable.$inferSelect) {
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, ticket.schoolId));
  const [discipline] = await db.select().from(disciplinesTable).where(eq(disciplinesTable.id, ticket.disciplineId));
  const [domain] = ticket.transversalDomainId
    ? await db.select().from(transversalDomainsTable).where(eq(transversalDomainsTable.id, ticket.transversalDomainId))
    : [null];

  return {
    id: ticket.id,
    status: ticket.status,
    schoolId: ticket.schoolId,
    disciplineId: ticket.disciplineId,
    transversalDomainId: ticket.transversalDomainId ?? null,
    description: ticket.description ?? null,
    webexLink: ticket.webexLink ?? null,
    webexCreatedAt: ticket.webexCreatedAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    school: school ?? undefined,
    discipline: discipline ?? undefined,
    transversalDomain: domain ?? undefined,
  };
}

export { buildTicketDetail };
export default router;
