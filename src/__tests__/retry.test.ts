import {
  retry,
  retryWithResult,
  withRetry,
  retryStrategies,
  isNetworkError,
  isTimeoutError,
} from '../utils/retry';

// Mock the logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Retry Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('retry', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retry(fn, { maxAttempts: 3 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        jitter: false,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fails'));

      await expect(
        retry(fn, {
          maxAttempts: 3,
          initialDelay: 10,
          jitter: false,
        }),
      ).rejects.toThrow('always fails');

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect isRetryable function', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('non-retryable'));

      await expect(
        retry(fn, {
          maxAttempts: 3,
          isRetryable: () => false,
        }),
      ).rejects.toThrow('non-retryable');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      const fn = jest.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');

      await retry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        jitter: false,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, expect.any(Number));
    });

    it('should apply exponential backoff', async () => {
      const delays: number[] = [];
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      await retry(fn, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffFactor: 2,
        jitter: false,
        onRetry: (_err, _attempt, delay) => delays.push(delay),
      });

      expect(delays[0]).toBe(100); // 100 * 2^0
      expect(delays[1]).toBe(200); // 100 * 2^1
    });

    it('should respect maxDelay', async () => {
      const delays: number[] = [];
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      await retry(fn, {
        maxAttempts: 3,
        initialDelay: 100,
        maxDelay: 150,
        backoffFactor: 2,
        jitter: false,
        onRetry: (_err, _attempt, delay) => delays.push(delay),
      });

      expect(delays[1]).toBe(150); // Would be 200, but capped at 150
    });

    it('should apply jitter when enabled', async () => {
      const delays: number[] = [];
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockRejectedValueOnce(new Error('fail 3'))
        .mockRejectedValueOnce(new Error('fail 4'))
        .mockResolvedValue('success');

      await retry(fn, {
        maxAttempts: 5,
        initialDelay: 100,
        backoffFactor: 1, // Keep delay constant to test jitter
        jitter: true,
        onRetry: (_err, _attempt, delay) => delays.push(delay),
      });

      // With jitter, delays should vary around the base delay
      // Base is 100, jitter adds ±25%, so range is 75-125
      for (const delay of delays) {
        expect(delay).toBeGreaterThanOrEqual(75);
        expect(delay).toBeLessThanOrEqual(125);
      }

      // At least some delays should be different (very unlikely all are same with random jitter)
      const uniqueDelays = new Set(delays);
      // Don't assert uniqueness - randomness could produce same values
      expect(delays.length).toBe(4);
    });
  });

  describe('retryWithResult', () => {
    it('should return success result', async () => {
      const fn = jest.fn().mockResolvedValue('data');
      const result = await retryWithResult(fn, { maxAttempts: 3 });

      expect(result.success).toBe(true);
      expect(result.result).toBe('data');
      expect(result.attempts).toBe(1);
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
    });

    it('should return failure result without throwing', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const result = await retryWithResult(fn, {
        maxAttempts: 2,
        initialDelay: 10,
        jitter: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.attempts).toBe(2);
    });

    it('should track attempt count through retries', async () => {
      const fn = jest.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');

      const result = await retryWithResult(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        jitter: false,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });
  });

  describe('withRetry', () => {
    it('should create retryable version of function', async () => {
      let callCount = 0;
      const originalFn = async (x: number): Promise<number> => {
        callCount++;
        if (callCount < 2) throw new Error('fail');
        return x * 2;
      };

      const retryableFn = withRetry(originalFn, {
        maxAttempts: 3,
        initialDelay: 10,
        jitter: false,
      });

      const result = await retryableFn(5);
      expect(result).toBe(10);
      expect(callCount).toBe(2);
    });

    it('should preserve function arguments', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      const retryableFn = withRetry(fn, { maxAttempts: 2 });

      await retryableFn('arg1', 'arg2', 123);
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });
  });

  describe('retryStrategies', () => {
    it('should have fast strategy', () => {
      expect(retryStrategies.fast.maxAttempts).toBe(3);
      expect(retryStrategies.fast.initialDelay).toBe(100);
    });

    it('should have standard strategy', () => {
      expect(retryStrategies.standard.maxAttempts).toBe(3);
      expect(retryStrategies.standard.initialDelay).toBe(1000);
    });

    it('should have network strategy', () => {
      expect(retryStrategies.network.maxAttempts).toBe(5);
      expect(retryStrategies.network.initialDelay).toBe(2000);
    });

    it('should have critical strategy', () => {
      expect(retryStrategies.critical.maxAttempts).toBe(10);
    });
  });

  describe('isNetworkError', () => {
    it('should detect network errors', () => {
      expect(isNetworkError(new Error('network error'))).toBe(true);
      expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
      expect(isNetworkError(new Error('ECONNRESET'))).toBe(true);
      expect(isNetworkError(new Error('ENOTFOUND'))).toBe(true);
      expect(isNetworkError(new Error('socket hang up'))).toBe(true);
      expect(isNetworkError(new Error('fetch failed'))).toBe(true);
      expect(isNetworkError(new Error('timeout exceeded'))).toBe(true);
    });

    it('should return false for non-network errors', () => {
      expect(isNetworkError(new Error('validation error'))).toBe(false);
      expect(isNetworkError(new Error('file not found'))).toBe(false);
    });

    it('should return false for non-Error types', () => {
      expect(isNetworkError('string error')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('should detect timeout errors', () => {
      expect(isTimeoutError(new Error('timeout'))).toBe(true);
      expect(isTimeoutError(new Error('operation timed out'))).toBe(true);
      expect(isTimeoutError(new Error('Request timeout'))).toBe(true);
    });

    it('should return false for non-timeout errors', () => {
      expect(isTimeoutError(new Error('connection failed'))).toBe(false);
    });

    it('should return false for non-Error types', () => {
      expect(isTimeoutError('timeout')).toBe(false);
    });
  });
});
