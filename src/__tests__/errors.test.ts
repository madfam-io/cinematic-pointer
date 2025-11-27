import {
  CinematicPointerError,
  ValidationError,
  FileNotFoundError,
  DependencyError,
  ExecutionError,
  TimeoutError,
  ConfigurationError,
  wrapError,
  getErrorMessage,
  isErrorType,
  createErrorHandler,
  assert,
  assertDefined,
} from '../utils/errors';

describe('Error Classes', () => {
  describe('CinematicPointerError', () => {
    it('should create error with message', () => {
      const error = new CinematicPointerError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('CinematicPointerError');
      expect(error.code).toBe('UNKNOWN_ERROR');
    });

    it('should create error with code', () => {
      const error = new CinematicPointerError('Test', { code: 'CUSTOM_CODE' });
      expect(error.code).toBe('CUSTOM_CODE');
    });

    it('should create error with context', () => {
      const error = new CinematicPointerError('Test', { context: { foo: 'bar' } });
      expect(error.context).toEqual({ foo: 'bar' });
    });

    it('should create error with cause', () => {
      const cause = new Error('Original');
      const error = new CinematicPointerError('Wrapped', { cause });
      expect(error.cause).toBe(cause);
    });

    it('should return user message', () => {
      const error = new CinematicPointerError('User message');
      expect(error.toUserMessage()).toBe('User message');
    });

    it('should return log object', () => {
      const cause = new Error('Cause');
      const error = new CinematicPointerError('Test', {
        code: 'TEST_CODE',
        context: { key: 'value' },
        cause,
      });
      const log = error.toLogObject();
      expect(log.name).toBe('CinematicPointerError');
      expect(log.code).toBe('TEST_CODE');
      expect(log.message).toBe('Test');
      expect(log.context).toEqual({ key: 'value' });
      expect(log.cause).toBe('Cause');
      expect(log.stack).toBeDefined();
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid value');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should include field', () => {
      const error = new ValidationError('Invalid', { field: 'username' });
      expect(error.field).toBe('username');
    });
  });

  describe('FileNotFoundError', () => {
    it('should create file not found error', () => {
      const error = new FileNotFoundError('/path/to/file');
      expect(error.name).toBe('FileNotFoundError');
      expect(error.code).toBe('FILE_NOT_FOUND');
      expect(error.path).toBe('/path/to/file');
      expect(error.message).toContain('/path/to/file');
    });

    it('should return user-friendly message', () => {
      const error = new FileNotFoundError('/missing/file.txt');
      const msg = error.toUserMessage();
      expect(msg).toContain('/missing/file.txt');
      expect(msg).toContain('check that the path is correct');
    });
  });

  describe('DependencyError', () => {
    it('should create dependency error', () => {
      const error = new DependencyError('nodejs');
      expect(error.name).toBe('DependencyError');
      expect(error.code).toBe('DEPENDENCY_ERROR');
      expect(error.dependency).toBe('nodejs');
    });

    it('should use custom message', () => {
      const error = new DependencyError('tool', 'Custom message');
      expect(error.message).toBe('Custom message');
    });

    it('should return ffmpeg-specific user message', () => {
      const error = new DependencyError('ffmpeg');
      const msg = error.toUserMessage();
      expect(msg).toContain('FFmpeg');
      expect(msg).toContain('ffmpeg.org');
    });

    it('should return generic user message for other deps', () => {
      const error = new DependencyError('custom-dep');
      const msg = error.toUserMessage();
      expect(msg).toContain('custom-dep');
      expect(msg).toContain('install');
    });
  });

  describe('ExecutionError', () => {
    it('should create execution error', () => {
      const error = new ExecutionError('Step failed');
      expect(error.name).toBe('ExecutionError');
      expect(error.code).toBe('EXECUTION_ERROR');
    });

    it('should include step and action', () => {
      const error = new ExecutionError('Click failed', { step: 3, action: 'click' });
      expect(error.step).toBe(3);
      expect(error.action).toBe('click');
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError('loading page', 5000);
      expect(error.name).toBe('TimeoutError');
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.operation).toBe('loading page');
      expect(error.timeoutMs).toBe(5000);
      expect(error.message).toContain('5000ms');
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new ConfigurationError('Invalid config');
      expect(error.name).toBe('ConfigurationError');
      expect(error.code).toBe('CONFIGURATION_ERROR');
    });
  });
});

describe('Error Utilities', () => {
  describe('wrapError', () => {
    it('should wrap Error instance', () => {
      const original = new Error('Original');
      const wrapped = wrapError(original, 'Wrapped message');
      expect(wrapped.message).toBe('Wrapped message');
      expect(wrapped.cause).toBe(original);
      expect(wrapped.code).toBe('WRAPPED_ERROR');
    });

    it('should wrap string error', () => {
      const wrapped = wrapError('String error', 'Wrapped');
      expect(wrapped.cause?.message).toBe('String error');
    });

    it('should preserve code from CinematicPointerError', () => {
      const original = new ValidationError('Invalid');
      const wrapped = wrapError(original, 'Wrapped');
      expect(wrapped.code).toBe('VALIDATION_ERROR');
    });

    it('should merge context', () => {
      const original = new CinematicPointerError('Test', { context: { a: 1 } });
      const wrapped = wrapError(original, 'Wrapped', { b: 2 });
      expect(wrapped.context).toEqual({ a: 1, b: 2 });
    });
  });

  describe('getErrorMessage', () => {
    it('should get message from Error', () => {
      expect(getErrorMessage(new Error('Test'))).toBe('Test');
    });

    it('should return string directly', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should convert other types to string', () => {
      expect(getErrorMessage(123)).toBe('123');
      expect(getErrorMessage({ foo: 'bar' })).toBe('[object Object]');
    });
  });

  describe('isErrorType', () => {
    it('should detect correct error type', () => {
      const error = new ValidationError('Test');
      expect(isErrorType(error, ValidationError)).toBe(true);
      expect(isErrorType(error, FileNotFoundError)).toBe(false);
    });

    it('should work with base class', () => {
      const error = new ValidationError('Test');
      expect(isErrorType(error, CinematicPointerError)).toBe(true);
    });

    it('should return false for non-errors', () => {
      expect(isErrorType('not an error', ValidationError)).toBe(false);
    });
  });

  describe('createErrorHandler', () => {
    it('should create handler that logs and rethrows', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const handler = createErrorHandler({ log: true, rethrow: true });

      expect(() => handler(new Error('Test'))).toThrow(CinematicPointerError);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should create handler that does not rethrow', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const handler = createErrorHandler({ log: true, rethrow: false });

      expect(() => handler(new Error('Test'))).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should call onError callback', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const onError = jest.fn();
      const handler = createErrorHandler({ rethrow: false, onError });

      handler(new ValidationError('Test'));
      expect(onError).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should include cause in log', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const cause = new Error('Root cause');
      const error = new CinematicPointerError('Wrapper', { cause });
      const handler = createErrorHandler({ rethrow: false });

      handler(error);
      expect(consoleSpy).toHaveBeenCalledTimes(2); // Main error + cause

      consoleSpy.mockRestore();
    });
  });

  describe('assert', () => {
    it('should not throw for truthy condition', () => {
      expect(() => assert(true, 'Should not throw')).not.toThrow();
      expect(() => assert(1, 'Should not throw')).not.toThrow();
      expect(() => assert('value', 'Should not throw')).not.toThrow();
    });

    it('should throw ValidationError for falsy condition', () => {
      expect(() => assert(false, 'Assertion failed')).toThrow(ValidationError);
      expect(() => assert(0, 'Zero is falsy')).toThrow(ValidationError);
      expect(() => assert('', 'Empty string')).toThrow(ValidationError);
    });

    it('should include field in error', () => {
      try {
        assert(false, 'Invalid', 'fieldName');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('fieldName');
      }
    });
  });

  describe('assertDefined', () => {
    it('should not throw for defined values', () => {
      expect(() => assertDefined('value', 'name')).not.toThrow();
      expect(() => assertDefined(0, 'name')).not.toThrow();
      expect(() => assertDefined(false, 'name')).not.toThrow();
    });

    it('should throw for null', () => {
      expect(() => assertDefined(null, 'name')).toThrow(ValidationError);
    });

    it('should throw for undefined', () => {
      expect(() => assertDefined(undefined, 'name')).toThrow(ValidationError);
    });

    it('should include field name in error', () => {
      try {
        assertDefined(null, 'myField');
      } catch (error) {
        expect((error as ValidationError).field).toBe('myField');
        expect((error as ValidationError).message).toContain('myField');
      }
    });
  });
});
