import { test, expect } from '@playwright/test';

test.describe('Example Journey E2E', () => {
  test('should navigate to example.com', async ({ page }) => {
    await page.goto('https://example.com');
    
    await expect(page).toHaveTitle(/Example Domain/);
    
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Example Domain');
    
    const paragraph = page.locator('p').first();
    await expect(paragraph).toBeVisible();
  });

  test('should handle scroll actions', async ({ page }) => {
    await page.goto('https://example.com');
    
    const initialScroll = await page.evaluate(() => window.scrollY);
    expect(initialScroll).toBe(0);
    
    await page.evaluate(() => {
      window.scrollTo({
        top: document.body.scrollHeight / 2,
        behavior: 'smooth'
      });
    });
    
    await page.waitForTimeout(1500);
    
    const finalScroll = await page.evaluate(() => window.scrollY);
    expect(finalScroll).toBeGreaterThan(0);
  });
});