/**
 * Cursor Overlay Module
 *
 * Provides cinematic cursor effects for browser automation recordings.
 * Includes custom cursor, trails, click ripples, and focus rings.
 */

import { Page } from 'playwright';

import { defaultConfig, generateOverlayScript, OverlayConfig } from './script';
import { defaultTheme, generateOverlayCSS, OverlayTheme } from './styles';

export { OverlayConfig, OverlayTheme, defaultConfig, defaultTheme };

export interface CursorOverlayOptions {
  theme?: Partial<OverlayTheme>;
  config?: Partial<OverlayConfig>;
}

/**
 * CursorOverlay
 *
 * Manages injection and control of cursor overlay effects in a Playwright page.
 */
export class CursorOverlay {
  private page: Page;
  private theme: OverlayTheme;
  private config: OverlayConfig;
  private injected: boolean = false;

  constructor(page: Page, options: CursorOverlayOptions = {}) {
    this.page = page;
    this.theme = { ...defaultTheme, ...options.theme };
    this.config = { ...defaultConfig, ...options.config };
  }

  /**
   * Inject the overlay CSS and JavaScript into the page.
   * Should be called after page navigation.
   */
  async inject(): Promise<void> {
    if (this.injected) return;

    // Inject CSS
    const css = generateOverlayCSS(this.theme);
    await this.page.addStyleTag({ content: css });

    // Inject JavaScript
    const script = generateOverlayScript(this.config);
    await this.page.addScriptTag({ content: script });

    this.injected = true;
  }

  /**
   * Create a click ripple effect at the specified coordinates.
   */
  async createRipple(x: number, y: number): Promise<void> {
    await this.page.evaluate(`
      if (window.__cpOverlay) {
        window.__cpOverlay.createRipple(${x}, ${y});
      }
    `);
  }

  /**
   * Create a beat marker effect at the specified coordinates.
   * Used for camera sync points.
   */
  async createBeat(x: number, y: number): Promise<void> {
    await this.page.evaluate(`
      if (window.__cpOverlay) {
        window.__cpOverlay.createBeat(${x}, ${y});
      }
    `);
  }

  /**
   * Update the focus ring to highlight an element.
   */
  async highlightElement(selector: string): Promise<void> {
    const escapedSelector = JSON.stringify(selector);
    await this.page.evaluate(`
      if (window.__cpOverlay) {
        const element = document.querySelector(${escapedSelector});
        window.__cpOverlay.updateFocusRing(element);
      }
    `);
  }

  /**
   * Clear the focus ring highlight.
   */
  async clearHighlight(): Promise<void> {
    await this.page.evaluate(`
      if (window.__cpOverlay) {
        window.__cpOverlay.updateFocusRing(null);
      }
    `);
  }

  /**
   * Programmatically set the cursor position.
   * Useful for simulating cursor movement in recordings.
   */
  async setCursorPosition(x: number, y: number): Promise<void> {
    await this.page.evaluate(`
      if (window.__cpOverlay) {
        window.__cpOverlay.setPosition(${x}, ${y});
      }
    `);
  }

  /**
   * Remove all overlay elements from the page.
   */
  async destroy(): Promise<void> {
    await this.page.evaluate(`
      if (window.__cpOverlay) {
        window.__cpOverlay.destroy();
      }
    `);
    this.injected = false;
  }

  /**
   * Check if the overlay is currently injected.
   */
  isInjected(): boolean {
    return this.injected;
  }
}

/**
 * Create and inject a cursor overlay into a page.
 * Convenience function for quick setup.
 */
export async function injectCursorOverlay(
  page: Page,
  options: CursorOverlayOptions = {},
): Promise<CursorOverlay> {
  const overlay = new CursorOverlay(page, options);
  await overlay.inject();
  return overlay;
}

/**
 * Auto-inject overlay on page navigation.
 * Sets up a listener to inject the overlay whenever the page navigates.
 */
export function setupAutoInject(page: Page, options: CursorOverlayOptions = {}): void {
  const css = generateOverlayCSS({ ...defaultTheme, ...options.theme });
  const script = generateOverlayScript({ ...defaultConfig, ...options.config });

  // Use addInitScript to run on every navigation
  page.addInitScript(`
    // Wait for DOM ready and inject overlay
    (function() {
      function injectOverlay() {
        // Inject CSS
        const style = document.createElement('style');
        style.textContent = ${JSON.stringify(css)};
        document.head.appendChild(style);

        // Inject script
        const scriptEl = document.createElement('script');
        scriptEl.textContent = ${JSON.stringify(script)};
        document.body.appendChild(scriptEl);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectOverlay);
      } else {
        injectOverlay();
      }
    })();
  `);
}
