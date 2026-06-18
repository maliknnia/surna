import type { Page } from "@playwright/test";

const COOKIE_CONSENT_KEY = "surna_cookie_consent_v1";

/** Prevent cookie banner + theme modal from blocking nav clicks in e2e. */
export async function prepareE2EPage(page: Page) {
  await page.addInitScript(
    (cookieKey) => {
      localStorage.setItem(cookieKey, "accepted");
      localStorage.setItem("theme-selected", "true");
    },
    COOKIE_CONSENT_KEY,
  );
}

/** Dismiss banner if it still appears (e.g. before init script runs). */
export async function dismissCookieConsent(page: Page) {
  const accept = page.locator('[data-testid="button-cookie-accept"]');
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

/** User payload that skips onboarding modals in e2e. */
export const MOCK_USER = {
  id: "e2e-user-1",
  email: "e2e@surna.test",
  firstName: "E2E",
  lastName: "Runner",
  displayName: "E2E Runner",
  username: "e2e_runner",
  profileImageUrl: null,
  profileType: "normal",
  profileJson: {
    profilePathChosenAt: new Date().toISOString(),
    profileSetupCompletedAt: new Date().toISOString(),
    onboardingSkipped: true,
  },
};

async function fulfillJson(route: Parameters<Parameters<Page["route"]>[1]>[0], body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** Mock session + common APIs so protected routes render the mobile shell. */
export async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/auth/user", async (route) => {
    await fulfillJson(route, MOCK_USER);
  });

  await page.route("**/api/auth/providers", async (route) => {
    await fulfillJson(route, { google: false, devQuickLogin: false, phoneAvailable: false });
  });

  await page.route("**/api/events**", async (route) => {
    await fulfillJson(route, { items: [], nextCursor: null });
  });

  await page.route("**/api/teams**", async (route) => {
    await fulfillJson(route, []);
  });

  await page.route("**/api/instant-teams**", async (route) => {
    await fulfillJson(route, []);
  });

  await page.route("**/api/coaches**", async (route) => {
    await fulfillJson(route, []);
  });

  await page.route("**/api/competitive-challenges**", async (route) => {
    await fulfillJson(route, { matches: [] });
  });

  await page.route("**/api/places**", async (route) => {
    await fulfillJson(route, []);
  });

  await page.route("**/api/notifications**", async (route) => {
    await fulfillJson(route, []);
  });

  await page.route("**/api/messages/unread**", async (route) => {
    await fulfillJson(route, { count: 0 });
  });

  await page.route("**/api/stories**", async (route) => {
    await fulfillJson(route, []);
  });

  await page.route("**/api/posts/feed-keyset**", async (route) => {
    await fulfillJson(route, { items: [], nextCursor: null });
  });

  await page.route("**/api/pro/**", async (route) => {
    await fulfillJson(route, { active: false });
  });
}

export async function mockGuestSession(page: Page) {
  await page.route("**/api/auth/user", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Unauthorized" }),
    });
  });

  await page.route("**/api/auth/providers", async (route) => {
    await fulfillJson(route, { google: false, devQuickLogin: false, phoneAvailable: false });
  });
}
