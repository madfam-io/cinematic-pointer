// Mock chalk for logger
jest.mock('chalk', () => ({
  gray: (s: string) => s,
  blue: (s: string) => s,
  yellow: (s: string) => s,
  red: (s: string) => s,
  cyan: (s: string) => s,
  magenta: (s: string) => s,
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import { readFile } from 'fs/promises';
import { ThemeManager, validateTheme } from '../themes/manager';
import { defaultTheme, darkTheme } from '../themes/presets';
import { ValidationError, FileNotFoundError } from '../utils/errors';
import { BrandTheme } from '../themes/types';

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('Theme Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTheme', () => {
    it('should validate a complete theme', () => {
      expect(validateTheme(defaultTheme)).toBe(true);
    });

    it('should throw for non-object', () => {
      expect(() => validateTheme(null)).toThrow(ValidationError);
      expect(() => validateTheme('string')).toThrow(ValidationError);
    });

    it('should throw for missing required string fields', () => {
      const incomplete = { ...defaultTheme, name: undefined };
      expect(() => validateTheme(incomplete)).toThrow(ValidationError);
    });

    it('should throw for missing required object fields', () => {
      const incomplete = { ...defaultTheme, font: undefined };
      expect(() => validateTheme(incomplete)).toThrow(ValidationError);
    });

    it('should throw for invalid cursor size', () => {
      const invalid = {
        ...defaultTheme,
        cursor: { ...defaultTheme.cursor, size: -1 },
      };
      expect(() => validateTheme(invalid)).toThrow(ValidationError);
    });

    it('should throw for missing cursor color', () => {
      const invalid = {
        ...defaultTheme,
        cursor: { ...defaultTheme.cursor, color: undefined },
      };
      expect(() => validateTheme(invalid)).toThrow(ValidationError);
    });

    it('should throw for missing font family', () => {
      const invalid = {
        ...defaultTheme,
        font: { ...defaultTheme.font, family: undefined },
      };
      expect(() => validateTheme(invalid)).toThrow(ValidationError);
    });
  });

  describe('ThemeManager', () => {
    describe('constructor', () => {
      it('should initialize with default theme', () => {
        const manager = new ThemeManager();
        expect(manager.getTheme()).toEqual(defaultTheme);
      });

      it('should initialize with custom theme', () => {
        const manager = new ThemeManager(darkTheme);
        expect(manager.getTheme()).toEqual(darkTheme);
      });
    });

    describe('getTheme', () => {
      it('should return current theme', () => {
        const manager = new ThemeManager();
        const theme = manager.getTheme();
        expect(theme.name).toBe('default');
      });
    });

    describe('setTheme', () => {
      it('should set preset theme by name', () => {
        const manager = new ThemeManager();
        manager.setTheme('dark');
        expect(manager.getTheme().name).toBe('dark');
      });

      it('should set another preset theme', () => {
        const manager = new ThemeManager();
        manager.setTheme('minimal');
        expect(manager.getTheme().name).toBe('minimal');
      });

      it('should throw for unknown theme', () => {
        const manager = new ThemeManager();
        expect(() => manager.setTheme('unknown')).toThrow(ValidationError);
      });

      it('should set custom registered theme', () => {
        const manager = new ThemeManager();
        const customTheme: BrandTheme = {
          ...defaultTheme,
          name: 'my-custom',
          primary: '#FF0000',
        };
        manager.registerTheme(customTheme);
        manager.setTheme('my-custom');
        expect(manager.getTheme().name).toBe('my-custom');
        expect(manager.getTheme().primary).toBe('#FF0000');
      });
    });

    describe('applyOverrides', () => {
      it('should apply simple overrides', () => {
        const manager = new ThemeManager();
        manager.applyOverrides({ primary: '#FF0000' });
        expect(manager.getTheme().primary).toBe('#FF0000');
      });

      it('should deep merge nested objects', () => {
        const manager = new ThemeManager();
        manager.applyOverrides({
          cursor: { size: 32 },
        });
        expect(manager.getTheme().cursor.size).toBe(32);
        // Other cursor properties should be preserved
        expect(manager.getTheme().cursor.color).toBe(defaultTheme.cursor.color);
      });

      it('should apply multiple overrides', () => {
        const manager = new ThemeManager();
        manager.applyOverrides({
          primary: '#FF0000',
          accent: '#00FF00',
          cursor: { size: 48 },
        });
        expect(manager.getTheme().primary).toBe('#FF0000');
        expect(manager.getTheme().accent).toBe('#00FF00');
        expect(manager.getTheme().cursor.size).toBe(48);
      });
    });

    describe('registerTheme', () => {
      it('should register a valid custom theme', () => {
        const manager = new ThemeManager();
        const customTheme: BrandTheme = {
          ...defaultTheme,
          name: 'custom',
        };
        manager.registerTheme(customTheme);
        expect(manager.getAvailableThemes()).toContain('custom');
      });

      it('should throw for invalid theme', () => {
        const manager = new ThemeManager();
        expect(() => manager.registerTheme({} as BrandTheme)).toThrow(ValidationError);
      });
    });

    describe('loadFromFile', () => {
      it('should load theme from JSON file', async () => {
        const manager = new ThemeManager();
        const themeJson = JSON.stringify({
          name: 'loaded',
          primary: '#123456',
        });

        mockReadFile.mockResolvedValue(themeJson);

        const theme = await manager.loadFromFile('/path/to/theme.json');
        expect(theme.name).toBe('loaded');
        expect(theme.primary).toBe('#123456');
        // Should merge with defaults
        expect(theme.font).toBeDefined();
      });

      it('should use filename as name if not provided', async () => {
        const manager = new ThemeManager();
        const themeJson = JSON.stringify({
          primary: '#ABCDEF',
        });

        mockReadFile.mockResolvedValue(themeJson);

        const theme = await manager.loadFromFile('/path/to/custom-theme.json');
        expect(theme.name).toBe('custom-theme');
      });

      it('should throw FileNotFoundError for missing file', async () => {
        const manager = new ThemeManager();
        const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        mockReadFile.mockRejectedValue(error);

        await expect(manager.loadFromFile('/missing.json')).rejects.toThrow(FileNotFoundError);
      });

      it('should throw ValidationError for invalid JSON', async () => {
        const manager = new ThemeManager();
        mockReadFile.mockResolvedValue('{ invalid json }');

        await expect(manager.loadFromFile('/invalid.json')).rejects.toThrow(ValidationError);
      });
    });

    describe('exportTheme', () => {
      it('should export theme as JSON string', () => {
        const manager = new ThemeManager();
        const json = manager.exportTheme();
        const parsed = JSON.parse(json);
        expect(parsed.name).toBe('default');
        expect(parsed.primary).toBe(defaultTheme.primary);
      });

      it('should export with formatting', () => {
        const manager = new ThemeManager();
        const json = manager.exportTheme();
        expect(json).toContain('\n'); // Should be pretty-printed
      });
    });

    describe('getCssVariables', () => {
      it('should generate CSS variables', () => {
        const manager = new ThemeManager();
        const css = manager.getCssVariables();

        expect(css).toContain(':root');
        expect(css).toContain('--cp-primary:');
        expect(css).toContain('--cp-accent:');
        expect(css).toContain('--cp-cursor-size:');
        expect(css).toContain(defaultTheme.primary);
      });

      it('should include font fallback', () => {
        const manager = new ThemeManager();
        const css = manager.getCssVariables();
        expect(css).toContain('--cp-font-family:');
      });

      it('should include custom CSS when present', () => {
        const manager = new ThemeManager();
        manager.applyOverrides({ customCss: '.custom { color: red; }' });
        const css = manager.getCssVariables();
        expect(css).toContain('.custom { color: red; }');
      });
    });

    describe('generateOverlayStyles', () => {
      it('should generate complete overlay CSS', () => {
        const manager = new ThemeManager();
        const css = manager.generateOverlayStyles();

        expect(css).toContain(':root');
        expect(css).toContain('.cp-cursor-container');
        expect(css).toContain('.cp-cursor');
        expect(css).toContain('.cp-ripple');
        expect(css).toContain('.cp-trail');
        expect(css).toContain('.cp-focus-ring');
        expect(css).toContain('.cp-caption');
        expect(css).toContain('@keyframes');
      });

      it('should include flash styles when enabled', () => {
        const manager = new ThemeManager();
        manager.applyOverrides({
          beats: {
            impactZoom: 1.25,
            zoomDuration: 400,
            easing: 'ease-out',
            flash: true,
            flashColor: 'rgba(255,255,255,0.5)',
          },
        });
        const css = manager.generateOverlayStyles();
        expect(css).toContain('.cp-flash');
      });

      it('should not include flash styles when disabled', () => {
        const manager = new ThemeManager();
        // Default theme has flash disabled
        const css = manager.generateOverlayStyles();
        // Check that cp-flash class is not present or flash is false
        if (!manager.getTheme().beats.flash) {
          expect(css).not.toContain('.cp-flash {');
        }
      });
    });

    describe('getAvailableThemes', () => {
      it('should return preset theme names', () => {
        const manager = new ThemeManager();
        const themes = manager.getAvailableThemes();
        expect(themes).toContain('default');
        expect(themes).toContain('dark');
        expect(themes).toContain('light');
        expect(themes).toContain('minimal');
      });

      it('should include custom themes', () => {
        const manager = new ThemeManager();
        manager.registerTheme({ ...defaultTheme, name: 'my-theme' });
        const themes = manager.getAvailableThemes();
        expect(themes).toContain('my-theme');
      });
    });
  });
});
