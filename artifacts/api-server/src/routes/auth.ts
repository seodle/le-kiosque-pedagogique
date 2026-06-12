import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, schoolsTable, disciplinesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { StaffLoginBody, GetMeResponse } from "@workspace/api-zod";
import { signToken } from "../lib/jwt.js";
import { authenticate } from "../middlewares/authenticate.js";

const router: IRouter = Router();

router.post("/auth/staff-login", async (req, res): Promise<void> => {
  const parsed = StaffLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  if (!user || !user.active) {
    res.status(401).json({ error: "Identifiants invalides" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Identifiants invalides" });
    return;
  }

  const token = signToken(
    { type: "staff", userId: user.id, role: user.role, username: user.username },
    "8h",
  );

  res.json({ token, user: await buildUserResponse(user) });
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const payload = req.authPayload!;
  if (payload.type !== "staff") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(await buildUserResponse(user));
});

async function buildUserResponse(user: typeof usersTable.$inferSelect) {
  const [school] = user.schoolId
    ? await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId))
    : [null];

  const [discipline] = user.disciplineId
    ? await db.select().from(disciplinesTable).where(eq(disciplinesTable.id, user.disciplineId))
    : [null];

  return GetMeResponse.parse({
    id: user.id,
    username: user.username,
    role: user.role,
    schoolId: user.schoolId ?? null,
    disciplineId: user.disciplineId ?? null,
    active: user.active,
    school: school ?? undefined,
    discipline: discipline ?? undefined,
  });
}

export { buildUserResponse };
export default router;
