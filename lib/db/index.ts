import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import { getEnv } from "@/lib/env";
import { DB } from "@/lib/db/types";

declare global {
  // eslint-disable-next-line no-var
  var __DB__: Kysely<DB> | undefined;
}

export function getDb() {
  if (!global.__DB__) {
    const env = getEnv();
    const pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
    });

    global.__DB__ = new Kysely<DB>({
      dialect: new PostgresDialect({ pool }),
    });
  }

  return global.__DB__;
}
