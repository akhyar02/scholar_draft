import process from "node:process";

import bcrypt from "bcryptjs";
import { Client } from "pg";

async function main() {
  const [emailArg, passwordArg] = process.argv.slice(2);

  if (!emailArg || !passwordArg) {
    throw new Error("Usage: node scripts/seed-admin.mjs <email> <password>");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const email = emailArg.toLowerCase();
  const passwordHash = await bcrypt.hash(passwordArg, 12);

  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);

  if (existing.rowCount) {
    await client.query(
      "UPDATE users SET role = 'admin', password_hash = $1, updated_at = NOW() WHERE email = $2",
      [passwordHash, email],
    );
    console.log(`Updated existing user as admin: ${email}`);
  } else {
    const id = crypto.randomUUID();
    await client.query(
      "INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
      [id, email, passwordHash],
    );
    console.log(`Created admin user: ${email}`);
  }

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
