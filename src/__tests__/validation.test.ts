import { mkdir, writeFile, rm } from 'fs/promises';
import path from 'path';

import {
  validateFileExists,
  validateFilePath,
  validateUrl,
  validatePositiveNumber,
  validateEnum,
  validateAspectRatio,
  validateViewport,
  validateSelector,
  validateStep,
  validateJourney,
} from '../utils/validation';
import { ValidationError, FileNotFoundError } from '../utils/errors';

describe('Validation Utilities', () => {
  const testDir = path.join(__dirname, '.test-validation');

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    await writeFile(path.join(testDir, 'exists.txt'), 'content');
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('validateFileExists', () => {
    it('should pass for existing file', async () => {
      await expect(validateFileExists(path.join(testDir, 'exists.txt'))).resolves.toBeUndefined();
    });

    it('should throw FileNotFoundError for missing file', async () => {
      await expect(validateFileExists(path.join(testDir, 'missing.txt'))).rejects.toThrow(
        FileNotFoundError,
      );
    });
  });

  describe('validateFilePath', () => {
    it('should validate valid path', () => {
      expect(validateFilePath('/path/to/file.txt', 'input')).toBe('/path/to/file.txt');
    });

    it('should normalize path', () => {
      expect(validateFilePath('/path//to/./file.txt', 'input')).toBe('/path/to/file.txt');
    });

    it('should throw for empty path', () => {
      expect(() => validateFilePath('', 'input')).toThrow(ValidationError);
    });

    it('should throw for non-string path', () => {
      expect(() => validateFilePath(null as unknown as string, 'input')).toThrow(ValidationError);
    });
  });

  describe('validateUrl', () => {
    it('should validate valid URLs', () => {
      expect(validateUrl('https://example.com', 'url')).toBe('https://example.com');
      expect(validateUrl('http://localhost:3000/path', 'url')).toBe('http://localhost:3000/path');
    });

    it('should throw for invalid URL', () => {
      expect(() => validateUrl('not-a-url', 'url')).toThrow(ValidationError);
    });

    it('should throw for empty URL', () => {
      expect(() => validateUrl('', 'url')).toThrow(ValidationError);
    });
  });

  describe('validatePositiveNumber', () => {
    it('should validate positive numbers', () => {
      expect(validatePositiveNumber(5, 'value')).toBe(5);
      expect(validatePositiveNumber('10', 'value')).toBe(10);
      expect(validatePositiveNumber(0.5, 'value')).toBe(0.5);
    });

    it('should reject zero by default', () => {
      expect(() => validatePositiveNumber(0, 'value')).toThrow(ValidationError);
    });

    it('should allow zero when allowZero is true', () => {
      expect(validatePositiveNumber(0, 'value', { allowZero: true })).toBe(0);
    });

    it('should reject negative numbers', () => {
      expect(() => validatePositiveNumber(-5, 'value')).toThrow(ValidationError);
      expect(() => validatePositiveNumber(-1, 'value', { allowZero: true })).toThrow(
        ValidationError,
      );
    });

    it('should reject NaN', () => {
      expect(() => validatePositiveNumber('not a number', 'value')).toThrow(ValidationError);
    });

    it('should enforce max value', () => {
      expect(validatePositiveNumber(5, 'value', { max: 10 })).toBe(5);
      expect(() => validatePositiveNumber(15, 'value', { max: 10 })).toThrow(ValidationError);
    });
  });

  describe('validateEnum', () => {
    it('should validate allowed values', () => {
      expect(validateEnum('a', ['a', 'b', 'c'] as const, 'field')).toBe('a');
    });

    it('should throw for non-string', () => {
      expect(() => validateEnum(123, ['a', 'b'] as const, 'field')).toThrow(ValidationError);
    });

    it('should throw for unallowed value', () => {
      expect(() => validateEnum('d', ['a', 'b', 'c'] as const, 'field')).toThrow(ValidationError);
    });
  });

  describe('validateAspectRatio', () => {
    it('should validate standard aspect ratios', () => {
      expect(validateAspectRatio('16:9', 'aspect')).toBe('16:9');
      expect(validateAspectRatio('9:16', 'aspect')).toBe('9:16');
      expect(validateAspectRatio('1:1', 'aspect')).toBe('1:1');
      expect(validateAspectRatio('4:3', 'aspect')).toBe('4:3');
      expect(validateAspectRatio('21:9', 'aspect')).toBe('21:9');
    });

    it('should throw for invalid aspect ratio', () => {
      expect(() => validateAspectRatio('invalid', 'aspect')).toThrow(ValidationError);
      expect(() => validateAspectRatio('3:2', 'aspect')).toThrow(ValidationError);
    });
  });

  describe('validateViewport', () => {
    it('should validate viewport with w and h', () => {
      const result = validateViewport({ w: 1920, h: 1080 }, 'viewport');
      expect(result.w).toBe(1920);
      expect(result.h).toBe(1080);
    });

    it('should validate viewport with deviceScaleFactor', () => {
      const result = validateViewport({ w: 1920, h: 1080, deviceScaleFactor: 2 }, 'viewport');
      expect(result.deviceScaleFactor).toBe(2);
    });

    it('should throw for non-object', () => {
      expect(() => validateViewport(null, 'viewport')).toThrow(ValidationError);
      expect(() => validateViewport('string', 'viewport')).toThrow(ValidationError);
    });

    it('should throw for missing dimensions', () => {
      expect(() => validateViewport({ w: 1920 }, 'viewport')).toThrow(ValidationError);
      expect(() => validateViewport({ h: 1080 }, 'viewport')).toThrow(ValidationError);
    });
  });

  describe('validateSelector', () => {
    it('should validate selector with role', () => {
      expect(validateSelector({ role: 'button' }, 'sel')).toEqual({ role: 'button' });
    });

    it('should validate selector with text', () => {
      expect(validateSelector({ text: 'Click me' }, 'sel')).toEqual({ text: 'Click me' });
    });

    it('should validate selector with placeholder', () => {
      expect(validateSelector({ placeholder: 'Enter name' }, 'sel')).toEqual({
        placeholder: 'Enter name',
      });
    });

    it('should validate selector with by field', () => {
      expect(validateSelector({ by: 'css', value: '.class' }, 'sel')).toEqual({
        by: 'css',
        value: '.class',
      });
    });

    it('should throw for empty selector', () => {
      expect(() => validateSelector({}, 'sel')).toThrow(ValidationError);
    });

    it('should throw for non-object', () => {
      expect(() => validateSelector(null, 'sel')).toThrow(ValidationError);
      expect(() => validateSelector('string', 'sel')).toThrow(ValidationError);
    });

    it('should validate by field values', () => {
      expect(() => validateSelector({ by: 'invalid' }, 'sel')).toThrow(ValidationError);
    });
  });

  describe('validateStep', () => {
    it('should validate click step', () => {
      expect(() => validateStep({ action: 'click', locator: { role: 'button' } }, 0)).not.toThrow();
    });

    it('should validate fill step', () => {
      expect(() =>
        validateStep({ action: 'fill', locator: { placeholder: 'Name' }, text: 'John' }, 0),
      ).not.toThrow();
    });

    it('should validate press step', () => {
      expect(() => validateStep({ action: 'press', key: 'Enter' }, 0)).not.toThrow();
    });

    it('should validate pause step', () => {
      expect(() => validateStep({ action: 'pause', durationMs: 1000 }, 0)).not.toThrow();
    });

    it('should validate cameraMark step', () => {
      expect(() => validateStep({ action: 'cameraMark' }, 0)).not.toThrow();
    });

    it('should validate scroll step', () => {
      expect(() => validateStep({ action: 'scroll', to: { y: 500 } }, 0)).not.toThrow();
    });

    it('should validate navigate step', () => {
      expect(() =>
        validateStep({ action: 'navigate', to: 'https://example.com' }, 0),
      ).not.toThrow();
    });

    it('should throw for invalid action', () => {
      expect(() => validateStep({ action: 'invalid' }, 0)).toThrow(ValidationError);
    });

    it('should throw for missing locator on click', () => {
      expect(() => validateStep({ action: 'click' }, 0)).toThrow(ValidationError);
    });

    it('should throw for missing text on fill', () => {
      expect(() => validateStep({ action: 'fill', locator: { role: 'textbox' } }, 0)).toThrow(
        ValidationError,
      );
    });

    it('should throw for missing key on press', () => {
      expect(() => validateStep({ action: 'press' }, 0)).toThrow(ValidationError);
    });

    it('should throw for missing to on navigate', () => {
      expect(() => validateStep({ action: 'navigate' }, 0)).toThrow(ValidationError);
    });

    it('should throw for non-object step', () => {
      expect(() => validateStep(null, 0)).toThrow(ValidationError);
    });
  });

  describe('validateJourney', () => {
    const validJourney = {
      meta: {
        name: 'Test Journey',
        viewport: { w: 1920, h: 1080 },
      },
      start: {
        url: 'https://example.com',
      },
      steps: [
        { action: 'click', locator: { role: 'button', name: 'Submit' } },
        { action: 'pause', durationMs: 1000 },
      ],
      output: {
        preset: 'trailer',
        aspect: '16:9',
      },
    };

    it('should validate complete journey', () => {
      expect(() => validateJourney(validJourney)).not.toThrow();
    });

    it('should throw for non-object', () => {
      expect(() => validateJourney(null)).toThrow(ValidationError);
      expect(() => validateJourney('string')).toThrow(ValidationError);
    });

    it('should throw for missing meta', () => {
      const invalid = { ...validJourney, meta: undefined };
      expect(() => validateJourney(invalid)).toThrow(ValidationError);
    });

    it('should throw for missing meta.name', () => {
      const invalid = { ...validJourney, meta: { viewport: { w: 1920, h: 1080 } } };
      expect(() => validateJourney(invalid)).toThrow(ValidationError);
    });

    it('should throw for missing start', () => {
      const invalid = { ...validJourney, start: undefined };
      expect(() => validateJourney(invalid)).toThrow(ValidationError);
    });

    it('should throw for invalid start.url', () => {
      const invalid = { ...validJourney, start: { url: 'not-a-url' } };
      expect(() => validateJourney(invalid)).toThrow(ValidationError);
    });

    it('should throw for non-array steps', () => {
      const invalid = { ...validJourney, steps: 'not-an-array' };
      expect(() => validateJourney(invalid)).toThrow(ValidationError);
    });

    it('should throw for missing output', () => {
      const invalid = { ...validJourney, output: undefined };
      expect(() => validateJourney(invalid)).toThrow(ValidationError);
    });

    it('should throw for invalid output.preset', () => {
      const invalid = { ...validJourney, output: { preset: 'invalid', aspect: '16:9' } };
      expect(() => validateJourney(invalid)).toThrow(ValidationError);
    });

    it('should throw for invalid output.aspect', () => {
      const invalid = { ...validJourney, output: { preset: 'trailer', aspect: 'invalid' } };
      expect(() => validateJourney(invalid)).toThrow(ValidationError);
    });
  });
});
