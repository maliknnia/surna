import { sql } from "drizzle-orm";
import { db } from "../db";

let promise: Promise<void> | null = null;

/** GDPR/CCPA compliance request queue — used by complianceReporting + privacy deletion. */
export function ensureComplianceRequestsSchema(): Promise<void> {
  if (promise) return promise;
  promise = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS compliance_requests (
        id VARCHAR PRIMARY KEY,
        request_type VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        user_id VARCHAR NOT NULL,
        user_email VARCHAR NOT NULL,
        requested_by VARCHAR NOT NULL,
        request_data JSONB,
        response_data JSONB,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        processed_at TIMESTAMP WITH TIME ZONE,
        processed_by VARCHAR,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        additional_notes TEXT,
        verification_required BOOLEAN DEFAULT false,
        verification_code VARCHAR,
        ip_address VARCHAR NOT NULL DEFAULT '',
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_compliance_requests_user
      ON compliance_requests (user_id, submitted_at DESC);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_compliance_requests_status
      ON compliance_requests (status, request_type);
    `);
    await db.execute(sql`ALTER TABLE compliance_requests ADD COLUMN IF NOT EXISTS request_data JSONB;`);
    await db.execute(sql`ALTER TABLE compliance_requests ADD COLUMN IF NOT EXISTS additional_notes TEXT;`);
    console.log("[compliance] compliance_requests schema ensured");
  })().catch((err) => {
    promise = null;
    throw err;
  });
  return promise;
}
