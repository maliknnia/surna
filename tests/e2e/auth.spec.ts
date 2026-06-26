// E2E tests for authentication flow
import { test, expect } from "@playwright/test";
import { mockAuthenticatedSession, mockGuestSession, prepareE2EPage, dismissCookieConsent, gotoApp, waitForMobileShell } from "./helpers";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await prepareE2EPage(page);
  });

  test("should show landing page for unauthenticated users", async ({ page }) => {
    await mockGuestSession(page);
    await gotoApp(page, "/landing");

    await expect(page.locator('[data-testid="landing-page"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Started" })).toBeVisible();
  });

  test("should show login when accessing protected pages", async ({ page }) => {
    await mockGuestSession(page);
    await gotoApp(page, "/feed");

    await expect(page.locator('[data-testid="login-page"]')).toBeVisible();
  });

  test("should navigate to login from landing", async ({ page }) => {
    await mockGuestSession(page);
    await gotoApp(page, "/landing");

    await page.getByRole("button", { name: "Get Started" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-page"]')).toBeVisible();
  });

  test("should show mobile home when authenticated", async ({ page }) => {
    await mockAuthenticatedSession(page);
    await gotoApp(page);
    await dismissCookieConsent(page);
    await waitForMobileShell(page);

    await expect(page.locator('[data-testid="mobile-home"]')).toBeVisible();
    await expect(page.locator(".surna-header-title")).toHaveText("For you");
  });
});
