/**
 * Logger Utility
 *
 * Structured logging with levels, timestamps, and context.
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  operation?: string;
  [key: string]: unknown;
}

export interface LoggerOptions {
  level?: LogLevel;
  timestamps?: boolean;
  colors?: boolean;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, (s: string) => string> = {
  debug: chalk.gray,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DBG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
};

/**
 * Logger class with configurable levels and formatting.
 */
export class Logger {
  private options: Required<LoggerOptions>;
  private context: LogContext = {};

  constructor(options: LoggerOptions = {}) {
    this.options = {
      level: options.level ?? 'info',
      timestamps: options.timestamps ?? true,
      colors: options.colors ?? true,
      prefix: options.prefix ?? '',
    };
  }

  /**
   * Create a child logger with additional context.
   */
  child(context: LogContext): Logger {
    const child = new Logger(this.options);
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Set the log level.
   */
  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  /**
   * Check if a level would be logged.
   */
  isLevelEnabled(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.options.level];
  }

  /**
   * Log a debug message.
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log an info message.
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message.
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message.
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext =
      error instanceof Error
        ? { error: error.message, stack: error.stack }
        : error
          ? { error: String(error) }
          : {};

    this.log('error', message, { ...errorContext, ...context });
  }

  /**
   * Core logging function.
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.isLevelEnabled(level)) return;

    const mergedContext = { ...this.context, ...context };
    const parts: string[] = [];

    // Timestamp
    if (this.options.timestamps) {
      const ts = new Date().toISOString().substring(11, 23);
      parts.push(this.options.colors ? chalk.gray(ts) : ts);
    }

    // Level
    const label = LEVEL_LABELS[level];
    parts.push(this.options.colors ? LEVEL_COLORS[level](label) : label);

    // Prefix
    if (this.options.prefix) {
      parts.push(
        this.options.colors ? chalk.cyan(`[${this.options.prefix}]`) : `[${this.options.prefix}]`,
      );
    }

    // Component
    if (mergedContext.component) {
      const comp = `[${mergedContext.component}]`;
      parts.push(this.options.colors ? chalk.magenta(comp) : comp);
    }

    // Message
    parts.push(message);

    // Context (excluding component and operation which are handled separately)
    const { component: _component, operation: _operation, ...rest } = mergedContext;
    if (Object.keys(rest).length > 0) {
      const contextStr = Object.entries(rest)
        .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join(' ');
      parts.push(this.options.colors ? chalk.gray(contextStr) : contextStr);
    }

    // Output
    const output = parts.join(' ');
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  /**
   * Start a timed operation.
   */
  time(operation: string): () => void {
    const start = Date.now();
    this.debug(`Starting: ${operation}`, { operation });

    return () => {
      const duration = Date.now() - start;
      this.debug(`Completed: ${operation}`, { operation, durationMs: duration });
    };
  }

  /**
   * Log with timing wrapper.
   */
  async timed<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const end = this.time(operation);
    try {
      const result = await fn();
      end();
      return result;
    } catch (error) {
      this.error(`Failed: ${operation}`, error);
      throw error;
    }
  }
}

/**
 * Create a new logger instance.
 */
export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}

/**
 * Default logger instance.
 */
export const logger = createLogger({ prefix: 'cp' });

/**
 * Parse log level from string (e.g., from environment variable).
 */
export function parseLogLevel(level: string | undefined): LogLevel {
  if (!level) return 'info';
  const normalized = level.toLowerCase();
  if (normalized in LOG_LEVELS) {
    return normalized as LogLevel;
  }
  return 'info';
}
