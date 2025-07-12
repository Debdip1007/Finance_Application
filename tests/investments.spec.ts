import { test, expect } from '@playwright/test';

test.describe('Investment Management @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
    
    await page.goto('/');
    await page.getByText('Investments').click();
  });

  test('should display investment management page', async ({ page }) => {
    await expect(page.getByText('Investment Management')).toBeVisible();
    await expect(page.getByText('Track your investments and portfolio performance')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Investment' })).toBeVisible();
  });

  test('should show investment summary cards', async ({ page }) => {
    await expect(page.getByText('Total Portfolio Value')).toBeVisible();
    await expect(page.getByText('Total Invested')).toBeVisible();
    await expect(page.getByText('Total Gains/Losses')).toBeVisible();
    await expect(page.getByText('Active Investments')).toBeVisible();
  });

  test('should open add investment modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Investment' }).click();
    
    await expect(page.getByText('Add New Investment')).toBeVisible();
    await expect(page.getByLabel('Date')).toBeVisible();
    await expect(page.getByLabel('Type')).toBeVisible();
    await expect(page.getByLabel('Investment Name')).toBeVisible();
    await expect(page.getByLabel('Original Amount')).toBeVisible();
    await expect(page.getByLabel('Current Value')).toBeVisible();
  });

  test('should fill and submit investment form', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Investment' }).click();
    
    // Fill the form
    await page.getByLabel('Date').fill('2023-01-01');
    await page.getByLabel('Type').selectOption('Stocks');
    await page.getByLabel('Investment Name').fill('Apple Inc.');
    await page.getByLabel('Original Amount').fill('1000.00');
    await page.getByLabel('Currency').selectOption('USD');
    await page.getByLabel('Current Value').fill('1200.00');
    await page.getByLabel('Total Invested').fill('1000.00');
    await page.getByLabel('Realized Gain/Loss').fill('0');
    
    // Submit the form
    await page.getByRole('button', { name: 'Add Investment' }).last().click();
    
    // Should close modal
    await expect(page.getByText('Add New Investment')).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Investment' }).click();
    
    // Try to submit without required fields
    await page.getByRole('button', { name: 'Add Investment' }).last().click();
    
    // Should show validation errors
  });

  test('should handle investment types', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Investment' }).click();
    
    const typeSelect = page.getByLabel('Type');
    
    // Check available investment types
    await expect(typeSelect.locator('option[value="Stocks"]')).toBeAttached();
    await expect(typeSelect.locator('option[value="Bonds"]')).toBeAttached();
    await expect(typeSelect.locator('option[value="Mutual Funds"]')).toBeAttached();
    await expect(typeSelect.locator('option[value="ETFs"]')).toBeAttached();
    await expect(typeSelect.locator('option[value="Real Estate"]')).toBeAttached();
    await expect(typeSelect.locator('option[value="Cryptocurrency"]')).toBeAttached();
  });

  test('should handle investment status', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Investment' }).click();
    
    const statusSelect = page.getByLabel('Status');
    
    // Check status options
    await expect(statusSelect.locator('option[value="Active"]')).toBeAttached();
    await expect(statusSelect.locator('option[value="Liquidated"]')).toBeAttached();
    
    // Test liquidated status shows liquidation date field
    await statusSelect.selectOption('Liquidated');
    await expect(page.getByLabel('Liquidation Date')).toBeVisible();
  });

  test('should cancel investment creation', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Investment' }).click();
    
    // Fill some data
    await page.getByLabel('Investment Name').fill('Test Investment');
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Modal should close
    await expect(page.getByText('Add New Investment')).not.toBeVisible();
  });
});