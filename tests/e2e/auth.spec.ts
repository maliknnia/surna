// E2E tests for authentication flow
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show landing page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // Should see landing page
    await expect(page.locator('data-testid=landing-page')).toBeVisible();
    
    // Should have login button
    await expect(page.locator('data-testid=button-login')).toBeVisible();
  });

  test('should redirect to login when accessing protected pages', async ({ page }) => {
    // Try to access protected page
    await page.goto('/feed');
    
    // Should be redirected to login or show unauthorized message
    const isLoginPage = await page.locator('data-testid=login-page').isVisible();
    const isUnauthorized = await page.locator('text=unauthorized').isVisible();
    
    expect(isLoginPage || isUnauthorized).toBeTruthy();
  });

  test('should handle login flow correctly', async ({ page }) => {
    await page.goto('/');
    
    // Click login button
    await page.locator('data-testid=button-login').click();
    
    // Should be redirected to auth provider or show login form
    // Note: In real tests, you'd need to mock the OIDC provider
    await expect(page.url()).toContain('/api/login');
  });

  test('should show user content when authenticated', async ({ page }) => {
    // Mock authentication state
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-token', 'mock-token');
    });
    
    // Set up API mock for authenticated user
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
    
    await page.goto('/');
    
    // Should see authenticated content
    await expect(page.locator('data-testid=home-page')).toBeVisible();
  });
});