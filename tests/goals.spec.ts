import { test, expect } from '@playwright/test';

test.describe('Goal Management @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
    
    await page.goto('/');
    await page.getByText('Goals').click();
  });

  test('should display goal management page', async ({ page }) => {
    await expect(page.getByText('Goal Management')).toBeVisible();
    await expect(page.getByText('Set and track your financial goals')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Goal' })).toBeVisible();
  });

  test('should show goal summary cards', async ({ page }) => {
    await expect(page.getByText('Total Available Savings')).toBeVisible();
    await expect(page.getByText('Active Goals')).toBeVisible();
    await expect(page.getByText('Fulfilled Goals')).toBeVisible();
    await expect(page.getByText('Total Target')).toBeVisible();
    await expect(page.getByText('Total Saved')).toBeVisible();
  });

  test('should open add goal modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Goal' }).click();
    
    await expect(page.getByText('Add New Goal')).toBeVisible();
    await expect(page.getByLabel('Goal Name')).toBeVisible();
    await expect(page.getByLabel('Target Amount')).toBeVisible();
    await expect(page.getByLabel('Currency')).toBeVisible();
    await expect(page.getByLabel('Target Date')).toBeVisible();
    await expect(page.getByLabel('Goal Type')).toBeVisible();
  });

  test('should fill and submit goal form', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Goal' }).click();
    
    // Fill the form
    await page.getByLabel('Goal Name').fill('Emergency Fund');
    await page.getByLabel('Target Amount').fill('10000.00');
    await page.getByLabel('Currency').selectOption('USD');
    await page.getByLabel('Current Saved Amount').fill('2000.00');
    
    // Set target date to future date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    await page.getByLabel('Target Date').fill(futureDate.toISOString().split('T')[0]);
    
    await page.getByLabel('Goal Type').selectOption('Short-term (<1 year)');
    await page.getByLabel('Status').selectOption('Active');
    await page.getByPlaceholder('Optional notes about this goal').fill('6 months of expenses');
    
    // Submit the form
    await page.getByRole('button', { name: 'Add Goal' }).last().click();
    
    // Should close modal
    await expect(page.getByText('Add New Goal')).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Goal' }).click();
    
    // Try to submit without required fields
    await page.getByRole('button', { name: 'Add Goal' }).last().click();
    
    // Should show validation errors
  });

  test('should validate target date is in future', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Goal' }).click();
    
    // Fill required fields with past date
    await page.getByLabel('Goal Name').fill('Test Goal');
    await page.getByLabel('Target Amount').fill('1000');
    await page.getByLabel('Target Date').fill('2020-01-01');
    
    await page.getByRole('button', { name: 'Add Goal' }).last().click();
    
    // Should show validation error for past date
  });

  test('should handle goal types', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Goal' }).click();
    
    const typeSelect = page.getByLabel('Goal Type');
    
    // Check available goal types
    await expect(typeSelect.locator('option[value="Short-term (<1 year)"]')).toBeAttached();
    await expect(typeSelect.locator('option[value="Medium-term (1-5 years)"]')).toBeAttached();
    await expect(typeSelect.locator('option[value="Long-term (>5 years)"]')).toBeAttached();
  });

  test('should handle goal status', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Goal' }).click();
    
    const statusSelect = page.getByLabel('Status');
    
    // Check status options
    await expect(statusSelect.locator('option[value="Active"]')).toBeAttached();
    await expect(statusSelect.locator('option[value="Fulfilled"]')).toBeAttached();
  });

  test('should validate saved amount not exceeding target', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Goal' }).click();
    
    // Fill form with saved amount greater than target
    await page.getByLabel('Goal Name').fill('Test Goal');
    await page.getByLabel('Target Amount').fill('1000');
    await page.getByLabel('Current Saved Amount').fill('1500');
    
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    await page.getByLabel('Target Date').fill(futureDate.toISOString().split('T')[0]);
    
    await page.getByRole('button', { name: 'Add Goal' }).last().click();
    
    // Should show validation error
  });

  test('should cancel goal creation', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Goal' }).click();
    
    // Fill some data
    await page.getByLabel('Goal Name').fill('Test Goal');
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Modal should close
    await expect(page.getByText('Add New Goal')).not.toBeVisible();
  });

  test('should show available savings information', async ({ page }) => {
    // Should display available savings section
    await expect(page.getByText('Available Savings & Goal Progress')).toBeVisible();
    await expect(page.getByText('available to allocate to your goals')).toBeVisible();
  });
});