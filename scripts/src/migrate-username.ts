import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: path.resolve(root, ".env") });

const { pool } = await import("@workspace/db");

async function migrate() {
  const check = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name IN ('email', 'username')
  `);
  const columns = new Set(check.rows.map((r: { column_name: string }) => r.column_name));

  if (columns.has("username")) {
    console.log("La colonne username existe déjà — rien à faire.");
    return;
  }

  if (!columns.has("email")) {
    console.error("Ni email ni username trouvés dans users — vérifiez le schéma.");
    process.exit(1);
  }

  await pool.query(`ALTER TABLE users RENAME COLUMN email TO username`);
  console.log("Colonne users.email renommée en users.username.");
}

migrate()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
