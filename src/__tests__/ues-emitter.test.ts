import { mkdir, rm, readFile } from 'fs/promises';
import path from 'path';

import { UesEmitter } from '../utils/ues-emitter';
import { Meta } from '../types';

describe('UesEmitter', () => {
  const testDir = path.join(__dirname, '.test-ues-emitter');

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const testMeta: Meta = {
    name: 'Test Journey',
    viewport: { w: 1920, h: 1080, deviceScaleFactor: 2 },
    journeyId: 'test-journey',
    runId: 'test-run-123',
    brandTheme: 'trailer',
  };

  describe('in-memory mode', () => {
    it('should initialize with meta', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      await emitter.init(testMeta);

      const meta = emitter.getMeta();
      expect(meta).toBeDefined();
      expect(meta?.canvas).toBe('web');
      expect(meta?.viewport.w).toBe(1920);
      expect(meta?.viewport.h).toBe(1080);
      expect(meta?.dpi).toBe(2);
      expect(meta?.journeyId).toBe('test-journey');
      expect(meta?.brandTheme).toBe('trailer');
    });

    it('should emit events', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      await emitter.init(testMeta);

      emitter.emit({ ts: 0, t: 'run.start', data: {} });
      emitter.emit({ ts: 100, t: 'cursor.move', to: [500, 300] });
      emitter.emit({ ts: 200, t: 'cursor.click', button: 'left' });

      const events = emitter.getEvents();
      expect(events).toHaveLength(3);
      expect(events[0].t).toBe('run.start');
      expect(events[1].t).toBe('cursor.move');
      expect(events[1].to).toEqual([500, 300]);
      expect(events[2].t).toBe('cursor.click');
    });

    it('should produce a complete document', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      await emitter.init(testMeta);

      emitter.emit({ ts: 0, t: 'run.start' });
      emitter.emit({ ts: 1000, t: 'run.end', data: { durationMs: 1000 } });

      const doc = emitter.toDocument();
      expect(doc.meta).toBeDefined();
      expect(doc.events).toHaveLength(2);
      expect(doc.events[0].ts).toBe(0);
      expect(doc.events[1].ts).toBe(1000);
    });

    it('should handle various event types', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      await emitter.init(testMeta);

      // Navigation event
      emitter.emit({ ts: 0, t: 'navigation.start', data: { url: 'https://example.com' } });

      // Cursor events
      emitter.emit({ ts: 100, t: 'cursor.move', to: [100, 200], ease: 'inOutCubic' });
      emitter.emit({
        ts: 200,
        t: 'cursor.click',
        button: 'left',
        target: { selector: { role: 'button', name: 'Submit' } },
      });

      // Input event
      emitter.emit({ ts: 300, t: 'input.fill', selector: { placeholder: 'Email' }, text: '••••' });

      // Camera mark
      emitter.emit({
        ts: 400,
        t: 'camera.mark',
        zoom: 1.5,
        focus: { region: [100, 200, 300, 100] },
      });

      // Caption
      emitter.emit({ ts: 500, t: 'caption.set', text: 'Welcome to our app' });

      const events = emitter.getEvents();
      expect(events).toHaveLength(6);

      expect(events[0].data?.url).toBe('https://example.com');
      expect(events[1].ease).toBe('inOutCubic');
      expect(events[2].target?.selector?.role).toBe('button');
      expect(events[3].text).toBe('••••');
      expect(events[4].zoom).toBe(1.5);
      expect(events[5].text).toBe('Welcome to our app');
    });
  });

  describe('close', () => {
    it('should close without error in memory mode', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      await emitter.init(testMeta);
      await expect(emitter.close()).resolves.toBeUndefined();
    });
  });

  describe('emitTyped', () => {
    it('should emit event with timestamp from startTime', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      await emitter.init(testMeta);

      const startTime = Date.now() - 500; // 500ms ago
      emitter.emitTyped('cursor.move', { to: [100, 200] }, startTime);

      const events = emitter.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].t).toBe('cursor.move');
      expect(events[0].to).toEqual([100, 200]);
      expect(events[0].ts).toBeGreaterThanOrEqual(500);
    });

    it('should emit event with ts=0 when no startTime', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      await emitter.init(testMeta);

      emitter.emitTyped('run.start');

      const events = emitter.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].t).toBe('run.start');
      expect(events[0].ts).toBe(0);
    });

    it('should include additional data in emitted event', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      await emitter.init(testMeta);

      emitter.emitTyped('custom.event', { foo: 'bar', count: 42 });

      const events = emitter.getEvents();
      expect(events[0].foo).toBe('bar');
      expect(events[0].count).toBe(42);
    });
  });

  describe('file mode (streaming)', () => {
    it('should write events to file', async () => {
      const filePath = path.join(testDir, 'stream-test.ndjson');
      const emitter = new UesEmitter(filePath);
      await emitter.init(testMeta);

      emitter.emit({ ts: 0, t: 'run.start' });
      emitter.emit({ ts: 100, t: 'cursor.move', to: [500, 300] });
      emitter.emit({ ts: 200, t: 'run.end' });

      await emitter.close();

      const content = await readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(4); // meta + 3 events
      expect(JSON.parse(lines[0]).meta).toBeDefined();
      expect(JSON.parse(lines[1]).t).toBe('run.start');
      expect(JSON.parse(lines[2]).t).toBe('cursor.move');
      expect(JSON.parse(lines[3]).t).toBe('run.end');
    });

    it('should create directory if it does not exist', async () => {
      const nestedDir = path.join(testDir, 'nested', 'deep', 'dir');
      const filePath = path.join(nestedDir, 'test.ndjson');
      const emitter = new UesEmitter(filePath);
      await emitter.init(testMeta);

      emitter.emit({ ts: 0, t: 'test.event' });
      await emitter.close();

      const content = await readFile(filePath, 'utf-8');
      expect(content).toContain('test.event');
    });
  });

  describe('toDocument', () => {
    it('should return complete document structure', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      await emitter.init(testMeta);

      emitter.emit({ ts: 0, t: 'run.start' });
      emitter.emit({ ts: 1000, t: 'run.end' });

      const doc = emitter.toDocument();

      expect(doc.meta).toBeDefined();
      expect(doc.meta?.viewport.w).toBe(1920);
      expect(doc.events).toHaveLength(2);
      expect(doc.events[0].t).toBe('run.start');
      expect(doc.events[1].t).toBe('run.end');
    });
  });

  describe('getEvents', () => {
    it('should return a copy of events array', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      await emitter.init(testMeta);

      emitter.emit({ ts: 0, t: 'test' });

      const events1 = emitter.getEvents();
      const events2 = emitter.getEvents();

      expect(events1).not.toBe(events2); // Different array instances
      expect(events1).toEqual(events2); // Same content
    });
  });

  describe('meta defaults', () => {
    it('should use default canvas when not provided', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      const metaWithoutCanvas: Meta = {
        name: 'Test',
        viewport: { w: 1920, h: 1080 },
      };
      await emitter.init(metaWithoutCanvas);

      expect(emitter.getMeta()?.canvas).toBe('web');
    });

    it('should use default deviceScaleFactor when not provided', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      const metaWithoutDpi: Meta = {
        name: 'Test',
        viewport: { w: 1920, h: 1080 },
      };
      await emitter.init(metaWithoutDpi);

      expect(emitter.getMeta()?.dpi).toBe(1);
    });

    it('should generate runId when not provided', async () => {
      const emitter = new UesEmitter('/tmp/test.ndjson', { inMemoryOnly: true });
      const metaWithoutRunId: Meta = {
        name: 'Test',
        viewport: { w: 1920, h: 1080 },
      };
      await emitter.init(metaWithoutRunId);

      expect(emitter.getMeta()?.runId).toBeDefined();
      expect(emitter.getMeta()?.runId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  // Note: writeDocument and parseUesFile use dynamic imports (await import('fs/promises'))
  // which require --experimental-vm-modules in Jest.
  // These functions are tested via integration tests rather than unit tests.
});
