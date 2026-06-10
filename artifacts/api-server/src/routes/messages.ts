import { Router, type IRouter } from "express";
import { db, messagesTable, ticketsTable, ticketEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SendMessageBody, GetTicketMessagesParams } from "@workspace/api-zod";
import { authenticate, requireTeacherOrStaff } from "../middlewares/authenticate.js";

const router: IRouter = Router();

router.post("/messages", authenticate, requireTeacherOrStaff, async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const payload = req.authPayload!;
  const { ticketId, content } = parsed.data;

  // Verify access
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId));
  if (!ticket) {
    res.status(404).json({ error: "Ticket introuvable" });
    return;
  }

  if (payload.type === "teacher" && payload.ticketId !== ticketId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  let senderType: string;
  let senderId: number | null = null;

  if (payload.type === "teacher") {
    senderType = "teacher";
  } else {
    senderType = payload.role; // n1, n2, etc.
    senderId = payload.userId;
  }

  const [message] = await db.insert(messagesTable).values({
    ticketId,
    senderId,
    senderType,
    content,
    messageType: "text",
  }).returning();

  await db.insert(ticketEventsTable).values({
    ticketId,
    actorId: senderId,
    actorRole: senderType,
    eventType: "message_sent",
  });

  res.status(201).json({
    id: message.id,
    ticketId: message.ticketId,
    senderId: message.senderId ?? null,
    senderType: message.senderType,
    content: message.content,
    messageType: message.messageType,
    createdAt: message.createdAt.toISOString(),
  });
});

router.get("/messages/ticket/:ticketId", authenticate, requireTeacherOrStaff, async (req, res): Promise<void> => {
  const params = GetTicketMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const payload = req.authPayload!;
  const { ticketId } = params.data;

  // RD and PG cannot access messages
  if (payload.type === "staff" && (payload.role === "rd" || payload.role === "pg")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Teacher can only see their own ticket messages
  if (payload.type === "teacher" && payload.ticketId !== ticketId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.ticketId, ticketId))
    .orderBy(messagesTable.createdAt);

  res.json(messages.map((m) => ({
    id: m.id,
    ticketId: m.ticketId,
    senderId: m.senderId ?? null,
    senderType: m.senderType,
    content: m.content,
    messageType: m.messageType,
    createdAt: m.createdAt.toISOString(),
  })));
});

export default router;
