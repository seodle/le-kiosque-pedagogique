import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, ticketsTable, schoolsTable, disciplinesTable, messagesTable, ticketEventsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateTicketBody,
  LoginTicketBody,
  GetTicketParams,
  ClaimTicketParams,
  EscalateTicketParams,
  ResolveTicketN1Params,
  ResolveTicketParams,
  CloseTicketWebexParams,
  CloseTicketWebexBody,
  ReassignTicketN1Params,
  ReassignTicketN1Body,
  ReassignTicketN2Params,
  ReassignTicketN2Body,
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

  res.json(await buildTicketDetail(ticket, { includeAssignees: payload.type === "staff" }));
});

// ── CLAIM TICKET (F2 or F3) ──────────────────────────────────────────────────
router.patch("/tickets/:id/claim", authenticate, requireStaff("f2", "f3"), async (req, res): Promise<void> => {
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

  const isF2 = payload.role === "f2";
  const isF3 = payload.role === "f3";

  if (isF2 && ticket.status !== "new") {
    res.status(409).json({ error: "Ticket non disponible" });
    return;
  }
  if (isF3 && ticket.status !== "escalated") {
    res.status(409).json({ error: "Ticket non disponible pour F3" });
    return;
  }

  const newStatus = isF2 ? "assigned_n1" : "assigned_n2";
  const updateData = isF2
    ? { status: newStatus, assignedN1Id: payload.userId }
    : { status: newStatus, assignedN2Id: payload.userId };

  const [updated] = await db.update(ticketsTable).set(updateData).where(eq(ticketsTable.id, params.data.id)).returning();

  await db.insert(ticketEventsTable).values({
    ticketId: ticket.id,
    actorId: payload.userId,
    actorRole: payload.role,
    eventType: isF2 ? "claimed_n1" : "claimed_n2",
    oldStatus: ticket.status,
    newStatus,
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: isF2 ? "Une personne ressource établissement a pris en charge votre demande." : "Une personne ressource externe a pris en charge votre demande.",
    messageType: "system",
  });

  res.json(await buildTicketDetail(updated, { includeAssignees: true }));
});

// ── REASSIGN F2 ──────────────────────────────────────────────────────────────
router.patch("/tickets/:id/reassign-n1", authenticate, requireStaff("f2"), async (req, res): Promise<void> => {
  const params = ReassignTicketN1Params.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = ReassignTicketN1Body.safeParse(req.body);
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
  if (!ticket) {
    res.status(404).json({ error: "Ticket introuvable" });
    return;
  }

  const allowedStatuses = new Set(["assigned_n1", "escalated", "assigned_n2", "closed_webex"]);
  if (!allowedStatuses.has(ticket.status) || ticket.assignedN1Id !== payload.userId) {
    res.status(409).json({ error: "Cette demande ne peut pas être transférée dans son état actuel" });
    return;
  }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, body.data.targetUserId));
  if (
    !target
    || target.role !== "f2"
    || !target.active
    || target.id === payload.userId
    || !currentUser?.schoolId
    || target.schoolId !== currentUser.schoolId
  ) {
    res.status(400).json({ error: "Personne ressource cible invalide" });
    return;
  }

  const [updated] = await db
    .update(ticketsTable)
    .set({ assignedN1Id: target.id })
    .where(eq(ticketsTable.id, params.data.id))
    .returning();

  await db.insert(ticketEventsTable).values({
    ticketId: ticket.id,
    actorId: payload.userId,
    actorRole: "f2",
    eventType: "reassigned_n1",
    oldStatus: ticket.status,
    newStatus: ticket.status,
    metadata: { fromUserId: payload.userId, toUserId: target.id },
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: "Votre demande a été transférée à une autre personne ressource de l'établissement.",
    messageType: "system",
  });

  res.json(await buildTicketDetail(updated, { includeAssignees: true }));
});

// ── REASSIGN F3 ──────────────────────────────────────────────────────────────
router.patch("/tickets/:id/reassign-n2", authenticate, requireStaff("f3"), async (req, res): Promise<void> => {
  const params = ReassignTicketN2Params.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = ReassignTicketN2Body.safeParse(req.body);
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
  if (!ticket) {
    res.status(404).json({ error: "Ticket introuvable" });
    return;
  }

  const allowedStatuses = new Set(["assigned_n2", "closed_webex"]);
  if (!allowedStatuses.has(ticket.status) || ticket.assignedN2Id !== payload.userId) {
    res.status(409).json({ error: "Cette demande ne peut pas être transférée dans son état actuel" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, body.data.targetUserId));
  if (!target || target.role !== "f3" || !target.active || target.id === payload.userId) {
    res.status(400).json({ error: "Personne ressource cible invalide" });
    return;
  }

  const [updated] = await db
    .update(ticketsTable)
    .set({ assignedN2Id: target.id })
    .where(eq(ticketsTable.id, params.data.id))
    .returning();

  await db.insert(ticketEventsTable).values({
    ticketId: ticket.id,
    actorId: payload.userId,
    actorRole: "f3",
    eventType: "reassigned_n2",
    oldStatus: ticket.status,
    newStatus: ticket.status,
    metadata: { fromUserId: payload.userId, toUserId: target.id },
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: "Votre demande a été transférée à une autre personne ressource externe.",
    messageType: "system",
  });

  res.json(await buildTicketDetail(updated, { includeAssignees: true }));
});

// ── ESCALATE (F2 → F3) ───────────────────────────────────────────────────────
router.patch("/tickets/:id/escalate", authenticate, requireStaff("f2"), async (req, res): Promise<void> => {
  const params = EscalateTicketParams.safeParse(req.params);
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
    res.status(409).json({ error: "Cette demande ne peut pas être remontée dans son état actuel" });
    return;
  }

  const [updated] = await db.update(ticketsTable).set({
    status: "escalated",
  }).where(eq(ticketsTable.id, params.data.id)).returning();

  await db.insert(ticketEventsTable).values({
    ticketId: ticket.id,
    actorId: payload.userId,
    actorRole: "f2",
    eventType: "escalated",
    oldStatus: "assigned_n1",
    newStatus: "escalated",
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: "Votre demande a été remontée vers une personne ressource externe.",
    messageType: "system",
  });

  res.json(await buildTicketDetail(updated, { includeAssignees: true }));
});

// ── RESOLVE F2 ───────────────────────────────────────────────────────────────
router.patch("/tickets/:id/resolve-n1", authenticate, requireStaff("f2"), async (req, res): Promise<void> => {
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
    actorRole: "f2",
    eventType: "resolved_n1",
    oldStatus: "assigned_n1",
    newStatus: "closed_n1",
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: "Votre demande a été résolue par la personne ressource établissement. Merci.",
    messageType: "system",
  });

  res.json(await buildTicketDetail(updated, { includeAssignees: true }));
});

// ── RESOLVE F3 ───────────────────────────────────────────────────────────────
router.patch("/tickets/:id/resolve", authenticate, requireStaff("f3"), async (req, res): Promise<void> => {
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
    actorRole: "f3",
    eventType: "resolved_n2",
    oldStatus: "assigned_n2",
    newStatus: "closed_resolved",
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: "Votre demande a été résolue par la personne ressource externe. Merci.",
    messageType: "system",
  });

  res.json(await buildTicketDetail(updated, { includeAssignees: true }));
});

// ── WEBEX CLOSE ───────────────────────────────────────────────────────────────
router.patch("/tickets/:id/webex", authenticate, requireStaff("f3"), async (req, res): Promise<void> => {
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

  const scheduledAt = new Date(body.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    res.status(400).json({ error: "Date de session invalide" });
    return;
  }

  const whenLabel = scheduledAt.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const [updated] = await db.update(ticketsTable).set({
    status: "closed_webex",
    webexLink: body.data.webexLink,
    webexScheduledAt: scheduledAt,
    webexCreatedAt: new Date(),
  }).where(eq(ticketsTable.id, params.data.id)).returning();

  await db.insert(ticketEventsTable).values({
    ticketId: ticket.id,
    actorId: payload.userId,
    actorRole: "f3",
    eventType: "webex_invitation",
    oldStatus: "assigned_n2",
    newStatus: "closed_webex",
    metadata: { webexLink: body.data.webexLink, scheduledAt: scheduledAt.toISOString() },
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderType: "system",
    content: `Une session collective en visio a été programmée le ${whenLabel}.\nLien : ${body.data.webexLink}`,
    messageType: "webex",
  });

  res.json(await buildTicketDetail(updated, { includeAssignees: true }));
});

// ── HELPERS ──────────────────────────────────────────────────────────────────
async function buildTicketDetail(
  ticket: typeof ticketsTable.$inferSelect,
  options?: { includeAssignees?: boolean },
) {
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, ticket.schoolId));
  const [discipline] = await db.select().from(disciplinesTable).where(eq(disciplinesTable.id, ticket.disciplineId));
  return {
    id: ticket.id,
    status: ticket.status,
    schoolId: ticket.schoolId,
    disciplineId: ticket.disciplineId,
    description: ticket.description ?? null,
    webexLink: ticket.webexLink ?? null,
    webexScheduledAt: ticket.webexScheduledAt?.toISOString() ?? null,
    webexCreatedAt: ticket.webexCreatedAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    school: school ?? undefined,
    discipline: discipline ?? undefined,
    ...(options?.includeAssignees
      ? { assignedN1Id: ticket.assignedN1Id ?? null, assignedN2Id: ticket.assignedN2Id ?? null }
      : {}),
  };
}

export { buildTicketDetail };
export default router;
