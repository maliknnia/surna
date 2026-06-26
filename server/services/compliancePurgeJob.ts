import cron from "node-cron";
import { complianceService } from "../security/complianceReporting";

/** Daily job: process GDPR deletion requests whose grace period has elapsed. */
export async function runCompliancePurgeOnce(): Promise<{ processed: number; errors: number }> {
  return complianceService.processDueDeletionRequests();
}

export function startCompliancePurgeJob(): void {
  if (process.env.DISABLE_COMPLIANCE_PURGE_JOB === "1") {
    console.log("[compliance] purge job disabled (DISABLE_COMPLIANCE_PURGE_JOB=1)");
    return;
  }

  const schedule = process.env.COMPLIANCE_PURGE_CRON?.trim() || "0 3 * * *";

  cron.schedule(schedule, async () => {
    try {
      const result = await runCompliancePurgeOnce();
      if (result.processed > 0 || result.errors > 0) {
        console.log("[compliance] GDPR deletion purge run:", result);
      }
    } catch (err) {
      console.error("[compliance] GDPR deletion purge job failed:", err);
    }
  });

  console.log(`[compliance] GDPR deletion purge scheduler active (${schedule})`);
}
