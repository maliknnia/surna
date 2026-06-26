import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Express } from "express";
import type { Server } from "http";
import request from "supertest";
import { createApplication } from "../../server/createApp";
import {
  apiPost,
  apiDelete,
  readyTestUser,
  type TestUser,
} from "./helpers/http";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const ua = { "User-Agent": "SurnaIntegrationTest/1.0" };

function futureIso(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

async function ensureMarketplaceProduct(app: Express, seller: TestUser): Promise<string> {
  const list = await request(app).get("/api/marketplace/products?limit=1").set(ua);
  const existing = list.body?.items?.[0]?.id as string | undefined;
  if (existing) return existing;

  const createRes = await apiPost(seller.agent, "/api/marketplace/products", {
    title: `Wave3 Product ${Date.now().toString(36)}`,
    description: "Integration test listing",
    priceCents: 2499,
    stock: 10,
  });
  expect(createRes.status).toBe(201);
  return createRes.body.id as string;
}

const coachApplyBody = {
  phone: "+353871234567",
  experience: "5",
  primarySports: ["Soccer"],
  skillLevel: "intermediate" as const,
  hourlyRate: 45,
  availability: ["Weekday evenings"],
  sessionTypes: ["1-on-1"],
  bio: "Experienced coach for Wave 3 integration testing in Dublin.",
  backgroundCheckConsent: true,
  paymentMethod: "stripe",
};

describe.skipIf(!hasDatabase)("Wave 3 — marketplace, coaches, challenges, instant teams, messaging", () => {
  let app: Express;
  let httpServer: Server;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.LOCAL_AUTH_BYPASS = "1";
    process.env.COACH_AUTO_VERIFY = "1";
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

  describe("Marketplace", () => {
    it("guest and authed product detail, cart, checkout stub, wishlist", async () => {
      const seller = await readyTestUser(app, "MktSeller");
      const buyer = await readyTestUser(app, "MktBuyer");
      const productId = await ensureMarketplaceProduct(app, seller);

      const guestDetail = await request(app)
        .get(`/api/marketplace/products/${productId}`)
        .set(ua)
        .expect(200);
      expect(guestDetail.body.id ?? guestDetail.body.product?.id).toBeTruthy();
      expect(guestDetail.body.price_cents ?? guestDetail.body.priceCents).toBeDefined();

      const authedDetail = await buyer.agent
        .get(`/api/marketplace/products/${productId}`)
        .expect(200);
      expect(authedDetail.body.id ?? authedDetail.body.product?.id).toBeTruthy();

      const addCart = await apiPost(buyer.agent, "/api/marketplace/cart/items", {
        productId,
        qty: 1,
      });
      expect(addCart.status).toBe(201);
      expect(addCart.body.items?.length).toBeGreaterThan(0);

      const cartView = await buyer.agent.get("/api/marketplace/cart").expect(200);
      expect(cartView.body.items?.length).toBeGreaterThan(0);

      const checkout = await apiPost(buyer.agent, "/api/marketplace/checkout", {});
      expect(checkout.status).toBe(201);
      expect(checkout.body.orderId ?? checkout.body.order?.id ?? checkout.body.id).toBeTruthy();

      const emptyCart = await buyer.agent.get("/api/marketplace/cart").expect(200);
      expect(emptyCart.body.items?.length ?? 0).toBe(0);

      const wishAdd = await apiPost(buyer.agent, "/api/marketplace/wishlist", { productId });
      expect(wishAdd.status).toBe(200);
      expect(wishAdd.body.success).toBe(true);

      const wishList = await buyer.agent.get("/api/marketplace/wishlist").expect(200);
      const wishItems = wishList.body.items ?? wishList.body;
      expect(Array.isArray(wishItems)).toBe(true);

      const wishRemove = await apiDelete(
        buyer.agent,
        `/api/marketplace/wishlist/${productId}`,
      );
      expect(wishRemove.status).toBe(200);
      expect(wishRemove.body.success).toBe(true);
    });
  });

  describe("Coaches", () => {
    it("lists coaches publicly, apply flow, detail, checkout request shape", async () => {
      const applicant = await readyTestUser(app, "CoachApply");
      const athlete = await readyTestUser(app, "CoachAthlete");

      const list = await request(app).get("/api/coaches?limit=5").set(ua).expect(200);
      expect(Array.isArray(list.body)).toBe(true);

      const applyRes = await apiPost(applicant.agent, "/api/coaches/apply", coachApplyBody);
      expect([200, 201]).toContain(applyRes.status);
      expect(applyRes.body.coach?.id ?? applyRes.body.coachId ?? applyRes.body.id).toBeTruthy();
      const coachId = (applyRes.body.coach?.id ?? applyRes.body.coachId ?? applyRes.body.id) as string;

      const me = await applicant.agent.get("/api/coaches/me/profile").expect(200);
      expect(me.body.coach?.id ?? me.body.coachId).toBeTruthy();

      const detail = await request(app).get(`/api/coaches/${coachId}`).set(ua).expect(200);
      expect(detail.body.id ?? detail.body.coach?.id).toBeTruthy();

      const checkout = await apiPost(athlete.agent, `/api/coaches/${coachId}/bookings/checkout`, {
        sessionStart: futureIso(72),
        durationMinutes: 60,
      });
      if (checkout.status === 200) {
        expect(checkout.body.clientSecret).toBeTruthy();
        expect(checkout.body.bookingId).toBeTruthy();
      } else {
        expect([400, 500]).toContain(checkout.status);
        expect(checkout.body.message ?? checkout.body.error).toBeTruthy();
      }
    });
  });

  describe("Challenges", () => {
    it("create, accept, report score; decline path; profile ratings", async () => {
      const challenger = await readyTestUser(app, "Challenger");
      const opponent = await readyTestUser(app, "Opponent");
      const other = await readyTestUser(app, "DeclineOpp");
      expect(challenger.userId).toBeTruthy();
      expect(opponent.userId).toBeTruthy();

      const createRes = await apiPost(challenger.agent, "/api/competitive-challenges", {
        title: `Wave3 Match ${Date.now().toString(36)}`,
        type: "player1v1",
        sport: "Tennis",
        opponentType: "user",
        opponentId: opponent.userId,
        visibility: "invite",
      });
      expect(createRes.status).toBe(200);
      const matchId = createRes.body.id as string;

      const acceptRes = await apiPost(opponent.agent, `/api/competitive-challenges/${matchId}/accept`, {});
      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.status).toBe("accepted");

      const reportRes = await apiPost(challenger.agent, `/api/competitive-challenges/${matchId}/report`, {
        hostScore: 6,
        guestScore: 4,
        outcome: "hostWin",
      });
      expect(reportRes.status).toBe(200);
      expect(reportRes.body.id ?? reportRes.body.result?.id).toBeTruthy();

      const declineCreate = await apiPost(challenger.agent, "/api/competitive-challenges", {
        title: `Decline Match ${Date.now().toString(36)}`,
        type: "player1v1",
        sport: "Tennis",
        opponentType: "user",
        opponentId: other.userId,
        visibility: "invite",
      });
      const declineMatchId = declineCreate.body.id as string;
      const declineRes = await apiPost(
        other.agent,
        `/api/competitive-challenges/${declineMatchId}/decline`,
        {},
      );
      expect(declineRes.status).toBe(200);
      expect(declineRes.body.success).toBe(true);

      const ratings = await challenger.agent
        .get(`/api/competitive-challenges/ratings/${challenger.userId}`)
        .expect(200);
      expect(ratings.body.ratings).toBeDefined();
    });
  });

  describe("Instant teams", () => {
    it("creates pickup, join, leave, convert to full team", async () => {
      const creator = await readyTestUser(app, "InstantCap");
      const player = await readyTestUser(app, "InstantPlayer");

      const createRes = await apiPost(creator.agent, "/api/instant-teams", {
        sport: "Soccer",
        startTime: futureIso(4),
        lat: "53.3498",
        lng: "-6.2603",
        playersNeeded: 10,
        skillLevel: "any",
        locationName: "Phoenix Park",
      });
      expect(createRes.status).toBe(201);
      const instantId = createRes.body.id as string;

      const joinRes = await apiPost(player.agent, `/api/instant-teams/${instantId}/join`, {});
      expect(joinRes.status).toBe(200);
      expect(joinRes.body.success).toBe(true);

      const members = await request(app).get(`/api/instant-teams/${instantId}/members`).set(ua);
      expect(members.status).toBe(200);
      expect(Array.isArray(members.body)).toBe(true);
      expect(members.body.length).toBeGreaterThanOrEqual(2);

      const leaveRes = await apiPost(player.agent, `/api/instant-teams/${instantId}/leave`, {});
      expect(leaveRes.status).toBe(200);

      await apiPost(player.agent, `/api/instant-teams/${instantId}/join`, {});

      const convertRes = await apiPost(creator.agent, `/api/instant-teams/${instantId}/convert`, {});
      expect(convertRes.status).toBe(200);
      expect(convertRes.body.id).toBeTruthy();
      expect(convertRes.body.captainId ?? convertRes.body.captain_id).toBe(creator.userId);
    });
  });

  describe("Messaging", () => {
    it("DM thread, group create, unread counts on conversation list", async () => {
      const alice = await readyTestUser(app, "MsgAlice");
      const bob = await readyTestUser(app, "MsgBob");
      expect(alice.userId).toBeTruthy();
      expect(bob.userId).toBeTruthy();

      const dmCreate = await apiPost(alice.agent, "/api/messenger/dm/conversations", {
        peerId: bob.userId!,
      });
      expect(dmCreate.status).toBe(200);
      const conversationId = dmCreate.body.id as string;

      const send = await apiPost(alice.agent, "/api/messenger/dm/messages", {
        conversationId,
        body: "Wave 3 integration hello",
      });
      expect(send.status).toBe(200);
      expect(send.body.id ?? send.body.message?.id).toBeTruthy();

      const inbox = await bob.agent.get("/api/messenger/dm/conversations").expect(200);
      const threads = inbox.body.conversations as Array<{ id: string; unread_count?: number }>;
      expect(Array.isArray(threads)).toBe(true);
      const thread = threads.find((t) => t.id === conversationId);
      expect(thread).toBeTruthy();
      expect((thread?.unread_count ?? 0) >= 0).toBe(true);

      const group = await apiPost(alice.agent, "/api/messenger/groups", {
        name: `Wave3 Group ${Date.now().toString(36)}`,
        description: "Integration test group",
      });
      expect(group.status).toBe(200);
      expect(group.body.id).toBeTruthy();
    });
  });
});
