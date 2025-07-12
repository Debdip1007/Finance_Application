import { test, expect } from '@playwright/test';

test.describe('Navigation @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for navigation tests
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
  });

  test('should render main navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check if main navigation items are present
    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('Bank Accounts')).toBeVisible();
    await expect(page.getByText('Income')).toBeVisible();
    await expect(page.getByText('Expenses')).toBeVisible();
    await expect(page.getByText('Investments')).toBeVisible();
    await expect(page.getByText('Goals')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
  });

  test('should navigate between sections', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to Bank Accounts
    await page.getByText('Bank Accounts').click();
    await expect(page.getByText('Bank Account Management')).toBeVisible();
    
    // Navigate to Income
    await page.getByText('Income').click();
    await expect(page.getByText('Income Management')).toBeVisible();
    
    // Navigate to Expenses
    await page.getByText('Expenses').click();
    await expect(page.getByText('Expense Management')).toBeVisible();
  });

  test('should show user info in sidebar', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('test@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Mobile menu button should be visible
    await expect(page.getByRole('button').first()).toBeVisible();
    
    // Sidebar should be hidden initially
    await expect(page.getByText('Overview')).not.toBeVisible();
    
    // Click mobile menu button
    await page.getByRole('button').first().click();
    
    // Sidebar should be visible
    await expect(page.getByText('Overview')).toBeVisible();
  });
});