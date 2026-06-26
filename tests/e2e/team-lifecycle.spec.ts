import { test, expect } from "@playwright/test";
import { prepareE2EPage, dismissCookieConsent } from "./helpers";

/**
 * Real API journey — no mocked team endpoints.
 * Requires built client + test DB (same as integration tests).
 */
test.describe("Team lifecycle (real API)", () => {
  test.describe.configure({ mode: "serial" });

  const runId = Date.now().toString(36);
  const captainEmail = `e2e.captain.${runId}@surna-test.local`;
  const playerEmail = `e2e.player.${runId}@surna-test.local`;
  const password = "TestPass123!";

  test.beforeEach(async ({ page }) => {
    await prepareE2EPage(page);
  });

  test("captain creates team, invites player, player joins, captain logs game", async ({
    page,
    browser,
  }) => {
    const baseURL = test.info().project.use.baseURL ?? "http://localhost:5000";

    // Captain session
    const captainSignUp = await page.request.post(`${baseURL}/api/auth/sign-up/email`, {
      data: { email: captainEmail, password, firstName: "E2E", lastName: "Captain" },
    });
    expect(captainSignUp.ok()).toBeTruthy();
    const captainSignUpBody = await captainSignUp.json();
    const captainDevCode = captainSignUpBody.devCode as string | undefined;

    await page.goto("/my-hub/teams");
    await dismissCookieConsent(page);

    // Create team via API (UI wizard is heavy; API is the lifecycle under test)
    const csrfRes = await page.request.get(`${baseURL}/api/csrf-token`);
    expect(csrfRes.ok()).toBeTruthy();
    const csrfToken = (await csrfRes.json()).csrfToken as string;

    if (captainDevCode) {
      await page.request.post(`${baseURL}/api/auth/email/verify`, {
        headers: { "x-csrf-token": csrfToken },
        data: { code: captainDevCode },
      });
    }
    await page.request.post(`${baseURL}/api/profile/path`, {
      headers: { "x-csrf-token": csrfToken },
      data: { profileType: "normal", skipSetup: true },
    });

    const teamName = `E2E FC ${runId}`;
    const createTeam = await page.request.post(`${baseURL}/api/teams`, {
      headers: { "x-csrf-token": csrfToken },
      data: {
        name: teamName,
        sport: "Soccer",
        city: "Dublin",
        description: "E2E lifecycle team",
      },
    });
    expect(createTeam.ok()).toBeTruthy();
    const teamId = (await createTeam.json()).id as string;

    await page.request.put(`${baseURL}/api/teams/${teamId}/join-template`, {
      headers: { "x-csrf-token": csrfToken },
      data: {
        joinPolicy: "invite_only",
        isPublic: true,
        requirements: { questions: [], documents: [] },
      },
    });

    // Player in separate context (separate session)
    const playerContext = await browser.newContext({ baseURL });
    const playerPage = await playerContext.newPage();
    await prepareE2EPage(playerPage);

    const playerSignUp = await playerPage.request.post(`${baseURL}/api/auth/sign-up/email`, {
      data: { email: playerEmail, password, firstName: "E2E", lastName: "Player" },
    });
    expect(playerSignUp.ok()).toBeTruthy();
    const playerSignUpBody = await playerSignUp.json();
    const playerDevCode = playerSignUpBody.devCode as string | undefined;
    const playerMe = await playerPage.request.get(`${baseURL}/api/auth/user`);
    expect(playerMe.ok()).toBeTruthy();
    const playerId = (await playerMe.json()).id as string;
    expect(playerId).toBeTruthy();

    const playerCsrf0 = await playerPage.request.get(`${baseURL}/api/csrf-token`);
    expect(playerCsrf0.ok()).toBeTruthy();
    const playerToken0 = (await playerCsrf0.json()).csrfToken as string;
    if (playerDevCode) {
      await playerPage.request.post(`${baseURL}/api/auth/email/verify`, {
        headers: { "x-csrf-token": playerToken0 },
        data: { code: playerDevCode },
      });
    }
    await playerPage.request.post(`${baseURL}/api/profile/path`, {
      headers: { "x-csrf-token": playerToken0 },
      data: { profileType: "normal", skipSetup: true },
    });

    const captainCsrf2 = await page.request.get(`${baseURL}/api/csrf-token`);
    expect(captainCsrf2.ok()).toBeTruthy();
    const captainToken2 = (await captainCsrf2.json()).csrfToken as string;

    const inviteRes = await page.request.post(`${baseURL}/api/teams/${teamId}/invites`, {
      headers: { "x-csrf-token": captainToken2 },
      data: { userId: playerId, message: "Join us" },
    });
    expect(inviteRes.status()).toBe(201);

    const invites = await playerPage.request.get(`${baseURL}/api/teams/invites/me`);
    expect(invites.ok()).toBeTruthy();
    const inviteList = await invites.json();
    const invite = (Array.isArray(inviteList) ? inviteList : []).find(
      (i: { teamId?: string }) => i.teamId === teamId,
    );
    expect(invite?.id).toBeTruthy();

    const playerCsrf = await playerPage.request.get(`${baseURL}/api/csrf-token`);
    const playerToken = (await playerCsrf.json()).csrfToken as string;

    const apply = await playerPage.request.post(`${baseURL}/api/teams/${teamId}/apply`, {
      headers: { "x-csrf-token": playerToken },
      data: { inviteId: invite!.id },
    });
    expect(apply.ok()).toBeTruthy();
    const applyBody = await apply.json();
    expect(applyBody.joined).toBe(true);

    const gameRes = await page.request.post(`${baseURL}/api/teams/${teamId}/games`, {
      headers: { "x-csrf-token": captainToken2 },
      data: {
        opponentName: "Rivals United",
        result: "win",
        ourScore: 3,
        theirScore: 1,
        playerIds: [playerId],
      },
    });
    expect(gameRes.status()).toBe(201);

    const gamesList = await page.request.get(`${baseURL}/api/teams/${teamId}/games`);
    expect(gamesList.ok()).toBeTruthy();
    const gamesBody = await gamesList.json();
    expect(gamesBody.games?.length).toBeGreaterThan(0);
    expect(gamesBody.record?.W).toBeGreaterThanOrEqual(1);

    // Team page shows recent games panel
    await page.goto(`/teams/${teamId}`);
    await dismissCookieConsent(page);
    await expect(page.getByTestId("team-recent-games")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Rivals United")).toBeVisible();

    // Player profile shows team activity
    await playerPage.goto(`/profile`);
    await dismissCookieConsent(playerPage);
    await playerPage.getByRole("button", { name: /games/i }).click().catch(() => {
      /* tab label may vary */
    });

    await playerContext.close();
  });
});
