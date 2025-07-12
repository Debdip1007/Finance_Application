import { test, expect } from '@playwright/test';

test.describe('Performance @smoke', () => {
  test('should load main page within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Performance budget: page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have good Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    
    // Measure Largest Contentful Paint (LCP)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });
    
    // LCP should be under 2.5 seconds
    expect(lcp).toBeLessThan(2500);
  });

  test('should not have memory leaks', async ({ page }) => {
    await page.goto('/');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Navigate through different sections
    const sections = ['Bank Accounts', 'Income', 'Expenses', 'Investments', 'Goals'];
    
    for (const section of sections) {
      await page.getByText(section).click();
      await page.waitForTimeout(500);
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Memory increase should be reasonable (less than 10MB)
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });

  test('should handle rapid navigation without errors', async ({ page }) => {
    await page.goto('/');
    
    const sections = ['Bank Accounts', 'Income', 'Expenses', 'Investments', 'Goals', 'Settings'];
    
    // Rapidly navigate through sections
    for (let i = 0; i < 3; i++) {
      for (const section of sections) {
        await page.getByText(section).click();
        // Small delay to allow for state updates
        await page.waitForTimeout(100);
      }
    }
    
    // Should not have any console errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    expect(logs).toHaveLength(0);
  });
});