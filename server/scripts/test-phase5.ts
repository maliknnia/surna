import "dotenv/config";
import { ensurePhase5MoneyTables } from "../infrastructure/phase5Money";
import {
  createTeamBill,
  listTeamBills,
  getUserPaymentHistory,
  applyCoachCommission,
  applyTournamentCommission,
} from "../services/phase5MoneyService";
import { db } from "../db";
import { teams, users } from "@shared/schema";

async function main() {
  console.log("=== Phase 5 money tests ===\n");
  await ensurePhase5MoneyTables();

  const [user] = await db.select().from(users).limit(1);
  const [team] = await db.select().from(teams).limit(1);
  if (!user || !team) {
    console.error("Need seeded user + team");
    process.exit(1);
  }

  const { bill, shareAmount } = await createTeamBill({
    teamId: team.id,
    createdBy: user.id,
    title: "Pitch rental",
    totalAmount: 100,
    splitCount: 4,
    memberIds: [user.id],
  });
  console.log("✅ [Phase5-1] Bill:", bill.id, "share:", shareAmount);

  const bills = await listTeamBills(team.id);
  console.assert(bills.length > 0, "bills listed");
  console.log("✅ [Phase5-1] List bills:", bills.length);

  const coachComm = applyCoachCommission(100);
  console.assert(coachComm.platformFee === 15, "15% coach commission");
  console.log("✅ [Phase5-4] Coach commission:", coachComm);

  const tourComm = applyTournamentCommission(10000);
  console.assert(tourComm.platformFeeCents === 500, "5% tournament commission");
  console.log("✅ [Phase5-5] Tournament commission:", tourComm);

  const history = await getUserPaymentHistory(user.id);
  console.log("✅ [Phase5-2] Payment history items:", history.length);

  console.log("\n=== Phase 5 smoke tests passed ===");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
