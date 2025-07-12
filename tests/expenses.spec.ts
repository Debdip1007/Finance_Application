import { test, expect } from '@playwright/test';

test.describe('Expense Management @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
    
    await page.goto('/');
    await page.getByText('Expenses').click();
  });

  test('should display expense management page', async ({ page }) => {
    await expect(page.getByText('Expense Management')).toBeVisible();
    await expect(page.getByText('Track your expenses and spending patterns')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Expense' })).toBeVisible();
  });

  test('should open add expense modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Expense' }).click();
    
    await expect(page.getByText('Add New Expense')).toBeVisible();
    await expect(page.getByLabel('Date')).toBeVisible();
    await expect(page.getByLabel('Category')).toBeVisible();
    await expect(page.getByLabel('Amount')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Expense' }).click();
    
    // Try to submit without filling required fields
    await page.getByRole('button', { name: 'Add Expense' }).last().click();
    
    // Should show validation (this depends on your validation implementation)
    // You might need to adjust this based on how validation is displayed
  });

  test('should fill and submit expense form', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Expense' }).click();
    
    // Fill the form
    await page.getByLabel('Date').fill('2023-12-25');
    await page.getByLabel('Category').selectOption('Groceries');
    await page.getByPlaceholder('Optional description').fill('Weekly grocery shopping');
    await page.getByLabel('Amount').fill('150.00');
    await page.getByLabel('Currency').selectOption('USD');
    await page.getByLabel('Type').selectOption('Need');
    
    // Submit the form
    await page.getByRole('button', { name: 'Add Expense' }).last().click();
    
    // Should close modal and show success (adjust based on your implementation)
    await expect(page.getByText('Add New Expense')).not.toBeVisible();
  });

  test('should cancel expense creation', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Expense' }).click();
    
    // Fill some data
    await page.getByPlaceholder('Optional description').fill('Test expense');
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Modal should close
    await expect(page.getByText('Add New Expense')).not.toBeVisible();
  });

  test('should display expense categories in dropdown', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Expense' }).click();
    
    const categorySelect = page.getByLabel('Category');
    
    // Check if common categories are available
    await expect(categorySelect.locator('option[value="Groceries"]')).toBeAttached();
    await expect(categorySelect.locator('option[value="Transportation"]')).toBeAttached();
    await expect(categorySelect.locator('option[value="Dining Out"]')).toBeAttached();
    await expect(categorySelect.locator('option[value="Entertainment"]')).toBeAttached();
  });

  test('should handle currency selection', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Expense' }).click();
    
    const currencySelect = page.getByLabel('Currency');
    
    // Test different currency selections
    await currencySelect.selectOption('USD');
    await expect(currencySelect).toHaveValue('USD');
    
    await currencySelect.selectOption('EUR');
    await expect(currencySelect).toHaveValue('EUR');
    
    await currencySelect.selectOption('INR');
    await expect(currencySelect).toHaveValue('INR');
  });
});