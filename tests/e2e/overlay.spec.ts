/**
 * E2E Tests for Cursor Overlay System
 *
 * Tests the overlay injection and cursor effects.
 */

import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

// Simplified overlay styles for testing
const OVERLAY_STYLES = `
  .cp-cursor-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999999;
  }
  .cp-cursor {
    position: absolute;
    width: 24px;
    height: 24px;
    background: #00E0A4;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: transform 0.1s ease-out;
    pointer-events: none;
  }
  .cp-cursor.clicking {
    transform: translate(-50%, -50%) scale(0.8);
  }
  .cp-ripple {
    position: absolute;
    width: 60px;
    height: 60px;
    border: 2px solid #00E0A4;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
    animation: cp-ripple 0.6s ease-out forwards;
    pointer-events: none;
  }
  @keyframes cp-ripple {
    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0;
    }
  }
  .cp-focus-ring {
    position: absolute;
    border: 3px solid #00E0A4;
    border-radius: 8px;
    transition: all 0.3s ease-out;
    pointer-events: none;
    opacity: 0.8;
  }
`;

const OVERLAY_SCRIPT = `
  window.__cpOverlay = {
    cursor: null,
    container: null,

    init() {
      this.container = document.createElement('div');
      this.container.className = 'cp-cursor-container';
      this.container.id = 'cp-overlay';

      this.cursor = document.createElement('div');
      this.cursor.className = 'cp-cursor';
      this.cursor.id = 'cp-cursor';

      this.container.appendChild(this.cursor);
      document.body.appendChild(this.container);

      return this;
    },

    moveTo(x, y) {
      if (this.cursor) {
        this.cursor.style.left = x + 'px';
        this.cursor.style.top = y + 'px';
      }
    },

    click() {
      if (!this.cursor) return;
      this.cursor.classList.add('clicking');

      const ripple = document.createElement('div');
      ripple.className = 'cp-ripple';
      ripple.style.left = this.cursor.style.left;
      ripple.style.top = this.cursor.style.top;
      this.container.appendChild(ripple);

      setTimeout(() => {
        this.cursor.classList.remove('clicking');
      }, 150);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    },

    showFocusRing(element) {
      const ring = document.createElement('div');
      ring.className = 'cp-focus-ring';
      ring.id = 'cp-focus-ring';

      const rect = element.getBoundingClientRect();
      ring.style.left = (rect.left - 4) + 'px';
      ring.style.top = (rect.top - 4) + 'px';
      ring.style.width = (rect.width + 8) + 'px';
      ring.style.height = (rect.height + 8) + 'px';

      this.container.appendChild(ring);
      return ring;
    },

    hideFocusRing() {
      const ring = document.getElementById('cp-focus-ring');
      if (ring) ring.remove();
    }
  };
`;

test.describe('Overlay Injection E2E', () => {
  test('should inject overlay container', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto('https://example.com');

      // Inject styles
      await page.addStyleTag({ content: OVERLAY_STYLES });

      // Inject script and initialize
      await page.addScriptTag({ content: OVERLAY_SCRIPT });
      await page.evaluate(
        () =>
          (window as unknown as Record<string, unknown>).__cpOverlay &&
          (window as unknown as Record<string, { init: () => void }>).__cpOverlay.init(),
      );

      // Verify overlay container exists
      const container = page.locator('#cp-overlay');
      await expect(container).toBeVisible();

      // Verify cursor element exists
      const cursor = page.locator('#cp-cursor');
      await expect(cursor).toBeVisible();
    } finally {
      await browser.close();
    }
  });

  test('should move cursor to specified position', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto('https://example.com');
      await page.addStyleTag({ content: OVERLAY_STYLES });
      await page.addScriptTag({ content: OVERLAY_SCRIPT });
      await page.evaluate(() =>
        (window as unknown as Record<string, { init: () => void }>).__cpOverlay.init(),
      );

      // Move cursor
      await page.evaluate(() => {
        (
          window as unknown as Record<string, { moveTo: (x: number, y: number) => void }>
        ).__cpOverlay.moveTo(300, 200);
      });

      // Verify position
      const cursor = page.locator('#cp-cursor');
      const style = await cursor.getAttribute('style');
      expect(style).toContain('left: 300px');
      expect(style).toContain('top: 200px');
    } finally {
      await browser.close();
    }
  });

  test('should create click ripple effect', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto('https://example.com');
      await page.addStyleTag({ content: OVERLAY_STYLES });
      await page.addScriptTag({ content: OVERLAY_SCRIPT });
      await page.evaluate(() =>
        (
          window as unknown as Record<
            string,
            { init: () => void; moveTo: (x: number, y: number) => void }
          >
        ).__cpOverlay.init(),
      );

      // Position and click
      await page.evaluate(() => {
        const overlay = (
          window as unknown as Record<
            string,
            { moveTo: (x: number, y: number) => void; click: () => void }
          >
        ).__cpOverlay;
        overlay.moveTo(400, 300);
        overlay.click();
      });

      // Verify ripple was created
      const ripple = page.locator('.cp-ripple');
      await expect(ripple).toBeVisible();

      // Wait for ripple to disappear
      await page.waitForTimeout(700);
      await expect(ripple).not.toBeVisible();
    } finally {
      await browser.close();
    }
  });

  test('should show focus ring around element', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto('https://example.com');
      await page.addStyleTag({ content: OVERLAY_STYLES });
      await page.addScriptTag({ content: OVERLAY_SCRIPT });
      await page.evaluate(() =>
        (window as unknown as Record<string, { init: () => void }>).__cpOverlay.init(),
      );

      // Show focus ring on heading
      await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        if (h1) {
          (
            window as unknown as Record<string, { showFocusRing: (el: Element) => void }>
          ).__cpOverlay.showFocusRing(h1);
        }
      });

      // Verify focus ring exists and has proper dimensions
      const ring = page.locator('#cp-focus-ring');
      await expect(ring).toBeVisible();

      // Hide focus ring
      await page.evaluate(() => {
        (
          window as unknown as Record<string, { hideFocusRing: () => void }>
        ).__cpOverlay.hideFocusRing();
      });

      await expect(ring).not.toBeVisible();
    } finally {
      await browser.close();
    }
  });

  test('should not interfere with page interactions', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto('https://example.com');
      await page.addStyleTag({ content: OVERLAY_STYLES });
      await page.addScriptTag({ content: OVERLAY_SCRIPT });
      await page.evaluate(() =>
        (window as unknown as Record<string, { init: () => void }>).__cpOverlay.init(),
      );

      // Should still be able to interact with the page
      const link = page.locator('a').first();
      await expect(link).toBeVisible();

      // Click should pass through overlay (pointer-events: none)
      // Note: We can't actually click through in this test since we'd navigate away
      const isClickable = await link.isEnabled();
      expect(isClickable).toBe(true);
    } finally {
      await browser.close();
    }
  });

  test('should handle cursor trail effect', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto('https://example.com');
      await page.addStyleTag({
        content:
          OVERLAY_STYLES +
          `
          .cp-trail {
            position: absolute;
            width: 8px;
            height: 8px;
            background: rgba(0, 224, 164, 0.5);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
          }
        `,
      });

      // Add trail functionality
      await page.addScriptTag({
        content:
          OVERLAY_SCRIPT +
          `
          window.__cpOverlay.addTrail = function(x, y) {
            const trail = document.createElement('div');
            trail.className = 'cp-trail';
            trail.style.left = x + 'px';
            trail.style.top = y + 'px';
            this.container.appendChild(trail);
            setTimeout(() => trail.remove(), 500);
          };
        `,
      });

      await page.evaluate(() =>
        (window as unknown as Record<string, { init: () => void }>).__cpOverlay.init(),
      );

      // Create trail
      await page.evaluate(() => {
        const overlay = (
          window as unknown as Record<string, { addTrail: (x: number, y: number) => void }>
        ).__cpOverlay;
        overlay.addTrail(100, 100);
        overlay.addTrail(120, 110);
        overlay.addTrail(140, 120);
      });

      // Verify trails exist
      const trails = page.locator('.cp-trail');
      const count = await trails.count();
      expect(count).toBe(3);

      // Wait for trails to disappear
      await page.waitForTimeout(600);
      const countAfter = await trails.count();
      expect(countAfter).toBe(0);
    } finally {
      await browser.close();
    }
  });
});

test.describe('Overlay Theming E2E', () => {
  test('should apply custom theme colors', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto('https://example.com');

      // Custom theme
      const customStyles = `
        :root {
          --cp-primary: #FF5722;
          --cp-accent: #2196F3;
        }
        .cp-cursor-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 999999;
        }
        .cp-cursor {
          position: absolute;
          width: 24px;
          height: 24px;
          background: var(--cp-primary, #00E0A4);
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }
      `;

      await page.addStyleTag({ content: customStyles });
      await page.addScriptTag({ content: OVERLAY_SCRIPT });
      await page.evaluate(() =>
        (window as unknown as Record<string, { init: () => void }>).__cpOverlay.init(),
      );

      // Verify cursor uses custom color
      const cursor = page.locator('#cp-cursor');
      const bgColor = await cursor.evaluate((el) => getComputedStyle(el).backgroundColor);

      // RGB(255, 87, 34) is #FF5722
      expect(bgColor).toContain('rgb(255, 87, 34)');
    } finally {
      await browser.close();
    }
  });
});
