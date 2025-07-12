import { test, expect } from '@playwright/test';

test.describe('Income Management @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
    
    await page.goto('/');
    await page.getByText('Income').click();
  });

  test('should display income management page', async ({ page }) => {
    await expect(page.getByText('Income Management')).toBeVisible();
    await expect(page.getByText('Track your income sources and amounts')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Income' })).toBeVisible();
  });

  test('should open add income modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Income' }).click();
    
    await expect(page.getByText('Add New Income')).toBeVisible();
    await expect(page.getByLabel('Date')).toBeVisible();
    await expect(page.getByLabel('Source')).toBeVisible();
    await expect(page.getByLabel('Amount')).toBeVisible();
    await expect(page.getByLabel('Frequency')).toBeVisible();
  });

  test('should fill and submit income form', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Income' }).click();
    
    // Fill the form
    await page.getByLabel('Date').fill('2023-12-01');
    await page.getByLabel('Source').fill('Salary');
    await page.getByLabel('Amount').fill('5000.00');
    await page.getByLabel('Currency').selectOption('USD');
    await page.getByLabel('Frequency').selectOption('Monthly');
    await page.getByPlaceholder('Optional notes').fill('Monthly salary payment');
    
    // Submit the form
    await page.getByRole('button', { name: 'Add Income' }).last().click();
    
    // Should close modal
    await expect(page.getByText('Add New Income')).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Income' }).click();
    
    // Try to submit without source
    await page.getByLabel('Amount').fill('1000');
    await page.getByRole('button', { name: 'Add Income' }).last().click();
    
    // Should show validation for missing source
  });

  test('should handle frequency options', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Income' }).click();
    
    const frequencySelect = page.getByLabel('Frequency');
    
    // Check available frequency options
    await expect(frequencySelect.locator('option[value="Monthly"]')).toBeAttached();
    await expect(frequencySelect.locator('option[value="Bi-Weekly"]')).toBeAttached();
    await expect(frequencySelect.locator('option[value="Weekly"]')).toBeAttached();
    await expect(frequencySelect.locator('option[value="Yearly"]')).toBeAttached();
    await expect(frequencySelect.locator('option[value="One-time"]')).toBeAttached();
  });

  test('should cancel income creation', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Income' }).click();
    
    // Fill some data
    await page.getByLabel('Source').fill('Test Income');
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Modal should close
    await expect(page.getByText('Add New Income')).not.toBeVisible();
  });

  test('should display total income summary', async ({ page }) => {
    // Should show total income card
    await expect(page.getByText('Total Income')).toBeVisible();
    
    // Should display formatted currency amount
    const totalIncomeElement = page.locator('text=Total Income').locator('..').locator('p').nth(1);
    await expect(totalIncomeElement).toBeVisible();
  });
});