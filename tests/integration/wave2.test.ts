import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Express } from "express";
import type { Server } from "http";
import request from "supertest";
import { createApplication } from "../../server/createApp";
import {
  apiPost,
  apiPut,
  apiPatch,
  readyTestUser,
  uniqueTeamName,
} from "./helpers/http";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

function futureIso(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

describe.skipIf(!hasDatabase)("Wave 2 — feed, events, profile, discovery, notifications", () => {
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

  describe("Feed & posts", () => {
    it("creates text post, paginates feed, likes and comments", async () => {
      const author = await readyTestUser(app, "PostAuthor");
      const reader = await readyTestUser(app, "PostReader");
      expect(author.userId).toBeTruthy();

      const createRes = await apiPost(author.agent, "/api/posts", {
        content: `Wave2 integration post ${Date.now()}`,
        sport: "Soccer",
      });
      expect(createRes.status).toBe(200);
      const postId = createRes.body.id as string;
      expect(postId).toBeTruthy();

      const feedRes = await author.agent.get("/api/posts/feed-keyset?limit=10").expect(200);
      expect(Array.isArray(feedRes.body.items)).toBe(true);
      const ids = (feedRes.body.items as { id?: string }[]).map((p) => p.id);
      expect(ids).toContain(postId);

      const likeRes = await apiPost(reader.agent, `/api/posts/${postId}/like`, {});
      expect(likeRes.status).toBe(200);
      expect(likeRes.body.liked).toBe(true);

      const unlikeRes = await apiPost(reader.agent, `/api/posts/${postId}/unlike`, {});
      expect(unlikeRes.status).toBe(200);

      const commentRes = await apiPost(reader.agent, `/api/posts/${postId}/comment`, {
        content: "Nice post from Wave 2 tests",
      });
      expect(commentRes.status).toBe(200);
      expect(commentRes.body.content ?? commentRes.body.comment?.content).toBeTruthy();
    });

    it("guest cannot create posts", async () => {
      const res = await request(app)
        .post("/api/posts")
        .set("User-Agent", "SurnaIntegrationTest/1.0")
        .send({ content: "Should fail" });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(600);
    });
  });

  describe("Events", () => {
    it("creates event, RSVPs, saves route coordinates", async () => {
      const organizer = await readyTestUser(app, "EventOrg");
      const guest = await readyTestUser(app, "EventGuest");

      const createRes = await apiPost(organizer.agent, "/api/events", {
        title: `Wave2 Run ${Date.now().toString(36)}`,
        description: "Integration test event",
        startsAt: futureIso(48),
        endsAt: futureIso(50),
        location: "Dublin",
        lat: 53.3498,
        lng: -6.2603,
        visibility: "public",
        sport: "Running",
        eventFormat: "route",
        eventLineup: { route: { distanceKm: 5 } },
      });
      expect(createRes.status).toBe(201);
      const eventId = createRes.body.id as string;
      expect(eventId).toBeTruthy();

      const detailRes = await request(app)
        .get(`/api/events/${eventId}`)
        .set("User-Agent", "SurnaIntegrationTest/1.0")
        .expect(200);
      expect(detailRes.body.title).toContain("Wave2 Run");
      expect(detailRes.body.sport).toBe("Running");
      expect(detailRes.body.event_format ?? detailRes.body.eventFormat).toBe("route");

      const rsvpRes = await apiPost(guest.agent, `/api/events/${eventId}/rsvp`, {
        status: "going",
        issueTicket: false,
      });
      expect(rsvpRes.status).toBe(201);

      const routeRes = await apiPost(organizer.agent, `/api/events/${eventId}/route`, {
        routeCoordinates: [
          [53.3498, -6.2603],
          [53.3505, -6.258],
          [53.351, -6.255],
        ],
      });
      expect(routeRes.status).toBe(200);
      expect(routeRes.body.routeCoordinates ?? routeRes.body.route_coordinates).toBeTruthy();

      const routeGet = await request(app)
        .get(`/api/events/${eventId}/route`)
        .set("User-Agent", "SurnaIntegrationTest/1.0")
        .expect(200);
      expect(routeGet.body.routeCoordinates ?? routeGet.body.route_coordinates).toBeTruthy();

      const mineRes = await guest.agent.get("/api/events/me/rsvps").expect(200);
      const items = mineRes.body.items ?? mineRes.body;
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe("Profile (extended)", () => {
    it("loads public profile, teams tab, and team-games summary", async () => {
      const captain = await readyTestUser(app, "ProfCap");
      const player = await readyTestUser(app, "ProfPlayer");
      expect(captain.userId).toBeTruthy();
      expect(player.userId).toBeTruthy();

      const createRes = await apiPost(captain.agent, "/api/teams", {
        name: uniqueTeamName("Profile FC"),
        sport: "Soccer",
        city: "Dublin",
      });
      const teamId = createRes.body.id as string;

      await apiPut(captain.agent, `/api/teams/${teamId}/join-template`, {
        joinPolicy: "open",
        requirements: { questions: [], documents: [] },
      });
      await apiPost(player.agent, `/api/teams/${teamId}/apply`, {});

      await apiPost(captain.agent, `/api/teams/${teamId}/games`, {
        opponentName: "Profile Rivals",
        result: "win",
        ourScore: 2,
        theirScore: 0,
        playerIds: [player.userId!],
      });

      const me = await player.agent.get("/api/auth/user").expect(200);
      const username = me.body.username as string;
      expect(username).toBeTruthy();

      const publicRes = await request(app)
        .get(`/api/profile/${username}`)
        .set("User-Agent", "SurnaIntegrationTest/1.0")
        .expect(200);
      expect(publicRes.body.username ?? publicRes.body.user?.username).toBeTruthy();

      const teamsTab = await player.agent.get(`/api/profile/${player.userId}/teams`).expect(200);
      expect(teamsTab.body.teams?.length ?? teamsTab.body.length).toBeGreaterThan(0);

      const gamesTab = await player.agent.get(`/api/profile/${player.userId}/team-games`).expect(200);
      expect(gamesTab.body.games?.length).toBeGreaterThan(0);
      expect(gamesTab.body.summary?.total).toBeGreaterThan(0);
    });
  });

  describe("Discovery & places", () => {
    it("lists public teams without authentication", async () => {
      const res = await request(app)
        .get("/api/teams?limit=5")
        .set("User-Agent", "SurnaIntegrationTest/1.0")
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("lists places publicly", async () => {
      const res = await request(app)
        .get("/api/places?limit=5")
        .set("User-Agent", "SurnaIntegrationTest/1.0")
        .expect(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.items)).toBe(true);
    });
  });

  describe("Notifications", () => {
    it("team invite creates notification with title, route, mark read, unread count", async () => {
      const captain = await readyTestUser(app, "NotifCap");
      const player = await readyTestUser(app, "NotifPlayer");
      expect(player.userId).toBeTruthy();

      const createRes = await apiPost(captain.agent, "/api/teams", {
        name: uniqueTeamName("Notif Team"),
        sport: "Soccer",
        city: "Cork",
      });
      const teamId = createRes.body.id as string;

      await apiPut(captain.agent, `/api/teams/${teamId}/join-template`, {
        joinPolicy: "invite_only",
        requirements: { questions: [], documents: [] },
      });

      const inviteRes = await apiPost(captain.agent, `/api/teams/${teamId}/invites`, {
        userId: player.userId!,
        message: "Join for notifications test",
      });
      expect(inviteRes.status).toBe(201);

      const feedRes = await player.agent.get("/api/notifications?limit=20").expect(200);
      const items = feedRes.body.items as Array<{
        id: string;
        type: string;
        message?: string;
        metadata?: { route?: string; teamId?: string; join?: boolean };
        readAt?: string | null;
      }>;
      const invite = items.find((n) => n.type === "team_invite" && n.metadata?.teamId === teamId);
      expect(invite?.id).toBeTruthy();
      expect(invite?.message).toMatch(/invited you to join/i);
      expect(invite?.metadata?.route).toContain(`/teams/${teamId}`);
      expect(invite?.metadata?.join).toBe(true);

      const unreadBefore = await player.agent.get("/api/notifications/unread-count").expect(200);
      expect(unreadBefore.body.count).toBeGreaterThan(0);

      const readRes = await apiPatch(player.agent, `/api/notifications/${invite!.id}/read`, {});
      expect(readRes.status).toBe(200);
      expect(readRes.body.readAt).toBeTruthy();

      await apiPatch(player.agent, "/api/notifications/read-all", {});
      const unreadAfter = await player.agent.get("/api/notifications/unread-count").expect(200);
      expect(unreadAfter.body.count).toBe(0);
    });
  });
});
