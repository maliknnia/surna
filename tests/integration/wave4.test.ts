import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Express } from "express";
import type { Server } from "http";
import request from "supertest";
import { createApplication } from "../../server/createApp";
import {
  apiPost,
  readyTestUser,
  grantAdminRole,
  uniqueTeamName,
} from "./helpers/http";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const ua = { "User-Agent": "SurnaIntegrationTest/1.0" };

describe.skipIf(!hasDatabase)("Wave 4 — security, admin, GDPR, Pro smoke", () => {
  let app: Express;
  let httpServer: Server;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.LOCAL_AUTH_BYPASS = "1";
    const bundle = await createApplication({ serveClient: false, quiet: true });
    app = bundle.app;
    httpServer = bundle.httpServer;
  }, 120_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    try {
      const { pool } = await import("../../server/db");
      await pool.end();
    } catch {
      /* pool may already be closed */
    }
  });

  describe("Security", () => {
    it("blocks mutating requests without CSRF; allows with token; public lists stay open", async () => {
      const user = await readyTestUser(app, "CsrfUser");

      const noCsrf = await user.agent
        .post("/api/posts")
        .send({ content: "CSRF should block this", type: "text" });
      expect(noCsrf.status).toBe(403);

      const withCsrf = await apiPost(user.agent, "/api/posts", {
        content: `Wave4 CSRF ok ${Date.now().toString(36)}`,
        sport: "Soccer",
      });
      expect(withCsrf.status).toBe(200);
      expect(withCsrf.body.id).toBeTruthy();

      await request(app).get("/api/teams?limit=3").set(ua).expect(200);
      await request(app).get("/api/coaches?limit=3").set(ua).expect(200);

      await request(app).get("/api/admin/dashboard/stats").set(ua).expect(401);
    });
  });

  describe("Admin", () => {
    it("denies non-admins and allows super_admin dashboard access", async () => {
      const member = await readyTestUser(app, "NotAdmin");
      expect(member.userId).toBeTruthy();

      const denied = await member.agent.get("/api/admin/dashboard/stats");
      expect(denied.status).toBe(403);

      const admin = await readyTestUser(app, "AdminUser");
      await grantAdminRole(admin.userId!);

      const stats = await admin.agent.get("/api/admin/dashboard/stats");
      expect(stats.status).toBe(200);
      expect(stats.body.stats).toBeTruthy();
      expect(stats.body.queues).toBeTruthy();

      const health = await admin.agent.get("/api/admin/health-metrics");
      expect(health.status).toBe(200);
    });
  });

  describe("GDPR / privacy", () => {
    it("exports user data and accepts deletion request for signed-in user", async () => {
      const user = await readyTestUser(app, "GdprUser");

      const settings = await user.agent.get("/api/security/privacy/settings");
      expect(settings.status).toBe(200);
      expect(settings.body.profileVisibility).toBeTruthy();

      const exportRes = await user.agent.get("/api/security/privacy/data-export");
      expect(exportRes.status).toBe(200);
      expect(exportRes.body.data?.personalData?.email).toBe(user.email.toLowerCase());

      const deleteRes = await apiPost(user.agent, "/api/security/privacy/data-deletion", {
        confirmDelete: true,
        reason: "Wave 4 integration test",
      });
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.requestId).toBeTruthy();
      expect(String(deleteRes.body.requestId)).toMatch(/gdpr_deletion/i);

      await request(app).get("/api/security/privacy/data-export").set(ua).expect(401);
    });

    it("purges due GDPR deletion requests after grace period", async () => {
      const user = await readyTestUser(app, "PurgeUser");
      const deleteRes = await apiPost(user.agent, "/api/security/privacy/data-deletion", {
        confirmDelete: true,
        reason: "Wave 4 purge test",
      });
      expect(deleteRes.status).toBe(200);
      const requestId = deleteRes.body.requestId as string;
      expect(requestId).toBeTruthy();

      const { pool } = await import("../../server/db");
      await pool.query(
        `UPDATE compliance_requests SET expires_at = NOW() - interval '1 day' WHERE id = $1`,
        [requestId],
      );

      const pending = await pool.query(
        `SELECT status, request_type, verification_required, expires_at <= NOW() AS due
         FROM compliance_requests WHERE id = $1`,
        [requestId],
      );
      expect(pending.rows[0]?.status).toBe("pending");
      expect(pending.rows[0]?.request_type).toBe("gdpr_data_deletion");
      expect(pending.rows[0]?.due).toBe(true);

      const { complianceService } = await import("../../server/security/complianceReporting");
      const processResult = await complianceService.processDueDeletionRequests();
      expect(processResult.processed).toBeGreaterThanOrEqual(1);

      const row = await pool.query(
        `SELECT status FROM compliance_requests WHERE id = $1`,
        [requestId],
      );
      expect(row.rows[0]?.status).toBe("completed");
    });
  });

  describe("SURNA Pro smoke", () => {
    it("returns open-access entitlement and serves a Pro team route", async () => {
      const captain = await readyTestUser(app, "ProCaptain");

      const ent = await captain.agent.get("/api/pro/user/entitlement");
      expect(ent.status).toBe(200);
      expect(ent.body.active).toBe(true);
      expect(ent.body.openAccess).toBe(true);

      const teamRes = await apiPost(captain.agent, "/api/teams", {
        name: uniqueTeamName("Pro Smoke"),
        sport: "Soccer",
      });
      expect(teamRes.status).toBe(200);
      const teamId = teamRes.body.id as string;

      const sessions = await captain.agent.get(`/api/pro/team/${teamId}/training/sessions`);
      expect(sessions.status).toBe(200);
      expect(Array.isArray(sessions.body)).toBe(true);
    });
  });

  describe("Pro workflow smoke", () => {
    it("lists approvals and activity feed without auth", async () => {
      const approvals = await request(app).get("/api/pro-workflow/approvals").set(ua);
      expect(approvals.status).toBe(200);
      expect(Array.isArray(approvals.body)).toBe(true);

      const activity = await request(app).get("/api/pro-workflow/activity").set(ua);
      expect(activity.status).toBe(200);
      expect(Array.isArray(activity.body)).toBe(true);
    });
  });
});
