import { mkdir } from 'fs/promises';
import path from 'path';

import { BrowserContext } from 'playwright';

import { Meta, Recorder, RecordingArtifacts, UesEvent } from '../types';
import { UesEmitter } from '../utils/ues-emitter';

export interface PlaywrightRecorderOptions {
  outputDir: string;
  videoSize?: { width: number; height: number };
}

/**
 * PlaywrightVideoRecorder
 *
 * Implements the Recorder interface using Playwright's built-in video capture.
 * Records browser sessions and manages video artifacts.
 */
export class PlaywrightVideoRecorder implements Recorder {
  private options: PlaywrightRecorderOptions;
  private context: BrowserContext | null = null;
  private meta: Meta | null = null;
  private emitter: UesEmitter | null = null;
  private videoDir: string;
  private startTime: number = 0;

  constructor(options: PlaywrightRecorderOptions) {
    this.options = options;
    this.videoDir = path.join(options.outputDir, 'raw');
  }

  /**
   * Get video recording options for Playwright context creation.
   * Call this before creating the browser context.
   */
  getContextOptions(): { recordVideo: { dir: string; size?: { width: number; height: number } } } {
    return {
      recordVideo: {
        dir: this.videoDir,
        size: this.options.videoSize ?? { width: 1920, height: 1080 },
      },
    };
  }

  async start(meta: Meta): Promise<void> {
    this.meta = meta;
    this.startTime = Date.now();

    // Ensure video directory exists
    await mkdir(this.videoDir, { recursive: true });

    // Initialize emitter for recording-specific events
    this.emitter = new UesEmitter(path.join(this.options.outputDir, 'recording-events.ndjson'), {
      inMemoryOnly: true,
    });
    await this.emitter.init(meta);

    this.emitter.emit({
      ts: 0,
      t: 'recording.start',
      data: {
        videoDir: this.videoDir,
        videoSize: this.options.videoSize ?? { width: 1920, height: 1080 },
      },
    });
  }

  /**
   * Set the browser context after it's created with video recording enabled.
   */
  setContext(context: BrowserContext): void {
    this.context = context;
  }

  mark(event: UesEvent): void {
    // Pass through events for overlay sync
    this.emitter?.emit({
      ...event,
      ts: Date.now() - this.startTime,
    });
  }

  async stop(): Promise<RecordingArtifacts> {
    const duration = Date.now() - this.startTime;

    this.emitter?.emit({
      ts: duration,
      t: 'recording.end',
      data: { durationMs: duration },
    });

    // Get the video path from the page
    let videoPath: string | undefined;
    const videoPaths: string[] = [];

    if (this.context) {
      const pages = this.context.pages();

      for (const page of pages) {
        const video = page.video();
        if (video) {
          try {
            const pagePath = await video.path();
            videoPaths.push(pagePath);
            if (!videoPath) {
              videoPath = pagePath;
            }
          } catch {
            // Video may not be available if page was closed
          }
        }
      }
    }

    return {
      videoPath,
      videoPaths: videoPaths.length > 0 ? videoPaths : undefined,
      eventsPath: path.join(this.options.outputDir, 'events.ndjson'),
      screenshotsPath: this.options.outputDir,
    };
  }

  getVideoDir(): string {
    return this.videoDir;
  }

  getMeta(): Meta | null {
    return this.meta;
  }
}

/**
 * Create video recording options for a given meta configuration.
 * Used to configure Playwright context with proper video dimensions.
 */
export function createVideoRecordingOptions(
  outputDir: string,
  meta: Meta,
): { recordVideo: { dir: string; size: { width: number; height: number } } } {
  const videoDir = path.join(outputDir, 'raw');

  // Use viewport size scaled up for higher quality if needed
  const scale = meta.viewport.deviceScaleFactor ?? 1;
  const width = Math.min(meta.viewport.w * scale, 1920);
  const height = Math.min(meta.viewport.h * scale, 1080);

  return {
    recordVideo: {
      dir: videoDir,
      size: { width, height },
    },
  };
}
