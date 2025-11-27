/**
 * Health Check Utilities
 *
 * System and dependency health checks.
 */

import { spawn } from 'child_process';
import { access } from 'fs/promises';

export interface HealthCheckResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  timestamp: string;
}

/**
 * Check if a command is available in PATH.
 */
async function checkCommand(
  command: string,
  args: string[] = ['--version'],
): Promise<{ available: boolean; version?: string; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args);
    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('error', (error) => {
      resolve({ available: false, error: error.message });
    });

    proc.on('close', (code) => {
      if (code === 0) {
        // Try to extract version
        const versionMatch = output.match(/(\d+\.\d+(?:\.\d+)?)/);
        resolve({
          available: true,
          version: versionMatch ? versionMatch[1] : undefined,
        });
      } else {
        resolve({
          available: false,
          error: errorOutput || `Exit code: ${code}`,
        });
      }
    });
  });
}

/**
 * Check FFmpeg availability and version.
 */
export async function checkFFmpeg(): Promise<HealthCheckResult> {
  const result = await checkCommand('ffmpeg', ['-version']);

  if (!result.available) {
    return {
      name: 'FFmpeg',
      status: 'error',
      message: 'FFmpeg is not installed or not in PATH',
      details: { error: result.error },
    };
  }

  // Check version
  if (result.version) {
    const major = parseInt(result.version.split('.')[0], 10);
    if (major < 6) {
      return {
        name: 'FFmpeg',
        status: 'warn',
        message: `FFmpeg ${result.version} found, but version 6.0+ is recommended`,
        details: { version: result.version },
      };
    }
  }

  return {
    name: 'FFmpeg',
    status: 'ok',
    message: `FFmpeg ${result.version ?? 'unknown version'} available`,
    details: { version: result.version },
  };
}

/**
 * Check ffprobe availability.
 */
export async function checkFFprobe(): Promise<HealthCheckResult> {
  const result = await checkCommand('ffprobe', ['-version']);

  if (!result.available) {
    return {
      name: 'ffprobe',
      status: 'error',
      message: 'ffprobe is not installed (usually comes with FFmpeg)',
      details: { error: result.error },
    };
  }

  return {
    name: 'ffprobe',
    status: 'ok',
    message: `ffprobe ${result.version ?? ''} available`,
    details: { version: result.version },
  };
}

/**
 * Check Node.js version.
 */
export async function checkNodeVersion(): Promise<HealthCheckResult> {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);

  if (major < 20) {
    return {
      name: 'Node.js',
      status: 'warn',
      message: `Node.js ${version} detected, version 20+ is recommended`,
      details: { version },
    };
  }

  return {
    name: 'Node.js',
    status: 'ok',
    message: `Node.js ${version}`,
    details: { version },
  };
}

/**
 * Check if Playwright browsers are installed.
 */
export async function checkPlaywrightBrowsers(): Promise<HealthCheckResult> {
  try {
    // Check if chromium is available
    const { chromium } = await import('playwright');

    // Try to get browser executable path
    const executablePath = chromium.executablePath();

    try {
      await access(executablePath);
      return {
        name: 'Playwright Browsers',
        status: 'ok',
        message: 'Chromium browser available',
        details: { executablePath },
      };
    } catch {
      return {
        name: 'Playwright Browsers',
        status: 'error',
        message: 'Playwright browsers not installed. Run: npx playwright install',
        details: { executablePath },
      };
    }
  } catch (error) {
    return {
      name: 'Playwright Browsers',
      status: 'error',
      message: 'Could not check Playwright browsers',
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

/**
 * Check available disk space.
 */
export async function checkDiskSpace(): Promise<HealthCheckResult> {
  try {
    const { execSync } = await import('child_process');

    // Get available space in the current directory
    const output = execSync('df -h .', { encoding: 'utf-8' });
    const lines = output.trim().split('\n');

    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      const available = parts[3];
      const usePercent = parts[4];

      const useNum = parseInt(usePercent, 10);
      if (useNum > 95) {
        return {
          name: 'Disk Space',
          status: 'error',
          message: `Low disk space: ${available} available (${usePercent} used)`,
          details: { available, usePercent },
        };
      } else if (useNum > 85) {
        return {
          name: 'Disk Space',
          status: 'warn',
          message: `Disk space warning: ${available} available (${usePercent} used)`,
          details: { available, usePercent },
        };
      }

      return {
        name: 'Disk Space',
        status: 'ok',
        message: `${available} available`,
        details: { available, usePercent },
      };
    }

    return {
      name: 'Disk Space',
      status: 'warn',
      message: 'Could not determine disk space',
    };
  } catch {
    return {
      name: 'Disk Space',
      status: 'warn',
      message: 'Could not check disk space',
    };
  }
}

/**
 * Check memory availability.
 */
export async function checkMemory(): Promise<HealthCheckResult> {
  const totalMemory = process.memoryUsage().heapTotal;
  const usedMemory = process.memoryUsage().heapUsed;
  const freeMemory = totalMemory - usedMemory;

  const totalMB = Math.round(totalMemory / 1024 / 1024);
  const usedMB = Math.round(usedMemory / 1024 / 1024);
  const freeMB = Math.round(freeMemory / 1024 / 1024);

  return {
    name: 'Memory',
    status: 'ok',
    message: `${freeMB}MB free of ${totalMB}MB heap`,
    details: { totalMB, usedMB, freeMB },
  };
}

/**
 * Run all health checks.
 */
export async function runHealthChecks(): Promise<SystemHealth> {
  const checks = await Promise.all([
    checkNodeVersion(),
    checkFFmpeg(),
    checkFFprobe(),
    checkPlaywrightBrowsers(),
    checkDiskSpace(),
    checkMemory(),
  ]);

  const hasError = checks.some((c) => c.status === 'error');
  const hasWarn = checks.some((c) => c.status === 'warn');

  return {
    overall: hasError ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy',
    checks,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Quick check for essential dependencies.
 */
export async function checkEssentials(): Promise<{
  ready: boolean;
  missing: string[];
}> {
  const ffmpeg = await checkFFmpeg();
  const ffprobe = await checkFFprobe();
  const browsers = await checkPlaywrightBrowsers();

  const missing: string[] = [];

  if (ffmpeg.status === 'error') missing.push('FFmpeg');
  if (ffprobe.status === 'error') missing.push('ffprobe');
  if (browsers.status === 'error') missing.push('Playwright browsers');

  return {
    ready: missing.length === 0,
    missing,
  };
}
