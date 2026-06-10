// E2E tests for navigation and basic functionality
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for protected pages
    await page.route('/api/auth/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        })
      });
    });
  });

  test('should navigate between main pages', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to feed
    await page.locator('data-testid=nav-feed').click();
    await expect(page.url()).toContain('/feed');
    await expect(page.locator('data-testid=feed-page')).toBeVisible();
    
    // Navigate to events
    await page.locator('data-testid=nav-events').click();
    await expect(page.url()).toContain('/events');
    await expect(page.locator('data-testid=events-page')).toBeVisible();
    
    // Navigate to teams
    await page.locator('data-testid=nav-teams').click();
    await expect(page.url()).toContain('/teams');
    await expect(page.locator('data-testid=teams-page')).toBeVisible();
  });

  test('should show responsive navigation on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Mobile menu should be hidden initially
    await expect(page.locator('data-testid=mobile-menu')).not.toBeVisible();
    
    // Click mobile menu toggle
    await page.locator('data-testid=mobile-menu-toggle').click();
    
    // Mobile menu should be visible
    await expect(page.locator('data-testid=mobile-menu')).toBeVisible();
  });

  test('should handle 404 pages correctly', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Should show 404 page
    await expect(page.locator('data-testid=not-found-page')).toBeVisible();
    
    // Should have link to go back home
    await expect(page.locator('data-testid=link-home')).toBeVisible();
  });
});