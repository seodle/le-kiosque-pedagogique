import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: path.resolve(root, ".env") });

const {
  db,
  usersTable,
  schoolsTable,
  disciplinesTable,
} = await import("@workspace/db");

const DEMO = process.argv.includes("--demo");

const SCHOOLS = [
  { name: "Bois-Caran" },
  { name: "Voirets" },
  { name: "Renard" },
  { name: "Cayla" },
  { name: "Colombières" },
];

const DISCIPLINES = [
  "Français",
  "Mathématiques",
  "Allemand",
  "Latin",
  "Histoire",
  "Géographie",
  "Éducation physique",
  "Éducation nutritionnelle",
  "Activités créatrices et manuelles",
  "Biologie",
  "Informatique",
];

async function ensureSchools() {
  const officialNames = SCHOOLS.map((s) => s.name);
  const all = await db.select().from(schoolsTable);

  for (const school of all) {
    if (!officialNames.includes(school.name) && school.active) {
      await db.update(schoolsTable).set({ active: false }).where(eq(schoolsTable.id, school.id));
      console.log(`  − établissement retiré: ${school.name}`);
    }
  }

  const result = [];
  for (const school of SCHOOLS) {
    const existing = await db.select().from(schoolsTable).where(eq(schoolsTable.name, school.name));
    if (!existing.length) {
      const [created] = await db.insert(schoolsTable).values({ ...school, active: true }).returning();
      console.log(`  + établissement: ${school.name}`);
      result.push(created);
    } else if (!existing[0].active) {
      const [updated] = await db.update(schoolsTable).set({ active: true }).where(eq(schoolsTable.id, existing[0].id)).returning();
      console.log(`  ~ établissement réactivé: ${school.name}`);
      result.push(updated);
    } else {
      result.push(existing[0]);
    }
  }
  return result;
}

async function ensureDisciplines() {
  const all = await db.select().from(disciplinesTable);

  for (const discipline of all) {
    if (!DISCIPLINES.includes(discipline.name) && discipline.active) {
      await db.update(disciplinesTable).set({ active: false }).where(eq(disciplinesTable.id, discipline.id));
      console.log(`  − discipline retirée: ${discipline.name}`);
    }
  }

  const result = [];
  for (const name of DISCIPLINES) {
    const existing = await db.select().from(disciplinesTable).where(eq(disciplinesTable.name, name));
    if (!existing.length) {
      const [created] = await db.insert(disciplinesTable).values({ name, active: true }).returning();
      console.log(`  + discipline: ${name}`);
      result.push(created);
    } else if (!existing[0].active) {
      const [updated] = await db.update(disciplinesTable).set({ active: true }).where(eq(disciplinesTable.id, existing[0].id)).returning();
      console.log(`  ~ discipline réactivée: ${name}`);
      result.push(updated);
    } else {
      result.push(existing[0]);
    }
  }
  return result;
}

async function ensureUser(
  username: string,
  password: string,
  role: string,
  opts?: { schoolId?: number; disciplineId?: number; resetPassword?: boolean },
) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing.length) {
    const patch: Partial<{ passwordHash: string; active: boolean; schoolId: number | null; disciplineId: number | null }> = {};
    if (opts?.resetPassword) {
      patch.passwordHash = await bcrypt.hash(password, 10);
      patch.active = true;
    }
    if (opts?.schoolId !== undefined) patch.schoolId = opts.schoolId ?? null;
    if (opts?.disciplineId !== undefined) patch.disciplineId = opts.disciplineId ?? null;
    if (Object.keys(patch).length > 0) {
      await db.update(usersTable).set(patch).where(eq(usersTable.id, existing[0].id));
      console.log(`  ~ compte mis à jour: ${username}`);
    } else {
      console.log(`  = compte existant: ${username}`);
    }
    return existing[0];
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    username,
    passwordHash,
    role,
    schoolId: opts?.schoolId ?? null,
    disciplineId: opts?.disciplineId ?? null,
  }).returning();

  console.log(`  + compte créé: ${username} (${role})`);
  return user;
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL manquant — configurez le fichier .env");
    process.exit(1);
  }

  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin1234";

  console.log("Données de référence…");
  const schools = await ensureSchools();
  const disciplines = await ensureDisciplines();

  console.log("\nCompte administrateur…");
  await ensureUser(adminUsername, adminPassword, "admin", { resetPassword: true });
  console.log(`  → pseudo: ${adminUsername}`);

  if (DEMO) {
    console.log("\nComptes de démonstration (--demo)…");
    const maths = disciplines.find((d) => d.name === "Mathématiques");
    const francais = disciplines.find((d) => d.name === "Français");

    for (const school of schools) {
      const slug = school.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      await ensureUser(`f2.${slug}`, "admin1234", "f2", {
        schoolId: school.id,
        disciplineId: (school.name === "Renard" ? francais : maths)?.id,
      });
    }
    await ensureUser("f3.alice", "admin1234", "f3");
    await ensureUser("f3.bob", "admin1234", "f3");
    const boisCaran = schools.find((s) => s.name === "Bois-Caran");
    await ensureUser("rd.paris", "admin1234", "rd", { schoolId: boisCaran?.id, disciplineId: maths?.id });
    await ensureUser("pg", "admin1234", "pg", { disciplineId: maths?.id });
    await ensureUser("direction.bois-caran", "admin1234", "direction", { schoolId: boisCaran?.id });
  }

  console.log(`\nTerminé. ${schools.length} établissements, ${disciplines.length} disciplines.`);
  if (!DEMO) {
    console.log("Astuce : ajoutez --demo pour créer les comptes de test.");
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
