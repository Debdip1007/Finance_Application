import { test, expect } from '@playwright/test';

test.describe('Settings Management @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
    
    await page.goto('/');
    await page.getByText('Settings').click();
  });

  test('should display currency settings page', async ({ page }) => {
    await expect(page.getByText('Currency Settings')).toBeVisible();
    await expect(page.getByText('Configure your default and display currencies')).toBeVisible();
  });

  test('should show currency setting fields', async ({ page }) => {
    await expect(page.getByLabel('Default Currency')).toBeVisible();
    await expect(page.getByLabel('Display Currency')).toBeVisible();
  });

  test('should display currency conversion information', async ({ page }) => {
    await expect(page.getByText('How Currency Conversion Works:')).toBeVisible();
    await expect(page.getByText('All transactions are stored in their original currency')).toBeVisible();
    await expect(page.getByText('Real-time exchange rates are used for conversions')).toBeVisible();
  });

  test('should handle currency selection', async ({ page }) => {
    const defaultCurrencySelect = page.getByLabel('Default Currency');
    const displayCurrencySelect = page.getByLabel('Display Currency');
    
    // Test changing default currency
    await defaultCurrencySelect.selectOption('USD');
    await expect(defaultCurrencySelect).toHaveValue('USD');
    
    // Test changing display currency
    await displayCurrencySelect.selectOption('EUR');
    await expect(displayCurrencySelect).toHaveValue('EUR');
  });

  test('should show save button when changes are made', async ({ page }) => {
    // Initially, save button should not be visible (no changes)
    await expect(page.getByRole('button', { name: 'Save Changes' })).not.toBeVisible();
    
    // Make a change
    await page.getByLabel('Default Currency').selectOption('USD');
    
    // Save button should appear
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });

  test('should save currency settings', async ({ page }) => {
    // Change both currencies
    await page.getByLabel('Default Currency').selectOption('USD');
    await page.getByLabel('Display Currency').selectOption('EUR');
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    // Should show success message or hide save button
    // (Adjust based on your implementation)
  });

  test('should display available currencies', async ({ page }) => {
    const defaultCurrencySelect = page.getByLabel('Default Currency');
    
    // Check if major currencies are available
    await expect(defaultCurrencySelect.locator('option[value="USD"]')).toBeAttached();
    await expect(defaultCurrencySelect.locator('option[value="EUR"]')).toBeAttached();
    await expect(defaultCurrencySelect.locator('option[value="GBP"]')).toBeAttached();
    await expect(defaultCurrencySelect.locator('option[value="INR"]')).toBeAttached();
    await expect(defaultCurrencySelect.locator('option[value="JPY"]')).toBeAttached();
  });

  test('should show currency descriptions', async ({ page }) => {
    // Check for helpful descriptions
    await expect(page.getByText('All calculations and account balances will be converted to this currency')).toBeVisible();
    await expect(page.getByText('Primary currency shown in reports and summaries')).toBeVisible();
  });

  test('should handle loading state', async ({ page }) => {
    // On initial load, there might be a loading state
    // This test would depend on your implementation
    // You might see a spinner or loading text initially
  });
});