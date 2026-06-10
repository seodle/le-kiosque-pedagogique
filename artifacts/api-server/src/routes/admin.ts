import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, userDomainsTable, schoolsTable, disciplinesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody, UpdateUserParams, CreateSchoolBody, CreateDisciplineBody } from "@workspace/api-zod";
import { authenticate, requireStaff } from "../middlewares/authenticate.js";
import { buildUserResponse } from "./auth.js";

const router: IRouter = Router();

// ── LIST USERS ───────────────────────────────────────────────────────────────
router.get("/admin/users", authenticate, requireStaff("admin"), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  const enriched = await Promise.all(users.map(buildUserResponse));
  res.json(enriched);
});

// ── CREATE USER ──────────────────────────────────────────────────────────────
router.post("/admin/users", authenticate, requireStaff("admin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, role, schoolId, disciplineId, domainIds } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    role,
    schoolId: schoolId ?? null,
    disciplineId: disciplineId ?? null,
  }).returning();

  if (domainIds?.length) {
    await db.insert(userDomainsTable).values(domainIds.map((id) => ({ userId: user.id, domainId: id })));
  }

  res.status(201).json(await buildUserResponse(user));
});

// ── UPDATE USER ──────────────────────────────────────────────────────────────
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

  const { password, domainIds, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (domainIds !== undefined) {
    await db.delete(userDomainsTable).where(eq(userDomainsTable.userId, user.id));
    if (domainIds.length) {
      await db.insert(userDomainsTable).values(domainIds.map((id) => ({ userId: user.id, domainId: id })));
    }
  }

  res.json(await buildUserResponse(user));
});

// ── CREATE SCHOOL ────────────────────────────────────────────────────────────
router.post("/admin/schools", authenticate, requireStaff("admin"), async (req, res): Promise<void> => {
  const parsed = CreateSchoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [school] = await db.insert(schoolsTable).values(parsed.data).returning();
  res.status(201).json(school);
});

// ── CREATE DISCIPLINE ────────────────────────────────────────────────────────
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
