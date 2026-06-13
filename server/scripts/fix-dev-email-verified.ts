import "dotenv/config";
import { db } from "../db";
import { sql } from "drizzle-orm";

await db.execute(sql`
  UPDATE users SET email_verified = true
  WHERE id = 'local-dev-user' OR email = 'dev@surna.local'
`);
console.log("✅ Local dev user marked email_verified");
