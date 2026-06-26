import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Express } from "express";
import type { Server } from "http";
import { createApplication } from "../../server/createApp";
import { apiPost, readyTestUser, uniqueTeamName } from "./helpers/http";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

/** Pro paywall with open-access disabled — uses checkout stub when Stripe is unset. */
describe.skipIf(!hasDatabase)("Wave 4 — Pro paid path", () => {
  let app: Express;
  let httpServer: Server;
  const saved = {
    stripe: process.env.STRIPE_SECRET_KEY,
    open: process.env.PRO_ENTITLEMENT_OPEN,
    bypass: process.env.LOCAL_AUTH_BYPASS,
    strict: process.env.PRO_ENTITLEMENT_STRICT,
  };

  beforeAll(async () => {
    // Unset Stripe so activateProFromCheckoutSession uses its no-Stripe stub (payment routes skip load).
    delete process.env.STRIPE_SECRET_KEY;
    process.env.PRO_ENTITLEMENT_OPEN = "0";
    process.env.LOCAL_AUTH_BYPASS = "0";
    process.env.PRO_ENTITLEMENT_STRICT = "1";
    process.env.NODE_ENV = "test";

    const bundle = await createApplication({ serveClient: false, quiet: true });
    app = bundle.app;
    httpServer = bundle.httpServer;
  }, 120_000);

  afterAll(async () => {
    if (saved.stripe !== undefined) process.env.STRIPE_SECRET_KEY = saved.stripe;
    else delete process.env.STRIPE_SECRET_KEY;
    if (saved.open !== undefined) process.env.PRO_ENTITLEMENT_OPEN = saved.open;
    else delete process.env.PRO_ENTITLEMENT_OPEN;
    if (saved.bypass !== undefined) process.env.LOCAL_AUTH_BYPASS = saved.bypass;
    else delete process.env.LOCAL_AUTH_BYPASS;
    if (saved.strict !== undefined) process.env.PRO_ENTITLEMENT_STRICT = saved.strict;
    else delete process.env.PRO_ENTITLEMENT_STRICT;

    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    try {
      const { pool } = await import("../../server/db");
      await pool.end();
    } catch {
      /* pool may already be closed */
    }
  });

  it("returns free tier and blocks Pro team routes without subscription", async () => {
    const user = await readyTestUser(app, "ProFree");

    const ent = await user.agent.get("/api/pro/user/entitlement");
    expect(ent.status).toBe(200);
    expect(ent.body.active).toBe(false);
    expect(ent.body.plan).toBe("free");
    expect(ent.body.openAccess).toBeFalsy();

    const teamRes = await apiPost(user.agent, "/api/teams", {
      name: uniqueTeamName("Pro Paid Free"),
      sport: "Soccer",
    });
    expect(teamRes.status).toBe(200);
    const teamId = teamRes.body.id as string;

    const sessions = await user.agent.get(`/api/pro/team/${teamId}/training/sessions`);
    expect(sessions.status).toBe(403);
    expect(sessions.body.code).toBe("PRO_REQUIRED");
  });

  it("activates Pro via checkout stub and unlocks Pro team routes", async () => {
    const user = await readyTestUser(app, "ProPaid");

    const activate = await apiPost(user.agent, "/api/pro/user/entitlement/activate", {
      sessionId: "cs_test_integration_stub",
    });
    expect(activate.status).toBe(200);
    expect(activate.body.active).toBe(true);
    expect(activate.body.plan).toBe("pro");
    expect(activate.body.openAccess).toBe(false);

    const ent = await user.agent.get("/api/pro/user/entitlement");
    expect(ent.status).toBe(200);
    expect(ent.body.active).toBe(true);
    expect(ent.body.plan).toBe("pro");

    const teamRes = await apiPost(user.agent, "/api/teams", {
      name: uniqueTeamName("Pro Paid Active"),
      sport: "Soccer",
    });
    expect(teamRes.status).toBe(200);
    const teamId = teamRes.body.id as string;

    const sessions = await user.agent.get(`/api/pro/team/${teamId}/training/sessions`);
    expect(sessions.status).toBe(200);
    expect(Array.isArray(sessions.body)).toBe(true);
  });
});
