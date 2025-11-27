/**
 * Validation Utilities
 *
 * Input validation and sanitization helpers.
 */

import { access } from 'fs/promises';
import path from 'path';

import { ValidationError, FileNotFoundError, DependencyError } from './errors';

/**
 * Validate that a file exists.
 */
export async function validateFileExists(filePath: string, description?: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new FileNotFoundError(filePath, {
      context: { description: description ?? 'file' },
    });
  }
}

/**
 * Validate that a path is a valid file path.
 */
export function validateFilePath(filePath: string, field: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new ValidationError(`${field} must be a valid file path`, { field });
  }

  const normalized = path.normalize(filePath);

  // Check for path traversal
  if (normalized.includes('..')) {
    // Allow relative paths but warn about traversal
  }

  return normalized;
}

/**
 * Validate a URL string.
 */
export function validateUrl(url: string, field: string): string {
  if (!url || typeof url !== 'string') {
    throw new ValidationError(`${field} must be a valid URL`, { field });
  }

  try {
    new globalThis.URL(url);
    return url;
  } catch {
    throw new ValidationError(`${field} is not a valid URL: ${url}`, { field });
  }
}

/**
 * Validate a positive number.
 */
export function validatePositiveNumber(
  value: unknown,
  field: string,
  options: { allowZero?: boolean; max?: number } = {},
): number {
  const num = Number(value);

  if (isNaN(num)) {
    throw new ValidationError(`${field} must be a number`, { field });
  }

  if (options.allowZero ? num < 0 : num <= 0) {
    throw new ValidationError(
      `${field} must be a positive number${options.allowZero ? ' or zero' : ''}`,
      { field },
    );
  }

  if (options.max !== undefined && num > options.max) {
    throw new ValidationError(`${field} must be at most ${options.max}`, { field });
  }

  return num;
}

/**
 * Validate a string is one of allowed values.
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  field: string,
): T {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`, { field });
  }

  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${field} must be one of: ${allowedValues.join(', ')}. Got: ${value}`,
      { field },
    );
  }

  return value as T;
}

/**
 * Validate an aspect ratio string.
 */
export function validateAspectRatio(value: string, field: string): string {
  const validAspects = ['16:9', '9:16', '1:1', '4:3', '21:9'];

  if (!validAspects.includes(value)) {
    throw new ValidationError(
      `${field} must be a valid aspect ratio: ${validAspects.join(', ')}. Got: ${value}`,
      { field },
    );
  }

  return value;
}

/**
 * Validate a viewport configuration.
 */
export function validateViewport(
  viewport: unknown,
  field: string,
): { w: number; h: number; deviceScaleFactor?: number } {
  if (!viewport || typeof viewport !== 'object') {
    throw new ValidationError(`${field} must be an object with w and h properties`, { field });
  }

  const v = viewport as Record<string, unknown>;

  const w = validatePositiveNumber(v.w, `${field}.w`);
  const h = validatePositiveNumber(v.h, `${field}.h`);

  const result: { w: number; h: number; deviceScaleFactor?: number } = { w, h };

  if (v.deviceScaleFactor !== undefined) {
    result.deviceScaleFactor = validatePositiveNumber(
      v.deviceScaleFactor,
      `${field}.deviceScaleFactor`,
    );
  }

  return result;
}

/**
 * Validate a selector object.
 */
export function validateSelector(selector: unknown, field: string): Record<string, string> {
  if (!selector || typeof selector !== 'object') {
    throw new ValidationError(`${field} must be a selector object`, { field });
  }

  const sel = selector as Record<string, unknown>;

  // Must have at least one identifying property
  const hasIdentifier = sel.role || sel.text || sel.placeholder || sel.value || sel.by;

  if (!hasIdentifier) {
    throw new ValidationError(
      `${field} must have at least one selector property (role, text, placeholder, value, or by)`,
      { field },
    );
  }

  // Validate by field if present
  if (sel.by) {
    validateEnum(
      sel.by,
      ['role', 'label', 'placeholder', 'testid', 'css', 'xpath', 'text'] as const,
      `${field}.by`,
    );
  }

  return sel as Record<string, string>;
}

/**
 * Validate a journey step.
 */
export function validateStep(step: unknown, index: number): void {
  if (!step || typeof step !== 'object') {
    throw new ValidationError(`Step ${index} must be an object`, { field: `steps[${index}]` });
  }

  const s = step as Record<string, unknown>;

  // Validate action
  validateEnum(
    s.action,
    [
      'click',
      'fill',
      'scroll',
      'hover',
      'press',
      'waitFor',
      'cameraMark',
      'pause',
      'navigate',
    ] as const,
    `steps[${index}].action`,
  );

  // Validate locator for actions that require it
  const actionsRequiringLocator = ['click', 'fill', 'hover', 'waitFor'];
  if (actionsRequiringLocator.includes(s.action as string) && !s.locator) {
    throw new ValidationError(`Step ${index} (${s.action}) requires a locator`, {
      field: `steps[${index}].locator`,
    });
  }

  // Validate text for fill action
  if (s.action === 'fill' && s.text === undefined) {
    throw new ValidationError(`Step ${index} (fill) requires a text value`, {
      field: `steps[${index}].text`,
    });
  }

  // Validate key for press action
  if (s.action === 'press' && !s.key) {
    throw new ValidationError(`Step ${index} (press) requires a key`, {
      field: `steps[${index}].key`,
    });
  }

  // Validate to for navigate action
  if (s.action === 'navigate' && !s.to) {
    throw new ValidationError(`Step ${index} (navigate) requires a "to" URL`, {
      field: `steps[${index}].to`,
    });
  }
}

/**
 * Validate a complete journey object.
 */
export function validateJourney(journey: unknown): void {
  if (!journey || typeof journey !== 'object') {
    throw new ValidationError('Journey must be an object');
  }

  const j = journey as Record<string, unknown>;

  // Validate meta
  if (!j.meta || typeof j.meta !== 'object') {
    throw new ValidationError('Journey must have a meta object', { field: 'meta' });
  }

  const meta = j.meta as Record<string, unknown>;
  if (!meta.name) {
    throw new ValidationError('Journey meta must have a name', { field: 'meta.name' });
  }

  validateViewport(meta.viewport, 'meta.viewport');

  // Validate start
  if (!j.start || typeof j.start !== 'object') {
    throw new ValidationError('Journey must have a start object', { field: 'start' });
  }

  const start = j.start as Record<string, unknown>;
  validateUrl(start.url as string, 'start.url');

  // Validate steps
  if (!Array.isArray(j.steps)) {
    throw new ValidationError('Journey must have a steps array', { field: 'steps' });
  }

  for (let i = 0; i < j.steps.length; i++) {
    validateStep(j.steps[i], i);
  }

  // Validate output
  if (!j.output || typeof j.output !== 'object') {
    throw new ValidationError('Journey must have an output object', { field: 'output' });
  }

  const output = j.output as Record<string, unknown>;
  validateEnum(output.preset, ['trailer', 'howto', 'teaser'] as const, 'output.preset');
  validateAspectRatio(output.aspect as string, 'output.aspect');
}

/**
 * Check FFmpeg availability and version.
 */
export async function validateFFmpegAvailable(): Promise<void> {
  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-version']);
    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('error', () => {
      reject(new DependencyError('ffmpeg', 'FFmpeg is not installed or not in PATH'));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new DependencyError('ffmpeg', 'FFmpeg is not working correctly'));
        return;
      }

      // Check version
      const match = output.match(/ffmpeg version (\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1], 10);
        if (major < 6) {
          reject(
            new DependencyError(
              'ffmpeg',
              `FFmpeg version ${major}.x is installed but version 6.0+ is required`,
            ),
          );
          return;
        }
      }

      resolve();
    });
  });
}
