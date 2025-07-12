import { test, expect } from '@playwright/test';

test.describe('Account Deletion @smoke', () => {
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

  test('should display delete account section', async ({ page }) => {
    await expect(page.getByText('Delete Account')).toBeVisible();
    await expect(page.getByText('Permanently delete your account and all associated data')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete My Account' })).toBeVisible();
  });

  test('should show warning information', async ({ page }) => {
    await expect(page.getByText('What will be deleted:')).toBeVisible();
    await expect(page.getByText('Your user account and profile')).toBeVisible();
    await expect(page.getByText('All bank accounts and financial data')).toBeVisible();
    await expect(page.getByText('Income and expense records')).toBeVisible();
    await expect(page.getByText('Investment portfolio data')).toBeVisible();
  });

  test('should open delete confirmation modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete My Account' }).click();
    
    await expect(page.getByText('Delete Account - Final Confirmation')).toBeVisible();
    await expect(page.getByText('This action is irreversible!')).toBeVisible();
    await expect(page.getByText('Account to be deleted:')).toBeVisible();
    await expect(page.getByText('test@example.com')).toBeVisible();
  });

  test('should require confirmation text', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete My Account' }).click();
    
    const deleteButton = page.getByRole('button', { name: 'Delete My Account' }).last();
    await expect(deleteButton).toBeDisabled();
    
    // Type incorrect confirmation text
    await page.getByPlaceholder('DELETE MY ACCOUNT').fill('delete my account');
    await expect(deleteButton).toBeDisabled();
    
    // Type correct confirmation text
    await page.getByPlaceholder('DELETE MY ACCOUNT').fill('DELETE MY ACCOUNT');
    await expect(deleteButton).toBeEnabled();
  });

  test('should handle password verification option', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete My Account' }).click();
    
    // Enable password verification
    await page.getByLabel('Require password verification for additional security').check();
    await expect(page.getByLabel('Current Password')).toBeVisible();
    
    // Fill confirmation text but no password
    await page.getByPlaceholder('DELETE MY ACCOUNT').fill('DELETE MY ACCOUNT');
    const deleteButton = page.getByRole('button', { name: 'Delete My Account' }).last();
    await expect(deleteButton).toBeDisabled();
    
    // Fill password
    await page.getByLabel('Current Password').fill('password123');
    await expect(deleteButton).toBeEnabled();
  });

  test('should show/hide password', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete My Account' }).click();
    await page.getByLabel('Require password verification for additional security').check();
    
    const passwordInput = page.getByLabel('Current Password');
    await passwordInput.fill('password123');
    
    // Should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click show password
    await page.locator('button').filter({ hasText: /eye/i }).first().click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click hide password
    await page.locator('button').filter({ hasText: /eye/i }).first().click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should cancel deletion', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete My Account' }).click();
    
    // Fill form
    await page.getByPlaceholder('DELETE MY ACCOUNT').fill('DELETE MY ACCOUNT');
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Modal should close
    await expect(page.getByText('Delete Account - Final Confirmation')).not.toBeVisible();
  });

  test('should handle deletion error gracefully', async ({ page }) => {
    // Mock failed deletion response
    await page.route('**/functions/v1/delete-user', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.getByRole('button', { name: 'Delete My Account' }).click();
    await page.getByPlaceholder('DELETE MY ACCOUNT').fill('DELETE MY ACCOUNT');
    await page.getByRole('button', { name: 'Delete My Account' }).last().click();
    
    // Should show error message
    await expect(page.getByText('Internal server error')).toBeVisible();
  });

  test('should handle successful deletion', async ({ page }) => {
    // Mock successful deletion response
    await page.route('**/functions/v1/delete-user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'User account successfully deleted' })
      });
    });

    await page.getByRole('button', { name: 'Delete My Account' }).click();
    await page.getByPlaceholder('DELETE MY ACCOUNT').fill('DELETE MY ACCOUNT');
    await page.getByRole('button', { name: 'Delete My Account' }).last().click();
    
    // Should redirect to goodbye page
    await expect(page).toHaveURL('/goodbye');
  });
});

test.describe('Goodbye Page', () => {
  test('should display goodbye message', async ({ page }) => {
    await page.goto('/goodbye');
    
    await expect(page.getByText('Account Successfully Deleted')).toBeVisible();
    await expect(page.getByText('Your account and all associated data have been permanently removed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Return to Homepage' })).toBeVisible();
  });

  test('should return to homepage', async ({ page }) => {
    await page.goto('/goodbye');
    
    await page.getByRole('button', { name: 'Return to Homepage' }).click();
    await expect(page).toHaveURL('/');
  });
});