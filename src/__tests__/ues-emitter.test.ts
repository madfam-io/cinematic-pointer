import { UesEmitter } from '../utils/ues-emitter';
import { Meta } from '../types';

describe('UesEmitter', () => {
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
});
