/**
 * Remove all @surna.app demo accounts and content (keeps your real login).
 *   npm run db:seed:investor:clean
 */
import "dotenv/config";
import { cleanupSeedUsers } from "./seedCleanup";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  await cleanupSeedUsers();
  console.log("Done — demo accounts removed.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
