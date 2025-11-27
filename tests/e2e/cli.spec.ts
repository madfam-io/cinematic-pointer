/**
 * E2E Tests for CLI Commands
 *
 * Tests the command-line interface functionality.
 */

import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);
const ROOT_DIR = path.join(__dirname, '../..');
const CLI_PATH = path.join(ROOT_DIR, 'dist/cli.js');

async function runCli(args: string): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execAsync(`node ${CLI_PATH} ${args}`, {
      cwd: ROOT_DIR,
      timeout: 30000,
    });
    return { stdout, stderr, code: 0 };
  } catch (error) {
    const execError = error as { stdout: string; stderr: string; code: number };
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || '',
      code: execError.code || 1,
    };
  }
}

test.describe('CLI Commands E2E', () => {
  test.beforeAll(async () => {
    // Ensure CLI is built
    try {
      await fs.access(CLI_PATH);
    } catch {
      await execAsync('npm run build', { cwd: ROOT_DIR });
    }
  });

  test('should show help message', async () => {
    const result = await runCli('--help');

    expect(result.stdout).toContain('cinematic-pointer');
    expect(result.stdout).toContain('run');
    expect(result.stdout).toContain('cut');
    expect(result.stdout).toContain('reframe');
    expect(result.code).toBe(0);
  });

  test('should show version', async () => {
    const result = await runCli('--version');

    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    expect(result.code).toBe(0);
  });

  test('should show run command help', async () => {
    const result = await runCli('run --help');

    expect(result.stdout).toContain('journey');
    expect(result.stdout).toContain('--browser');
    expect(result.stdout).toContain('--recorder');
    expect(result.stdout).toContain('--out');
    expect(result.code).toBe(0);
  });

  test('should show cut command help', async () => {
    const result = await runCli('cut --help');

    expect(result.stdout).toContain('video');
    expect(result.stdout).toContain('events');
    expect(result.stdout).toContain('--template');
    expect(result.code).toBe(0);
  });

  test('should show reframe command help', async () => {
    const result = await runCli('reframe --help');

    expect(result.stdout).toContain('video');
    expect(result.stdout).toContain('--aspect');
    expect(result.code).toBe(0);
  });

  test('should show doctor command help', async () => {
    const result = await runCli('doctor --help');

    expect(result.stdout).toContain('health');
    expect(result.stdout).toContain('--json');
    expect(result.code).toBe(0);
  });

  test('should fail gracefully with missing journey file', async () => {
    const result = await runCli('run nonexistent.json');

    expect(result.code).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/not found|does not exist|ENOENT/i);
  });

  test('should fail gracefully with invalid journey file', async () => {
    // Create temporary invalid journey file
    const tempFile = path.join(ROOT_DIR, 'test-invalid-journey.json');
    await fs.writeFile(tempFile, '{ invalid json }');

    try {
      const result = await runCli(`run ${tempFile}`);

      expect(result.code).not.toBe(0);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  });
});

test.describe('CLI Validation E2E', () => {
  test('should validate aspect ratio values', async () => {
    const result = await runCli('reframe video.mp4 --aspect=invalid');

    expect(result.code).not.toBe(0);
  });

  test('should validate browser option', async () => {
    const tempFile = path.join(ROOT_DIR, 'journeys/example.cinematicpointer.json');

    // This should fail but validate browser option is accepted
    const result = await runCli(`run ${tempFile} --browser=invalid`);

    // May fail for other reasons, but browser option should be parsed
    expect(result.stdout + result.stderr).not.toContain('Unknown option');
  });
});

test.describe('CLI Output E2E', () => {
  test('doctor command should produce output', async () => {
    const result = await runCli('doctor');

    // Should have some output regardless of health status
    expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
  });

  test('doctor command json output should be valid JSON', async () => {
    const result = await runCli('doctor --json');

    // If there's stdout, it should be valid JSON
    if (result.stdout.trim()) {
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    }
  });
});
