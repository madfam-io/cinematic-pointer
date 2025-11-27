/**
 * Error Utilities
 *
 * Custom error classes and error handling helpers.
 */

/**
 * Base error class for Cinematic Pointer errors.
 */
export class CinematicPointerError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown>;
  public readonly cause?: Error;

  constructor(
    message: string,
    options: {
      code?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {},
  ) {
    super(message);
    this.name = 'CinematicPointerError';
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.context = options.context ?? {};
    this.cause = options.cause;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a user-friendly error message.
   */
  toUserMessage(): string {
    return this.message;
  }

  /**
   * Get detailed error information for logging.
   */
  toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends CinematicPointerError {
  public readonly field?: string;

  constructor(
    message: string,
    options: {
      field?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {},
  ) {
    super(message, { code: 'VALIDATION_ERROR', ...options });
    this.name = 'ValidationError';
    this.field = options.field;
  }
}

/**
 * Error thrown when a file is not found.
 */
export class FileNotFoundError extends CinematicPointerError {
  public readonly path: string;

  constructor(path: string, options: { context?: Record<string, unknown> } = {}) {
    super(`File not found: ${path}`, { code: 'FILE_NOT_FOUND', ...options });
    this.name = 'FileNotFoundError';
    this.path = path;
  }

  toUserMessage(): string {
    return `Could not find the file: ${this.path}\nPlease check that the path is correct and the file exists.`;
  }
}

/**
 * Error thrown when a required dependency is missing.
 */
export class DependencyError extends CinematicPointerError {
  public readonly dependency: string;

  constructor(
    dependency: string,
    message?: string,
    options: { context?: Record<string, unknown> } = {},
  ) {
    super(message ?? `Required dependency not found: ${dependency}`, {
      code: 'DEPENDENCY_ERROR',
      ...options,
    });
    this.name = 'DependencyError';
    this.dependency = dependency;
  }

  toUserMessage(): string {
    if (this.dependency === 'ffmpeg') {
      return `FFmpeg is required but not found.\nInstall FFmpeg 6.0+ from: https://ffmpeg.org/download.html`;
    }
    return `Required dependency "${this.dependency}" is not available.\nPlease install it and try again.`;
  }
}

/**
 * Error thrown when execution fails.
 */
export class ExecutionError extends CinematicPointerError {
  public readonly step?: number;
  public readonly action?: string;

  constructor(
    message: string,
    options: {
      step?: number;
      action?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {},
  ) {
    super(message, { code: 'EXECUTION_ERROR', ...options });
    this.name = 'ExecutionError';
    this.step = options.step;
    this.action = options.action;
  }
}

/**
 * Error thrown when timeout is exceeded.
 */
export class TimeoutError extends CinematicPointerError {
  public readonly timeoutMs: number;
  public readonly operation: string;

  constructor(
    operation: string,
    timeoutMs: number,
    options: { context?: Record<string, unknown> } = {},
  ) {
    super(`Operation timed out after ${timeoutMs}ms: ${operation}`, {
      code: 'TIMEOUT_ERROR',
      ...options,
    });
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error thrown when configuration is invalid.
 */
export class ConfigurationError extends CinematicPointerError {
  constructor(message: string, options: { context?: Record<string, unknown>; cause?: Error } = {}) {
    super(message, { code: 'CONFIGURATION_ERROR', ...options });
    this.name = 'ConfigurationError';
  }
}

/**
 * Wrap an error with additional context.
 */
export function wrapError(
  error: unknown,
  message: string,
  context?: Record<string, unknown>,
): CinematicPointerError {
  const cause = error instanceof Error ? error : new Error(String(error));

  return new CinematicPointerError(message, {
    code: error instanceof CinematicPointerError ? error.code : 'WRAPPED_ERROR',
    context: {
      ...(error instanceof CinematicPointerError ? error.context : {}),
      ...context,
    },
    cause,
  });
}

/**
 * Extract error message from unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Check if error is of a specific type.
 */
export function isErrorType<T extends CinematicPointerError>(
  error: unknown,
  ErrorClass: new (...args: any[]) => T,
): error is T {
  return error instanceof ErrorClass;
}

/**
 * Create an error handler that logs and optionally rethrows.
 */
export function createErrorHandler(options: {
  log?: boolean;
  rethrow?: boolean;
  onError?: (error: CinematicPointerError) => void;
}): (error: unknown, context?: string) => void {
  return (error: unknown, context?: string) => {
    const wrappedError =
      error instanceof CinematicPointerError
        ? error
        : wrapError(error, context ?? 'An error occurred');

    if (options.log !== false) {
      console.error(`[Error] ${wrappedError.message}`);
      if (wrappedError.cause) {
        console.error(`  Caused by: ${wrappedError.cause.message}`);
      }
    }

    options.onError?.(wrappedError);

    if (options.rethrow !== false) {
      throw wrappedError;
    }
  };
}

/**
 * Assert a condition, throwing ValidationError if false.
 */
export function assert(condition: unknown, message: string, field?: string): asserts condition {
  if (!condition) {
    throw new ValidationError(message, { field });
  }
}

/**
 * Assert a value is defined (not null or undefined).
 */
export function assertDefined<T>(value: T | null | undefined, name: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${name} is required but was not provided`, { field: name });
  }
}
