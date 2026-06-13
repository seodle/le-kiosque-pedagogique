import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: path.resolve(root, ".env") });

async function migrate() {
  const { db } = await import("@workspace/db");

  console.log("Migration des rôles n1→f2, n2/f3→f1…");
  await db.execute(sql`UPDATE users SET role = 'f2' WHERE role = 'n1'`);
  await db.execute(sql`UPDATE users SET role = 'f1' WHERE role IN ('n2', 'f3')`);
  await db.execute(sql`UPDATE users SET username = REPLACE(username, 'f3.', 'f1.') WHERE username LIKE 'f3.%'`);
  await db.execute(sql`UPDATE ticket_events SET actor_role = 'f2' WHERE actor_role = 'n1'`);
  await db.execute(sql`UPDATE ticket_events SET actor_role = 'f1' WHERE actor_role IN ('n2', 'f3')`);
  await db.execute(sql`UPDATE messages SET sender_type = 'f1' WHERE sender_type IN ('n2', 'f3')`);
  console.log("Terminé.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
