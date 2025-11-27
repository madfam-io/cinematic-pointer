import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';

import { Driver, Meta, Selector, Point, Region, Condition } from '../types';
import { resolveSelector } from '../utils/selector';
import { UesEmitter } from '../utils/ues-emitter';

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

export interface PlaywrightDriverOptions {
  browserType?: BrowserType;
  headless?: boolean;
  timeout?: number;
  speed?: number;
  emitter?: UesEmitter;
}

export class PlaywrightWebDriver implements Driver {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private meta: Meta | null = null;
  private options: PlaywrightDriverOptions;
  private emitter: UesEmitter | null = null;
  private startTime: number = 0;

  constructor(options: PlaywrightDriverOptions = {}) {
    this.options = {
      browserType: options.browserType ?? 'chromium',
      headless: options.headless ?? false,
      timeout: options.timeout ?? 30000,
      speed: options.speed ?? 1,
      emitter: options.emitter,
    };
    this.emitter = options.emitter ?? null;
  }

  private getTimestamp(): number {
    return Date.now() - this.startTime;
  }

  private emit(type: string, data: Record<string, unknown> = {}): void {
    if (this.emitter) {
      this.emitter.emit({
        ts: this.getTimestamp(),
        t: type,
        ...data,
      });
    }
  }

  async init(meta: Meta): Promise<void> {
    this.meta = meta;
    this.startTime = Date.now();

    const browserLauncher = {
      chromium,
      firefox,
      webkit,
    }[this.options.browserType!];

    this.browser = await browserLauncher.launch({
      headless: this.options.headless,
      slowMo: this.options.speed !== 1 ? Math.round(100 / this.options.speed!) : undefined,
    });

    this.context = await this.browser.newContext({
      viewport: {
        width: meta.viewport.w,
        height: meta.viewport.h,
      },
      deviceScaleFactor: meta.viewport.deviceScaleFactor ?? 1,
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.options.timeout!);

    this.emit('run.start', {
      data: {
        meta: {
          ...meta,
          canvas: meta.canvas ?? 'web',
        },
      },
    });
  }

  async goto(url: string): Promise<void> {
    if (!this.page) throw new Error('Driver not initialized');

    this.emit('navigation.start', { data: { url } });
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    this.emit('navigation.end', { data: { url } });
  }

  async resolveTarget(sel: Selector): Promise<Point | Region> {
    if (!this.page) throw new Error('Driver not initialized');

    const locator = resolveSelector(this.page, sel);
    const box = await locator.boundingBox();

    if (!box) {
      throw new Error(`Could not resolve bounding box for selector: ${JSON.stringify(sel)}`);
    }

    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };
  }

  async hover(sel: Selector): Promise<void> {
    if (!this.page) throw new Error('Driver not initialized');

    const locator = resolveSelector(this.page, sel);
    const box = await locator.boundingBox();

    if (box) {
      this.emit('cursor.move', {
        to: [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)],
        ease: 'inOutCubic',
      });
    }

    await locator.hover();
    this.emit('cursor.hover', { selector: sel });
  }

  async click(sel: Selector, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    if (!this.page) throw new Error('Driver not initialized');

    const locator = resolveSelector(this.page, sel);
    const box = await locator.boundingBox();

    if (box) {
      this.emit('cursor.move', {
        to: [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)],
        ease: 'inOutCubic',
      });
    }

    await locator.click({ button });

    this.emit('cursor.click', {
      button,
      target: { selector: sel },
    });
  }

  async fill(sel: Selector, text: string, mask?: boolean): Promise<void> {
    if (!this.page) throw new Error('Driver not initialized');

    const locator = resolveSelector(this.page, sel);
    await locator.fill(text);

    this.emit('input.fill', {
      selector: sel,
      text: mask ? '•'.repeat(text.length) : text,
      masked: mask ?? false,
    });
  }

  async press(key: string): Promise<void> {
    if (!this.page) throw new Error('Driver not initialized');

    await this.page.keyboard.press(key);
    this.emit('key.press', { key });
  }

  async scroll(
    to: 'top' | 'bottom' | 'center' | { x: number; y: number },
    durationMs?: number,
  ): Promise<void> {
    if (!this.page) throw new Error('Driver not initialized');

    let targetY: number;

    if (typeof to === 'object') {
      targetY = to.y;
    } else {
      const viewportHeight = this.meta?.viewport.h ?? 900;
      const scrollHeight = await this.page.evaluate('document.body.scrollHeight');

      switch (to) {
        case 'top':
          targetY = 0;
          break;
        case 'bottom':
          targetY = (scrollHeight as number) - viewportHeight;
          break;
        case 'center':
          targetY = ((scrollHeight as number) - viewportHeight) / 2;
          break;
      }
    }

    this.emit('scroll.start', { to, targetY });

    // Smooth scroll with duration using browser's smooth scroll behavior
    const duration = durationMs ?? 500;
    await this.page.evaluate(
      `(async () => {
        const targetY = ${targetY};
        const duration = ${duration};
        const startY = window.scrollY;
        const distance = targetY - startY;
        const startTime = performance.now();

        return new Promise((resolve) => {
          function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease in-out cubic
            const easeProgress =
              progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            window.scrollTo(0, startY + distance * easeProgress);

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              resolve();
            }
          }

          requestAnimationFrame(step);
        });
      })()`,
    );

    this.emit('scroll.end', { to, targetY });
  }

  async waitFor(cond: Condition, timeoutMs?: number): Promise<void> {
    if (!this.page) throw new Error('Driver not initialized');

    const timeout = timeoutMs ?? this.options.timeout!;

    this.emit('wait.start', { condition: cond });

    switch (cond.type) {
      case 'visible':
        if (cond.selector) {
          const locator = resolveSelector(this.page, cond.selector);
          await locator.waitFor({ state: 'visible', timeout });
        }
        break;

      case 'text':
        if (cond.selector && cond.text) {
          const locator = resolveSelector(this.page, cond.selector);
          // Wait for text to appear in the element
          await locator.filter({ hasText: cond.text }).waitFor({ state: 'visible', timeout });
        } else if (cond.text) {
          await this.page.waitForSelector(`text=${cond.text}`, { timeout });
        }
        break;

      case 'url':
        if (cond.url) {
          await this.page.waitForURL(cond.url, { timeout });
        }
        break;

      case 'networkIdle':
        await this.page.waitForLoadState('networkidle', { timeout });
        break;
    }

    this.emit('wait.end', { condition: cond });
  }

  async pause(ms: number): Promise<void> {
    this.emit('pause.start', { duration: ms });
    await new Promise((resolve) => setTimeout(resolve, ms));
    this.emit('pause.end', { duration: ms });
  }

  async screenshot(path: string): Promise<void> {
    if (!this.page) throw new Error('Driver not initialized');
    await this.page.screenshot({ path, fullPage: false });
  }

  async teardown(): Promise<void> {
    const duration = this.getTimestamp();
    this.emit('run.end', { data: { durationMs: duration } });

    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }

    this.page = null;
    this.context = null;
    this.browser = null;
  }

  getPage(): Page | null {
    return this.page;
  }

  getContext(): BrowserContext | null {
    return this.context;
  }
}
