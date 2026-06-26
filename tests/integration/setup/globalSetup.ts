import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import pg from "pg";
import { TEAM_LIFECYCLE_MIGRATION_FILES } from "../../../server/teams/teamLifecycleMigrationFiles";

export default async function globalSetup() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const file of TEAM_LIFECYCLE_MIGRATION_FILES) {
      const sql = readFileSync(join(process.cwd(), "migrations", file), "utf8");
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}
