import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import {
  db,
  usersTable,
  schoolsTable,
  disciplinesTable,
  ticketsTable,
  messagesTable,
  ticketEventsTable,
} from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody, UpdateUserParams, CreateSchoolBody, CreateDisciplineBody } from "@workspace/api-zod";
import { authenticate, requireStaff } from "../middlewares/authenticate.js";
import { buildUserResponse } from "./auth.js";

const router: IRouter = Router();

router.get("/admin/users", authenticate, requireStaff("admin"), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  const enriched = await Promise.all(users.map(buildUserResponse));
  res.json(enriched);
});

router.post("/admin/users", authenticate, requireStaff("admin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password, role, schoolId, disciplineId } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing) {
    res.status(409).json({ error: "Ce pseudo est déjà utilisé" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db.insert(usersTable).values({
    username,
    passwordHash,
    role,
    schoolId: schoolId ?? null,
    disciplineId: disciplineId ?? null,
  }).returning();

  res.status(201).json(await buildUserResponse(user));
});

router.patch("/admin/users/:id", authenticate, requireStaff("admin"), async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password, ...rest } = parsed.data;

  if (rest.username) {
    const [duplicate] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.username, rest.username), ne(usersTable.id, params.data.id)));
    if (duplicate) {
      res.status(409).json({ error: "Ce pseudo est déjà utilisé" });
      return;
    }
  }

  const updateData: Record<string, unknown> = { ...rest };
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(await buildUserResponse(user));
});

router.delete("/admin/users/:id", authenticate, requireStaff("admin"), async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const payload = req.authPayload!;
  if (payload.type === "staff" && payload.userId === params.data.id) {
    res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const userId = params.data.id;
  await db.update(ticketsTable).set({ assignedN1Id: null }).where(eq(ticketsTable.assignedN1Id, userId));
  await db.update(ticketsTable).set({ assignedN2Id: null }).where(eq(ticketsTable.assignedN2Id, userId));
  await db.update(messagesTable).set({ senderId: null }).where(eq(messagesTable.senderId, userId));
  await db.update(ticketEventsTable).set({ actorId: null }).where(eq(ticketEventsTable.actorId, userId));
  await db.delete(usersTable).where(eq(usersTable.id, userId));

  res.status(204).send();
});

router.post("/admin/schools", authenticate, requireStaff("admin"), async (req, res): Promise<void> => {
  const parsed = CreateSchoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [school] = await db.insert(schoolsTable).values(parsed.data).returning();
  res.status(201).json(school);
});

router.post("/admin/disciplines", authenticate, requireStaff("admin"), async (req, res): Promise<void> => {
  const parsed = CreateDisciplineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [discipline] = await db.insert(disciplinesTable).values(parsed.data).returning();
  res.status(201).json(discipline);
});

export default router;
