// Mock chalk to avoid ESM issues in Jest
jest.mock('chalk', () => ({
  gray: (s: string) => s,
  blue: (s: string) => s,
  yellow: (s: string) => s,
  red: (s: string) => s,
  cyan: (s: string) => s,
  magenta: (s: string) => s,
}));

import { Logger, createLogger, parseLogLevel } from '../utils/logger';

describe('Logger', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('Logger class', () => {
    it('should create logger with default options', () => {
      const logger = new Logger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with custom options', () => {
      const logger = new Logger({
        level: 'debug',
        timestamps: false,
        colors: false,
        prefix: 'test',
      });
      expect(logger).toBeInstanceOf(Logger);
    });

    describe('log levels', () => {
      it('should log info messages by default', () => {
        const logger = new Logger({ timestamps: false, colors: false });
        logger.info('Test message');
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('INF'));
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Test message'));
      });

      it('should not log debug when level is info', () => {
        const logger = new Logger({ level: 'info', timestamps: false, colors: false });
        logger.debug('Debug message');
        expect(consoleSpy.log).not.toHaveBeenCalled();
      });

      it('should log debug when level is debug', () => {
        const logger = new Logger({ level: 'debug', timestamps: false, colors: false });
        logger.debug('Debug message');
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('DBG'));
      });

      it('should log warn messages', () => {
        const logger = new Logger({ timestamps: false, colors: false });
        logger.warn('Warning message');
        expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('WRN'));
      });

      it('should log error messages', () => {
        const logger = new Logger({ timestamps: false, colors: false });
        logger.error('Error message');
        expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('ERR'));
      });

      it('should log error with Error object', () => {
        const logger = new Logger({ timestamps: false, colors: false });
        const error = new Error('Something went wrong');
        logger.error('Operation failed', error);
        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('Something went wrong'),
        );
      });

      it('should log error with non-Error', () => {
        const logger = new Logger({ timestamps: false, colors: false });
        logger.error('Operation failed', 'string error');
        expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('string error'));
      });
    });

    describe('setLevel', () => {
      it('should change log level', () => {
        const logger = new Logger({ level: 'error', timestamps: false, colors: false });

        logger.info('Should not appear');
        expect(consoleSpy.log).not.toHaveBeenCalled();

        logger.setLevel('info');
        logger.info('Should appear');
        expect(consoleSpy.log).toHaveBeenCalled();
      });
    });

    describe('isLevelEnabled', () => {
      it('should check if level is enabled', () => {
        const logger = new Logger({ level: 'warn' });

        expect(logger.isLevelEnabled('debug')).toBe(false);
        expect(logger.isLevelEnabled('info')).toBe(false);
        expect(logger.isLevelEnabled('warn')).toBe(true);
        expect(logger.isLevelEnabled('error')).toBe(true);
      });
    });

    describe('child', () => {
      it('should create child logger with context', () => {
        const logger = new Logger({ timestamps: false, colors: false });
        const child = logger.child({ component: 'test-component' });

        child.info('Child message');
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('[test-component]'));
      });

      it('should inherit parent options', () => {
        const logger = new Logger({ level: 'error', timestamps: false, colors: false });
        const child = logger.child({ component: 'child' });

        child.info('Should not appear');
        expect(consoleSpy.log).not.toHaveBeenCalled();
      });

      it('should merge parent and child context', () => {
        const logger = new Logger({ timestamps: false, colors: false });
        const child1 = logger.child({ component: 'parent' });
        const child2 = child1.child({ component: 'child' });

        child2.info('Nested');
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('[child]'));
      });
    });

    describe('prefix', () => {
      it('should include prefix in output', () => {
        const logger = new Logger({ prefix: 'myapp', timestamps: false, colors: false });
        logger.info('Test');
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('[myapp]'));
      });
    });

    describe('context', () => {
      it('should include context in output', () => {
        const logger = new Logger({ timestamps: false, colors: false });
        logger.info('Test', { key: 'value', num: 42 });
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('key=value'));
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('num=42'));
      });

      it('should stringify complex context values', () => {
        const logger = new Logger({ timestamps: false, colors: false });
        logger.info('Test', { obj: { nested: true } });
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('obj={"nested":true}'));
      });
    });

    describe('time', () => {
      it('should return timing function', () => {
        const logger = new Logger({ level: 'debug', timestamps: false, colors: false });
        const end = logger.time('operation');

        expect(typeof end).toBe('function');
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Starting'));

        end();
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Completed'));
      });
    });

    describe('timed', () => {
      it('should time successful operation', async () => {
        const logger = new Logger({ level: 'debug', timestamps: false, colors: false });

        const result = await logger.timed('operation', async () => {
          return 'result';
        });

        expect(result).toBe('result');
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Starting'));
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Completed'));
      });

      it('should log error on failure', async () => {
        const logger = new Logger({ level: 'debug', timestamps: false, colors: false });

        await expect(
          logger.timed('operation', async () => {
            throw new Error('Failed');
          }),
        ).rejects.toThrow('Failed');

        expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Failed:'));
      });
    });
  });

  describe('createLogger', () => {
    it('should create logger instance', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should accept options', () => {
      const logger = createLogger({ level: 'debug' });
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('parseLogLevel', () => {
    it('should parse valid levels', () => {
      expect(parseLogLevel('debug')).toBe('debug');
      expect(parseLogLevel('info')).toBe('info');
      expect(parseLogLevel('warn')).toBe('warn');
      expect(parseLogLevel('error')).toBe('error');
    });

    it('should be case insensitive', () => {
      expect(parseLogLevel('DEBUG')).toBe('debug');
      expect(parseLogLevel('INFO')).toBe('info');
      expect(parseLogLevel('WARN')).toBe('warn');
      expect(parseLogLevel('ERROR')).toBe('error');
    });

    it('should return info for undefined', () => {
      expect(parseLogLevel(undefined)).toBe('info');
    });

    it('should return info for invalid levels', () => {
      expect(parseLogLevel('invalid')).toBe('info');
      expect(parseLogLevel('verbose')).toBe('info');
    });
  });
});
