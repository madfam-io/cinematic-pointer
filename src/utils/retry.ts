/**
 * Retry Utility
 *
 * Configurable retry logic with exponential backoff.
 */

import { logger } from './logger';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Exponential backoff factor (default: 2) */
  backoffFactor?: number;
  /** Add random jitter to delays (default: true) */
  jitter?: boolean;
  /** Function to determine if error is retryable (default: all errors) */
  isRetryable?: (error: unknown) => boolean;
  /** Callback when retrying */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
  /** Operation name for logging */
  operation?: string;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: unknown;
  attempts: number;
  totalTime: number;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'isRetryable' | 'operation'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
};

/**
 * Calculate delay for a given attempt with exponential backoff.
 */
function calculateDelay(
  attempt: number,
  options: Required<Omit<RetryOptions, 'onRetry' | 'isRetryable' | 'operation'>>,
): number {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffFactor, attempt - 1);
  let delay = Math.min(exponentialDelay, options.maxDelay);

  if (options.jitter) {
    // Add ±25% jitter
    const jitterRange = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterRange;
  }

  return Math.round(delay);
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff.
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (options.isRetryable && !options.isRetryable(error)) {
        throw error;
      }

      // Check if we have attempts remaining
      if (attempt >= opts.maxAttempts) {
        break;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, opts);

      // Log retry attempt
      const operation = options.operation ?? 'operation';
      logger.warn(`Retrying ${operation}`, {
        attempt,
        maxAttempts: opts.maxAttempts,
        delayMs: delay,
        error: error instanceof Error ? error.message : String(error),
      });

      // Callback
      options.onRetry?.(error, attempt, delay);

      // Wait before retry
      await sleep(delay);
    }
  }

  // All attempts failed
  const totalTime = Date.now() - startTime;
  const operation = options.operation ?? 'operation';
  logger.error(`All retry attempts failed for ${operation}`, lastError, {
    attempts: opts.maxAttempts,
    totalTimeMs: totalTime,
  });

  throw lastError;
}

/**
 * Retry with result wrapper (doesn't throw, returns result object).
 */
export async function retryWithResult<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  try {
    const result = await retry(fn, {
      ...options,
      onRetry: (error, attempt, delay) => {
        attempts = attempt;
        options.onRetry?.(error, attempt, delay);
      },
    });

    return {
      success: true,
      result,
      attempts: attempts + 1,
      totalTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error,
      attempts: options.maxAttempts ?? DEFAULT_OPTIONS.maxAttempts,
      totalTime: Date.now() - startTime,
    };
  }
}

/**
 * Create a retryable version of a function.
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {},
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return retry(() => fn(...args), options);
  }) as T;
}

/**
 * Predefined retry strategies.
 */
export const retryStrategies = {
  /** Quick retries for transient failures */
  fast: {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 1000,
    backoffFactor: 2,
  } as RetryOptions,

  /** Standard retry for most operations */
  standard: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  } as RetryOptions,

  /** Patient retries for network operations */
  network: {
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 2,
  } as RetryOptions,

  /** Aggressive retries for critical operations */
  critical: {
    maxAttempts: 10,
    initialDelay: 500,
    maxDelay: 60000,
    backoffFactor: 1.5,
  } as RetryOptions,
};

/**
 * Check if an error is a network-related error.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('socket') ||
      message.includes('fetch failed')
    );
  }
  return false;
}

/**
 * Check if an error is a timeout error.
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || message.includes('timed out');
  }
  return false;
}
