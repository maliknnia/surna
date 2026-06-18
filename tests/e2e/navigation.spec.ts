// E2E tests for navigation and basic functionality
import { test, expect } from "@playwright/test";
import { mockAuthenticatedSession, prepareE2EPage, dismissCookieConsent } from "./helpers";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await prepareE2EPage(page);
    await mockAuthenticatedSession(page);
  });

  test("should navigate between main shell panels", async ({ page }) => {
    await page.goto("/");
    await dismissCookieConsent(page);
    await expect(page.locator('[data-testid="mobile-home"]')).toBeVisible();

    await page.locator('[data-testid="nav-events"]').click();
    await expect(page).toHaveURL(/\?panel=events/);
    await expect(page.locator(".surna-header-title")).toHaveText("Events");

    await page.locator('[data-testid="nav-teams"]').click();
    await expect(page).toHaveURL(/\?panel=teams/);

    await page.locator('[data-testid="nav-venues"]').click();
    await expect(page).toHaveURL(/\?panel=venues/);
    await expect(page.locator(".surna-header-title")).toHaveText("Venues");

    await page.locator('[data-testid="nav-home"]').click();
    await expect(page).toHaveURL(/\/(\?.*)?$/);
    await expect(page.locator('[data-testid="nav-home"]')).toHaveAttribute("aria-current", "page");
    await expect(page.locator('[data-testid="mobile-home"]')).toBeVisible();
  });

  test("should show bottom navigation on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await dismissCookieConsent(page);

    const bottomNav = page.locator('nav[aria-label="Main navigation"]');
    await expect(bottomNav).toBeVisible();
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-map"]')).toBeVisible();
  });

  test("should open feed as a standalone route", async ({ page }) => {
    await page.goto("/feed");

    await expect(page).toHaveURL(/\/feed/);
    await expect(page.locator('[data-testid="tab-home"]')).toBeVisible();
  });

  test("should handle 404 pages correctly", async ({ page }) => {
    await page.goto("/non-existent-page");

    await expect(page.locator('[data-testid="not-found-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="link-home"]')).toBeVisible();
  });
});
