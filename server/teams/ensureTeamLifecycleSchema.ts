import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "../db";
import { TEAM_LIFECYCLE_MIGRATION_FILES } from "./teamLifecycleMigrationFiles";

let promise: Promise<void> | null = null;

/** Team join template, applications, invites, and game results — prod + dev compat. */
export function ensureTeamLifecycleSchema(): Promise<void> {
  if (promise) return promise;
  promise = (async () => {
    for (const file of TEAM_LIFECYCLE_MIGRATION_FILES) {
      const sql = readFileSync(join(process.cwd(), "migrations", file), "utf8");
      await pool.query(sql);
    }
    console.log("[teams] lifecycle schema ensured (join policy, invites, games)");
  })().catch((err) => {
    promise = null;
    throw err;
  });
  return promise;
}
