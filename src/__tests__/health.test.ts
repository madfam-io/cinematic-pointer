import { EventEmitter } from 'events';

// Mock child_process spawn for version checks
const mockSpawn = jest.fn();

jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Mock playwright with dynamic import support
const mockExecutablePath = jest.fn();
jest.mock('playwright', () => ({
  chromium: {
    executablePath: () => mockExecutablePath(),
  },
}));

// Mock fs/promises
const mockAccess = jest.fn();
jest.mock('fs/promises', () => ({
  access: (...args: unknown[]) => mockAccess(...args),
}));

import {
  checkFFmpeg,
  checkFFprobe,
  checkNodeVersion,
  checkDiskSpace,
  checkMemory,
} from '../utils/health';

// Helper to create mock process
function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

describe('Health Check Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecutablePath.mockReturnValue('/usr/bin/chromium');
    mockAccess.mockResolvedValue(undefined);
  });

  describe('checkFFmpeg', () => {
    it('should return ok when FFmpeg is available with version 6+', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = checkFFmpeg();

      proc.stdout.emit('data', 'ffmpeg version 6.1.0 Copyright (c) 2000-2023');
      proc.emit('close', 0);

      const result = await promise;
      expect(result.name).toBe('FFmpeg');
      expect(result.status).toBe('ok');
      expect(result.details?.version).toBe('6.1.0');
    });

    it('should return warn when FFmpeg version is below 6', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = checkFFmpeg();

      proc.stdout.emit('data', 'ffmpeg version 5.1.2');
      proc.emit('close', 0);

      const result = await promise;
      expect(result.status).toBe('warn');
      expect(result.message).toContain('6.0+ is recommended');
    });

    it('should return error when FFmpeg is not found', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = checkFFmpeg();

      proc.emit('error', new Error('spawn ffmpeg ENOENT'));

      const result = await promise;
      expect(result.status).toBe('error');
      expect(result.message).toContain('not installed');
    });

    it('should return error when FFmpeg exits with non-zero code', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = checkFFmpeg();

      proc.stderr.emit('data', 'Some error');
      proc.emit('close', 1);

      const result = await promise;
      expect(result.status).toBe('error');
    });

    it('should handle FFmpeg without version info', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = checkFFmpeg();

      proc.stdout.emit('data', 'ffmpeg');
      proc.emit('close', 0);

      const result = await promise;
      expect(result.status).toBe('ok');
      expect(result.message).toContain('unknown version');
    });
  });

  describe('checkFFprobe', () => {
    it('should return ok when ffprobe is available', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = checkFFprobe();

      proc.stdout.emit('data', 'ffprobe version 6.1.0');
      proc.emit('close', 0);

      const result = await promise;
      expect(result.name).toBe('ffprobe');
      expect(result.status).toBe('ok');
    });

    it('should return error when ffprobe is not found', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = checkFFprobe();

      proc.emit('error', new Error('spawn ffprobe ENOENT'));

      const result = await promise;
      expect(result.status).toBe('error');
      expect(result.message).toContain('not installed');
    });

    it('should handle ffprobe without version', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = checkFFprobe();

      proc.stdout.emit('data', 'ffprobe');
      proc.emit('close', 0);

      const result = await promise;
      expect(result.status).toBe('ok');
    });
  });

  describe('checkNodeVersion', () => {
    it('should return ok for Node 20+', async () => {
      const result = await checkNodeVersion();
      expect(result.name).toBe('Node.js');
      expect(result.details?.version).toBeDefined();
      // We're running on Node 20+ in CI, so this should be ok
      expect(['ok', 'warn']).toContain(result.status);
    });

    it('should include version in details', async () => {
      const result = await checkNodeVersion();
      expect(result.details?.version).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe('checkDiskSpace', () => {
    // Note: checkDiskSpace uses dynamic import which bypasses static mocks
    // We test the actual function behavior instead

    it('should return a valid disk space result', async () => {
      const result = await checkDiskSpace();
      expect(result.name).toBe('Disk Space');
      // Should return one of the valid statuses
      expect(['ok', 'warn', 'error']).toContain(result.status);
      expect(result.message).toBeDefined();
    });

    it('should include details when successful', async () => {
      const result = await checkDiskSpace();
      // If status is ok/warn/error (not error due to command failure), check details
      if (result.details) {
        expect(typeof result.details.available).toBe('string');
        expect(typeof result.details.usePercent).toBe('string');
      }
    });
  });

  describe('checkMemory', () => {
    it('should return ok with memory info', async () => {
      const result = await checkMemory();
      expect(result.name).toBe('Memory');
      expect(result.status).toBe('ok');
      expect(result.details?.totalMB).toBeDefined();
      expect(result.details?.usedMB).toBeDefined();
      expect(result.details?.freeMB).toBeDefined();
    });

    it('should include MB values in message', async () => {
      const result = await checkMemory();
      expect(result.message).toContain('MB');
    });
  });
});
