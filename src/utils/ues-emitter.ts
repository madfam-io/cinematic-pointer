import { createWriteStream, WriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';

import { UesEvent, Meta } from '../types';

export interface UesMeta {
  canvas: 'web' | 'desktop';
  viewport: { w: number; h: number; deviceScaleFactor?: number };
  dpi?: number;
  screens?: number;
  journeyId?: string;
  runId?: string;
  brandTheme?: string;
}

/**
 * UES (Universal Event Schema) Emitter
 *
 * Writes timestamped events to an NDJSON file for use in post-production.
 * Events are OS-agnostic and can drive overlays, camera moves, captions, and diagnostics.
 */
export class UesEmitter {
  private stream: WriteStream | null = null;
  private filePath: string;
  private events: UesEvent[] = [];
  private meta: UesMeta | null = null;
  private inMemoryOnly: boolean;

  constructor(filePath: string, options?: { inMemoryOnly?: boolean }) {
    this.filePath = filePath;
    this.inMemoryOnly = options?.inMemoryOnly ?? false;
  }

  async init(meta: Meta): Promise<void> {
    this.meta = {
      canvas: meta.canvas ?? 'web',
      viewport: meta.viewport,
      dpi: meta.viewport.deviceScaleFactor ?? 1,
      screens: 1,
      journeyId: meta.journeyId,
      runId: meta.runId ?? crypto.randomUUID(),
      brandTheme: meta.brandTheme,
    };

    if (!this.inMemoryOnly) {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await mkdir(dir, { recursive: true });

      // Open write stream
      this.stream = createWriteStream(this.filePath, { flags: 'w' });

      // Write meta as first line
      this.writeLine({ meta: this.meta });
    }
  }

  private writeLine(data: unknown): void {
    if (this.stream) {
      this.stream.write(JSON.stringify(data) + '\n');
    }
  }

  emit(event: UesEvent): void {
    this.events.push(event);

    if (!this.inMemoryOnly && this.stream) {
      this.writeLine(event);
    }
  }

  /**
   * Emit a typed event with automatic timestamp.
   */
  emitTyped(type: string, data?: Record<string, unknown>, startTime?: number): void {
    const ts = startTime ? Date.now() - startTime : 0;
    this.emit({ ts, t: type, ...data });
  }

  getEvents(): UesEvent[] {
    return [...this.events];
  }

  getMeta(): UesMeta | null {
    return this.meta;
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.stream) {
        this.stream.end((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get all events as a complete UES document (for in-memory usage).
   */
  toDocument(): { meta: UesMeta | null; events: UesEvent[] } {
    return {
      meta: this.meta,
      events: this.events,
    };
  }

  /**
   * Write the complete document to a file (alternative to streaming).
   */
  async writeDocument(): Promise<void> {
    const { writeFile } = await import('fs/promises');
    const doc = this.toDocument();

    // Write as NDJSON (one JSON object per line)
    const lines = [
      JSON.stringify({ meta: doc.meta }),
      ...doc.events.map((e) => JSON.stringify(e)),
    ].join('\n');

    await writeFile(this.filePath, lines + '\n');
  }
}

/**
 * Parse a UES NDJSON file back into a document.
 */
export async function parseUesFile(
  filePath: string,
): Promise<{ meta: UesMeta; events: UesEvent[] }> {
  const { readFile } = await import('fs/promises');
  const content = await readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  let meta: UesMeta | null = null;
  const events: UesEvent[] = [];

  for (const line of lines) {
    const parsed = JSON.parse(line);

    if (parsed.meta) {
      meta = parsed.meta;
    } else if (parsed.t) {
      events.push(parsed as UesEvent);
    }
  }

  if (!meta) {
    throw new Error('UES file missing meta header');
  }

  return { meta, events };
}
