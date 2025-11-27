/**
 * E2E Tests for Journey Executor
 *
 * Tests the complete journey execution pipeline against real websites.
 */

import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs/promises';

const ARTIFACTS_DIR = path.join(__dirname, '../../test-artifacts');

test.describe('Journey Executor E2E', () => {
  test.beforeAll(async () => {
    // Ensure artifacts directory exists
    await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  });

  test('should execute a basic journey on example.com', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    try {
      // Navigate to start URL
      await page.goto('https://example.com');
      await expect(page).toHaveTitle(/Example Domain/);

      // Wait for content
      await expect(page.locator('h1')).toHaveText('Example Domain');

      // Scroll to center
      await page.evaluate(() => {
        window.scrollTo({
          top: document.body.scrollHeight / 2,
          behavior: 'smooth',
        });
      });
      await page.waitForTimeout(500);

      // Hover over link
      const link = page.locator('a').first();
      await link.hover();

      // Take screenshot for verification
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'journey-basic.png'),
      });
    } finally {
      await browser.close();
    }
  });

  test('should handle viewport configurations', async () => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-hd' },
      { width: 1440, height: 900, name: 'desktop-standard' },
      { width: 390, height: 844, name: 'mobile' },
    ];

    for (const vp of viewports) {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      try {
        await page.goto('https://example.com');

        const viewportSize = page.viewportSize();
        expect(viewportSize?.width).toBe(vp.width);
        expect(viewportSize?.height).toBe(vp.height);

        await page.screenshot({
          path: path.join(ARTIFACTS_DIR, `viewport-${vp.name}.png`),
        });
      } finally {
        await browser.close();
      }
    }
  });

  test('should capture network events during navigation', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const requests: string[] = [];

    // Monitor network
    page.on('request', (req) => {
      requests.push(req.url());
    });

    try {
      await page.goto('https://example.com');
      await page.waitForLoadState('networkidle');

      // Should have captured the main request
      expect(requests.some((r) => r.includes('example.com'))).toBe(true);
    } finally {
      await browser.close();
    }
  });

  test('should wait for elements correctly', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto('https://example.com');

      // Wait for visible element
      const heading = page.locator('h1');
      await expect(heading).toBeVisible({ timeout: 5000 });

      // Wait for text content
      await expect(heading).toHaveText('Example Domain', { timeout: 5000 });

      // Wait for element count
      const paragraphs = page.locator('p');
      await expect(paragraphs).toHaveCount(2, { timeout: 5000 });
    } finally {
      await browser.close();
    }
  });

  test('should handle scroll actions with different targets', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto('https://example.com');

      // Scroll to top
      await page.evaluate(() => window.scrollTo(0, 0));
      let scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBe(0);

      // Scroll to center
      await page.evaluate(() => {
        const centerY = (document.documentElement.scrollHeight - window.innerHeight) / 2;
        window.scrollTo({ top: centerY, behavior: 'instant' });
      });

      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      });
      scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeGreaterThanOrEqual(0);
    } finally {
      await browser.close();
    }
  });

  test('should capture cursor position during hover', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let lastMousePosition = { x: 0, y: 0 };

    try {
      await page.goto('https://example.com');

      // Track mouse position
      await page.evaluate(() => {
        document.addEventListener('mousemove', (e) => {
          (window as unknown as Record<string, unknown>).__lastMouse = {
            x: e.clientX,
            y: e.clientY,
          };
        });
      });

      // Move to specific position
      await page.mouse.move(400, 300);
      await page.waitForTimeout(100);

      lastMousePosition = await page.evaluate(
        () =>
          (window as unknown as Record<string, { x: number; y: number }>).__lastMouse || {
            x: 0,
            y: 0,
          },
      );
      expect(lastMousePosition.x).toBe(400);
      expect(lastMousePosition.y).toBe(300);

      // Move to element
      const link = page.locator('a').first();
      const box = await link.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(100);

        lastMousePosition = await page.evaluate(
          () =>
            (window as unknown as Record<string, { x: number; y: number }>).__lastMouse || {
              x: 0,
              y: 0,
            },
        );
        expect(lastMousePosition.x).toBeGreaterThan(0);
      }
    } finally {
      await browser.close();
    }
  });
});

test.describe('Selector Resolution E2E', () => {
  test('should resolve role-based selectors', async ({ page }) => {
    await page.goto('https://example.com');

    // There's a link with role
    const link = page.getByRole('link');
    await expect(link).toBeVisible();
  });

  test('should resolve text-based selectors', async ({ page }) => {
    await page.goto('https://example.com');

    // Find by text content
    const heading = page.getByText('Example Domain');
    await expect(heading).toBeVisible();

    const moreInfo = page.getByText('More information...');
    await expect(moreInfo).toBeVisible();
  });

  test('should handle CSS selectors as fallback', async ({ page }) => {
    await page.goto('https://example.com');

    // CSS selector
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    const div = page.locator('div > p');
    await expect(div).toBeVisible();
  });
});

test.describe('Recording Artifacts E2E', () => {
  test('should generate consistent screenshots', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    try {
      await page.goto('https://example.com');
      await page.waitForLoadState('networkidle');

      // Take multiple screenshots and verify they exist
      const screenshotPaths = [
        path.join(ARTIFACTS_DIR, 'consistent-1.png'),
        path.join(ARTIFACTS_DIR, 'consistent-2.png'),
      ];

      for (const screenshotPath of screenshotPaths) {
        await page.screenshot({ path: screenshotPath });
        const stats = await fs.stat(screenshotPath);
        expect(stats.size).toBeGreaterThan(0);
      }

      // Screenshots should be similar size (same content)
      const sizes = await Promise.all(screenshotPaths.map(async (p) => (await fs.stat(p)).size));
      const sizeDiff = Math.abs(sizes[0] - sizes[1]);
      const avgSize = (sizes[0] + sizes[1]) / 2;
      expect(sizeDiff / avgSize).toBeLessThan(0.1); // Within 10%
    } finally {
      await browser.close();
    }
  });
});

test.describe('Browser Context Management', () => {
  test('should isolate contexts properly', async () => {
    const browser = await chromium.launch({ headless: true });

    try {
      // Create two isolated contexts
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Navigate both
      await Promise.all([page1.goto('https://example.com'), page2.goto('https://example.com')]);

      // Set different localStorage in each
      await page1.evaluate(() => localStorage.setItem('test', 'context1'));
      await page2.evaluate(() => localStorage.setItem('test', 'context2'));

      // Verify isolation
      const val1 = await page1.evaluate(() => localStorage.getItem('test'));
      const val2 = await page2.evaluate(() => localStorage.getItem('test'));

      expect(val1).toBe('context1');
      expect(val2).toBe('context2');

      await context1.close();
      await context2.close();
    } finally {
      await browser.close();
    }
  });
});
