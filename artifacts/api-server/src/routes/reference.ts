import { Router, type IRouter } from "express";
import { db, schoolsTable, disciplinesTable, transversalDomainsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/schools", async (_req, res): Promise<void> => {
  const schools = await db.select().from(schoolsTable).where(eq(schoolsTable.active, true));
  res.json(schools);
});

router.get("/disciplines", async (_req, res): Promise<void> => {
  const disciplines = await db.select().from(disciplinesTable).where(eq(disciplinesTable.active, true));
  res.json(disciplines);
});

router.get("/transversal-domains", async (_req, res): Promise<void> => {
  const domains = await db.select().from(transversalDomainsTable);
  res.json(domains);
});

export default router;
