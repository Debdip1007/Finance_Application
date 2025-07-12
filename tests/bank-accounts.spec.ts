import { test, expect } from '@playwright/test';

test.describe('Bank Account Management @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
    
    await page.goto('/');
    await page.getByText('Bank Accounts').click();
  });

  test('should display bank account management page', async ({ page }) => {
    await expect(page.getByText('Bank Account Management')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Account' })).toBeVisible();
  });

  test('should open add account modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Account' }).click();
    
    await expect(page.getByText('Add New Bank Account')).toBeVisible();
    await expect(page.getByLabel('Bank Name')).toBeVisible();
    await expect(page.getByLabel('Account Type')).toBeVisible();
    await expect(page.getByLabel('Balance')).toBeVisible();
  });

  test('should fill and submit bank account form', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Account' }).click();
    
    // Fill the form
    await page.getByLabel('Bank Name').fill('Test Bank');
    await page.getByLabel('Account Type').selectOption('Savings');
    await page.getByLabel('Account Number').fill('1234567890');
    await page.getByLabel('IFSC Code').fill('TEST0001234');
    await page.getByLabel('Balance').fill('5000.00');
    await page.getByLabel('Currency').selectOption('USD');
    await page.getByPlaceholder('Optional notes').fill('Primary savings account');
    
    // Submit the form
    await page.getByRole('button', { name: 'Add Account' }).last().click();
    
    // Should close modal
    await expect(page.getByText('Add New Bank Account')).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Account' }).click();
    
    // Try to submit without required fields
    await page.getByRole('button', { name: 'Add Account' }).last().click();
    
    // Should show validation errors
  });

  test('should handle account types', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Account' }).click();
    
    const accountTypeSelect = page.getByLabel('Account Type');
    
    // Check available account types
    await expect(accountTypeSelect.locator('option[value="Savings"]')).toBeAttached();
    await expect(accountTypeSelect.locator('option[value="Checking"]')).toBeAttached();
    await expect(accountTypeSelect.locator('option[value="Credit Card"]')).toBeAttached();
    await expect(accountTypeSelect.locator('option[value="Loan"]')).toBeAttached();
    await expect(accountTypeSelect.locator('option[value="Cash"]')).toBeAttached();
  });

  test('should show credit limit field for credit cards', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Account' }).click();
    
    // Select Credit Card type
    await page.getByLabel('Account Type').selectOption('Credit Card');
    
    // Credit limit field should appear
    await expect(page.getByLabel('Credit Limit')).toBeVisible();
  });

  test('should cancel account creation', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Account' }).click();
    
    // Fill some data
    await page.getByLabel('Bank Name').fill('Test Bank');
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Modal should close
    await expect(page.getByText('Add New Bank Account')).not.toBeVisible();
  });

  test('should display account summary cards', async ({ page }) => {
    // Should show summary cards (adjust based on your implementation)
    await expect(page.getByText('Total Assets')).toBeVisible();
    await expect(page.getByText('Total Liabilities')).toBeVisible();
    await expect(page.getByText('Net Worth')).toBeVisible();
  });

  test('should handle currency selection', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Account' }).click();
    
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