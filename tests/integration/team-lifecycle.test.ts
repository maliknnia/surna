import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Express } from "express";
import type { Server } from "http";
import { createApplication } from "../../server/createApp";
import { apiPost, apiPut, signUpUser, uniqueTeamName } from "./helpers/http";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

describe.skipIf(!hasDatabase)("Team lifecycle (integration)", () => {
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

  it("captain creates team and sets open join policy", async () => {
    const captain = await signUpUser(app, "Captain");

    const createRes = await apiPost(captain.agent, "/api/teams", {
      name: uniqueTeamName("FC Test"),
      sport: "Soccer",
      city: "Dublin",
      description: "Integration test team",
    });
    expect(createRes.status).toBe(200);
    const teamId = createRes.body.id as string;
    expect(teamId).toBeTruthy();

    const templateRes = await apiPut(captain.agent, `/api/teams/${teamId}/join-template`, {
      joinPolicy: "open",
      isPublic: true,
      joinFeeCents: 0,
      requirements: { questions: [], documents: [] },
    });
    expect(templateRes.status).toBe(200);
    expect(templateRes.body.joinPolicy).toBe("open");
  });

  it("player auto-joins open team via apply", async () => {
    const captain = await signUpUser(app, "CapOpen");
    const player = await signUpUser(app, "PlayerOpen");

    const createRes = await apiPost(captain.agent, "/api/teams", {
      name: uniqueTeamName("Open Squad"),
      sport: "Basketball",
      city: "Cork",
    });
    const teamId = createRes.body.id as string;

    await apiPut(captain.agent, `/api/teams/${teamId}/join-template`, {
      joinPolicy: "open",
      isPublic: true,
      requirements: { questions: [], documents: [] },
    });

    const applyRes = await apiPost(player.agent, `/api/teams/${teamId}/apply`, {
      message: "Ready to play",
    });
    expect(applyRes.status).toBe(200);
    expect(applyRes.body.joined).toBe(true);
    expect(applyRes.body.status).toBe("joined");

    const teamRes = await player.agent.get(`/api/teams/${teamId}`).expect(200);
    expect(teamRes.body.isMember).toBe(true);
  });

  it("approval policy queues join until captain approves", async () => {
    const captain = await signUpUser(app, "CapAppr");
    const player = await signUpUser(app, "PlayerAppr");

    const createRes = await apiPost(captain.agent, "/api/teams", {
      name: uniqueTeamName("Approval FC"),
      sport: "Volleyball",
      city: "Galway",
    });
    const teamId = createRes.body.id as string;

    await apiPut(captain.agent, `/api/teams/${teamId}/join-template`, {
      joinPolicy: "approval",
      isPublic: true,
      requirements: { questions: [], documents: [] },
    });

    const applyRes = await apiPost(player.agent, `/api/teams/${teamId}/apply`, {});
    expect(applyRes.status).toBe(200);
    expect(applyRes.body.status).toBe("pending");
    expect(applyRes.body.joined).toBe(false);

    const pendingRes = await captain.agent.get(`/api/teams/${teamId}/join-requests`).expect(200);
    const pending = pendingRes.body as { id: string; userId?: string }[];
    const requestId = Array.isArray(pending)
      ? pending.find((r) => r.userId === player.userId)?.id ?? pending[0]?.id
      : undefined;
    expect(requestId).toBeTruthy();

    const reviewRes = await apiPut(captain.agent, `/api/teams/join-requests/${requestId}`, {
      decision: "approved",
    });
    expect(reviewRes.status).toBe(200);

    const teamRes = await player.agent.get(`/api/teams/${teamId}`).expect(200);
    expect(teamRes.body.isMember).toBe(true);
  });

  it("invite flow: captain invites, player accepts via apply", async () => {
    const captain = await signUpUser(app, "CapInv");
    const player = await signUpUser(app, "PlayerInv");

    const createRes = await apiPost(captain.agent, "/api/teams", {
      name: uniqueTeamName("Invite Camp"),
      sport: "Boxing",
      city: "Limerick",
    });
    const teamId = createRes.body.id as string;

    await apiPut(captain.agent, `/api/teams/${teamId}/join-template`, {
      joinPolicy: "invite_only",
      isPublic: false,
      requirements: { questions: [], documents: [] },
    });

    expect(player.userId).toBeTruthy();

    const inviteRes = await apiPost(captain.agent, `/api/teams/${teamId}/invites`, {
      userId: player.userId,
      message: "Join the camp",
    });
    expect(inviteRes.status).toBe(201);

    const myInvites = await player.agent.get("/api/teams/invites/me").expect(200);
    const invites = Array.isArray(myInvites.body) ? myInvites.body : myInvites.body.items ?? [];
    const invite = invites.find((i: { teamId?: string }) => i.teamId === teamId);
    expect(invite?.id).toBeTruthy();

    const applyRes = await apiPost(player.agent, `/api/teams/${teamId}/apply`, {
      inviteId: invite.id,
    });
    expect(applyRes.status).toBe(200);
    expect(applyRes.body.joined).toBe(true);
  });

  it("logs game, updates record, and writes profile team-games", async () => {
    const captain = await signUpUser(app, "CapGame");
    const player = await signUpUser(app, "PlayerGame");

    const createRes = await apiPost(captain.agent, "/api/teams", {
      name: uniqueTeamName("Game Team"),
      sport: "Soccer",
      city: "Dublin",
    });
    const teamId = createRes.body.id as string;

    await apiPut(captain.agent, `/api/teams/${teamId}/join-template`, {
      joinPolicy: "open",
      requirements: { questions: [], documents: [] },
    });

    await apiPost(player.agent, `/api/teams/${teamId}/apply`, {});

    const membersRes = await captain.agent.get(`/api/teams/${teamId}/members`).expect(200);
    const members = membersRes.body.members ?? membersRes.body;
    const playerMember = (members as { userId: string }[]).find((m) => m.userId === player.userId);
    expect(playerMember?.userId).toBe(player.userId);

    const gameRes = await apiPost(captain.agent, `/api/teams/${teamId}/games`, {
      opponentName: "Rivals FC",
      result: "win",
      ourScore: 2,
      theirScore: 1,
      playerIds: [player.userId],
    });
    expect(gameRes.status).toBe(201);

    const gamesList = await captain.agent.get(`/api/teams/${teamId}/games`).expect(200);
    expect(gamesList.body.games?.length).toBeGreaterThan(0);
    expect(gamesList.body.record?.W).toBeGreaterThanOrEqual(1);

    const teamDetail = await captain.agent.get(`/api/teams/${teamId}`).expect(200);
    expect(teamDetail.body.record?.W).toBeGreaterThanOrEqual(1);

    const profileGames = await player.agent.get(`/api/profile/${player.userId}/team-games`).expect(200);
    expect(profileGames.body.games?.length).toBeGreaterThan(0);
    expect(profileGames.body.summary?.total).toBeGreaterThan(0);
  });

  it("non-manager cannot log games", async () => {
    const captain = await signUpUser(app, "CapDeny");
    const player = await signUpUser(app, "PlayerDeny");

    const createRes = await apiPost(captain.agent, "/api/teams", {
      name: uniqueTeamName("Deny Log"),
      sport: "Tennis",
      city: "Dublin",
    });
    const teamId = createRes.body.id as string;

    await apiPut(captain.agent, `/api/teams/${teamId}/join-template`, {
      joinPolicy: "open",
      requirements: { questions: [], documents: [] },
    });
    await apiPost(player.agent, `/api/teams/${teamId}/apply`, {});

    const denied = await apiPost(player.agent, `/api/teams/${teamId}/games`, {
      opponentName: "Someone",
      result: "loss",
      playerIds: [player.userId!],
    });
    expect(denied.status).toBe(400);
  });
});
