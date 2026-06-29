/**
 * Full demo populate for live demos — now uses the investor-quality seed.
 *   $env:DATABASE_URL="postgresql://..."; npm run db:seed:demo
 */
import "dotenv/config";
import { runInvestorSeed } from "./seed-investor-demo";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required. Paste your Postgres URL and run again.");
    process.exit(1);
  }
  await runInvestorSeed();
  console.log("\nRunning marketplace seed...");
  const { spawnSync } = await import("node:child_process");
  spawnSync("npx", ["tsx", "scripts/seed-marketplace.ts"], { stdio: "inherit", shell: true });
  console.log("\n✅ Demo ready! Open Feed, Stories, Teams, Map, Challenges, Marketplace.");
  console.log("   Set INVESTOR_VIEWER_EMAIL to your account email so your login sees every story.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Demo seed failed:", err);
    process.exit(1);
  });
