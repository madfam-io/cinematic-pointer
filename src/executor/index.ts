import { mkdir } from 'fs/promises';
import path from 'path';

import { PlaywrightWebDriver, BrowserType } from '../drivers/playwright';
import { Journey, JourneyStep, Condition, RecordingArtifacts } from '../types';
import { UesEmitter } from '../utils/ues-emitter';

export interface ExecutorOptions {
  browserType?: BrowserType;
  headless?: boolean;
  timeout?: number;
  retries?: number;
  speed?: number;
  outputDir?: string;
  enableRecording?: boolean;
  enableOverlay?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  duration: number;
  stepsExecuted: number;
  stepsFailed: number;
  artifacts: RecordingArtifacts;
  errors: Array<{ step: number; error: string }>;
}

export interface StepCallback {
  onStepStart?: (step: JourneyStep, index: number) => void;
  onStepComplete?: (step: JourneyStep, index: number) => void;
  onStepError?: (step: JourneyStep, index: number, error: Error) => void;
}

/**
 * Journey Executor
 *
 * Parses journey DSL files and dispatches steps to the driver.
 * Coordinates recording and UES event emission.
 */
export class JourneyExecutor {
  private options: Required<ExecutorOptions>;
  private driver: PlaywrightWebDriver | null = null;
  private emitter: UesEmitter | null = null;
  private callbacks: StepCallback = {};

  constructor(options: ExecutorOptions = {}) {
    this.options = {
      browserType: options.browserType ?? 'chromium',
      headless: options.headless ?? false,
      timeout: options.timeout ?? 30000,
      retries: options.retries ?? 3,
      speed: options.speed ?? 1,
      outputDir: options.outputDir ?? 'artifacts',
      enableRecording: options.enableRecording ?? true,
      enableOverlay: options.enableOverlay ?? true, // Enable by default for cinematic effect
    };
  }

  setCallbacks(callbacks: StepCallback): void {
    this.callbacks = callbacks;
  }

  async execute(journey: Journey): Promise<ExecutionResult> {
    const startTime = Date.now();
    const errors: Array<{ step: number; error: string }> = [];
    let stepsExecuted = 0;
    let stepsFailed = 0;

    // Setup output directories
    const rawDir = path.join(this.options.outputDir, 'raw');
    const eventsPath = path.join(this.options.outputDir, 'events.ndjson');
    await mkdir(rawDir, { recursive: true });

    // Initialize emitter
    this.emitter = new UesEmitter(eventsPath);
    const meta = {
      ...journey.meta,
      journeyId: journey.meta.name.toLowerCase().replace(/\s+/g, '-'),
      runId: crypto.randomUUID(),
      brandTheme: journey.output.preset,
    };
    await this.emitter.init(meta);

    // Initialize driver with recording and overlay options
    this.driver = new PlaywrightWebDriver({
      browserType: this.options.browserType,
      headless: this.options.headless,
      timeout: this.options.timeout,
      speed: this.options.speed,
      emitter: this.emitter,
      recording: this.options.enableRecording
        ? {
            enabled: true,
            outputDir: this.options.outputDir,
          }
        : undefined,
      overlay: this.options.enableOverlay
        ? {
            enabled: true,
          }
        : undefined,
    });

    let videoPath: string | undefined;

    try {
      await this.driver.init(meta);

      // Navigate to start URL
      await this.driver.goto(journey.start.url);

      // Execute steps
      for (let i = 0; i < journey.steps.length; i++) {
        const step = journey.steps[i];

        this.callbacks.onStepStart?.(step, i);

        let success = false;
        let lastError: Error | null = null;

        // Retry logic
        for (let attempt = 0; attempt < this.options.retries && !success; attempt++) {
          try {
            await this.executeStep(step, i);
            success = true;
            stepsExecuted++;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < this.options.retries - 1) {
              // Wait before retry with exponential backoff
              await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
            }
          }
        }

        if (success) {
          this.callbacks.onStepComplete?.(step, i);
        } else {
          stepsFailed++;
          errors.push({ step: i, error: lastError?.message ?? 'Unknown error' });
          this.callbacks.onStepError?.(step, i, lastError!);

          // Take failure screenshot
          try {
            const screenshotPath = path.join(this.options.outputDir, `failure_step_${i}.png`);
            await this.driver.screenshot(screenshotPath);
          } catch {
            // Ignore screenshot errors
          }

          // Continue to next step (don't abort entire journey)
        }
      }
    } finally {
      // Get video path before teardown (must be done while context is still open)
      if (this.options.enableRecording && this.driver) {
        try {
          videoPath = await this.driver.getVideoPath();
        } catch {
          // Video may not be available
        }
      }

      // Cleanup
      await this.driver?.teardown();
      await this.emitter?.close();
    }

    const duration = Date.now() - startTime;

    return {
      success: stepsFailed === 0,
      duration,
      stepsExecuted,
      stepsFailed,
      artifacts: {
        eventsPath,
        videoPath,
        screenshotsPath: this.options.outputDir,
      },
      errors,
    };
  }

  private async executeStep(step: JourneyStep, index: number): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    // Emit step start event
    this.emitter?.emit({
      ts: Date.now(),
      t: 'step.start',
      data: { index, action: step.action, comment: step.comment },
    });

    switch (step.action) {
      case 'navigate':
        if (step.to && typeof step.to === 'string') {
          await this.driver.goto(step.to);
        }
        break;

      case 'click':
        if (step.locator) {
          await this.driver.click(step.locator);
        }
        break;

      case 'fill':
        if (step.locator && step.text !== undefined) {
          await this.driver.fill(step.locator, step.text, step.mask);
        }
        break;

      case 'hover':
        if (step.locator) {
          await this.driver.hover(step.locator);
        }
        break;

      case 'scroll':
        await this.driver.scroll(
          step.to as 'top' | 'bottom' | 'center' | { x: number; y: number },
          step.durationMs,
        );
        break;

      case 'press':
        if (step.key) {
          await this.driver.press(step.key);
        }
        break;

      case 'waitFor':
        if (step.locator) {
          const condition: Condition = {
            type: 'visible',
            selector: step.locator,
          };
          await this.driver.waitFor(condition, step.timeoutMs);
        }
        break;

      case 'cameraMark': {
        // Camera marks emit events for post-production and optionally show visual beat
        const region = step.target ? await this.getTargetRegion(step.target) : null;

        this.emitter?.emit({
          ts: Date.now(),
          t: 'camera.mark',
          zoom: step.cinema?.zoom ?? 1,
          focus: region ? { region } : undefined,
          data: { durationMs: step.durationMs },
        });

        // Create visual beat marker at target center if overlay is enabled
        if (region && this.options.enableOverlay) {
          const centerX = region[0] + region[2] / 2;
          const centerY = region[1] + region[3] / 2;
          await this.driver.createBeat(centerX, centerY);
        }
        break;
      }

      case 'pause':
        if (step.durationMs) {
          await this.driver.pause(step.durationMs);
        }
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }

    // Emit caption if step has a comment
    if (step.comment) {
      this.emitter?.emit({
        ts: Date.now(),
        t: 'caption.set',
        text: step.comment,
      });
    }

    // Emit step end event
    this.emitter?.emit({
      ts: Date.now(),
      t: 'step.end',
      data: { index, action: step.action },
    });
  }

  private async getTargetRegion(selector: any): Promise<number[]> {
    if (!this.driver) return [0, 0, 100, 100];

    try {
      const region = await this.driver.resolveTarget(selector);
      if ('width' in region) {
        return [region.x, region.y, region.width, region.height];
      }
      return [region.x, region.y, 100, 100];
    } catch {
      return [0, 0, 100, 100];
    }
  }
}

/**
 * Convenience function to execute a journey from a file path.
 */
export async function executeJourneyFile(
  journeyPath: string,
  options: ExecutorOptions = {},
  callbacks?: StepCallback,
): Promise<ExecutionResult> {
  const { readFile } = await import('fs/promises');
  const content = await readFile(journeyPath, 'utf-8');
  const journey: Journey = JSON.parse(content);

  const executor = new JourneyExecutor(options);
  if (callbacks) {
    executor.setCallbacks(callbacks);
  }

  return executor.execute(journey);
}
