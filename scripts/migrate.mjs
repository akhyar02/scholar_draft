import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { Client } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const migrationsDir = path.join(process.cwd(), "db", "migrations");
  const entries = await fs.readdir(migrationsDir);
  const files = entries.filter((entry) => entry.endsWith(".sql")).sort();

  for (const file of files) {
    const alreadyApplied = await client.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);

    if (alreadyApplied.rowCount) {
      console.log(`Skipping ${file}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");

    console.log(`Applying ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  await client.end();
  console.log("Migrations complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
