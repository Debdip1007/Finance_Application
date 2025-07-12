import { test, expect } from '@playwright/test';

test.describe('Overview Dashboard @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
    
    await page.goto('/');
  });

  test('should display overview dashboard', async ({ page }) => {
    await expect(page.getByText('Current Financial Position')).toBeVisible();
    await expect(page.getByText('Monthly Analysis')).toBeVisible();
    await expect(page.getByText('5-Year Financial Overview')).toBeVisible();
  });

  test('should show financial summary cards', async ({ page }) => {
    // Check for key financial metrics
    await expect(page.getByText('Net Worth')).toBeVisible();
    await expect(page.getByText('Total Assets')).toBeVisible();
    await expect(page.getByText('Bank Balance')).toBeVisible();
    await expect(page.getByText('Investments')).toBeVisible();
    await expect(page.getByText('Total Liabilities')).toBeVisible();
    await expect(page.getByText('Total Income')).toBeVisible();
    await expect(page.getByText('Total Expenses')).toBeVisible();
    await expect(page.getByText('Net Savings')).toBeVisible();
  });

  test('should have currency and year selectors', async ({ page }) => {
    await expect(page.getByLabel('Currency')).toBeVisible();
    await expect(page.getByLabel('Year')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh Rates' })).toBeVisible();
  });

  test('should change currency display', async ({ page }) => {
    const currencySelect = page.getByLabel('Currency');
    
    // Change currency
    await currencySelect.selectOption('EUR');
    await expect(currencySelect).toHaveValue('EUR');
    
    // Currency symbols should update (this depends on your implementation)
    // You might need to wait for the data to refresh
    await page.waitForTimeout(1000);
  });

  test('should change year display', async ({ page }) => {
    const yearSelect = page.getByLabel('Year');
    
    // Get current year and previous year
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    // Change to previous year
    await yearSelect.selectOption(previousYear.toString());
    await expect(yearSelect).toHaveValue(previousYear.toString());
  });

  test('should refresh exchange rates', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: 'Refresh Rates' });
    
    // Click refresh button
    await refreshButton.click();
    
    // Button should be clickable (not disabled during refresh)
    await expect(refreshButton).toBeEnabled();
  });

  test('should display monthly analysis section', async ({ page }) => {
    await expect(page.getByText('Monthly Analysis')).toBeVisible();
    await expect(page.getByText('Year-to-Date Income')).toBeVisible();
    await expect(page.getByText('Year-to-Date Expenses')).toBeVisible();
    await expect(page.getByText('Year-to-Date Net Savings')).toBeVisible();
  });

  test('should display yearly comparison section', async ({ page }) => {
    await expect(page.getByText('5-Year Financial Overview')).toBeVisible();
    
    // Should show table headers
    await expect(page.getByText('Year')).toBeVisible();
    await expect(page.getByText('Total Income')).toBeVisible();
    await expect(page.getByText('Total Expenses')).toBeVisible();
    await expect(page.getByText('Net Savings')).toBeVisible();
    await expect(page.getByText('Savings Rate')).toBeVisible();
  });

  test('should display charts', async ({ page }) => {
    // Charts should be present (you might need to wait for them to load)
    await page.waitForTimeout(2000);
    
    // Look for chart containers or SVG elements
    const chartElements = page.locator('svg, canvas, .recharts-wrapper');
    await expect(chartElements.first()).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Key elements should still be visible
    await expect(page.getByText('Current Financial Position')).toBeVisible();
    await expect(page.getByText('Net Worth')).toBeVisible();
    
    // Controls should be accessible
    await expect(page.getByLabel('Currency')).toBeVisible();
    await expect(page.getByLabel('Year')).toBeVisible();
  });

  test('should handle loading states gracefully', async ({ page }) => {
    // On initial load, there might be loading indicators
    // This test ensures the page doesn't crash during loading
    
    // Wait for main content to load
    await expect(page.getByText('Current Financial Position')).toBeVisible();
    
    // No error messages should be visible
    await expect(page.getByText('Error')).not.toBeVisible();
    await expect(page.getByText('Failed')).not.toBeVisible();
  });
});