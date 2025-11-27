import {
  defaultTheme,
  madfamTrailerTheme,
  madfamHowtoTheme,
  madfamTeaserTheme,
  minimalTheme,
  darkTheme,
  lightTheme,
  presetThemes,
  getPresetTheme,
  getPresetThemeNames,
} from '../themes/presets';
import { BrandTheme, PresetThemeName } from '../themes/types';

describe('Theme Presets', () => {
  const allThemes = [
    defaultTheme,
    madfamTrailerTheme,
    madfamHowtoTheme,
    madfamTeaserTheme,
    minimalTheme,
    darkTheme,
    lightTheme,
  ];

  describe('Theme Structure', () => {
    it.each(allThemes)('should have all required properties', (theme) => {
      // Core colors
      expect(theme.name).toBeDefined();
      expect(theme.primary).toBeDefined();
      expect(theme.accent).toBeDefined();
      expect(theme.background).toBeDefined();
      expect(theme.text).toBeDefined();
      expect(theme.error).toBeDefined();
      expect(theme.success).toBeDefined();

      // Font config
      expect(theme.font).toBeDefined();
      expect(theme.font.family).toBeDefined();

      // Cursor config
      expect(theme.cursor).toBeDefined();
      expect(theme.cursor.size).toBeGreaterThan(0);
      expect(theme.cursor.color).toBeDefined();
      expect(theme.cursor.shape).toBeDefined();

      // Ripple config
      expect(theme.ripple).toBeDefined();
      expect(theme.ripple.color).toBeDefined();
      expect(theme.ripple.size).toBeGreaterThan(0);
      expect(theme.ripple.duration).toBeGreaterThan(0);
      expect(theme.ripple.count).toBeGreaterThanOrEqual(1);

      // Trail config
      expect(theme.trail).toBeDefined();
      expect(typeof theme.trail.enabled).toBe('boolean');

      // Focus ring config
      expect(theme.focusRing).toBeDefined();
      expect(theme.focusRing.color).toBeDefined();
      expect(theme.focusRing.width).toBeGreaterThan(0);

      // Captions config
      expect(theme.captions).toBeDefined();
      expect(theme.captions.fontSize).toBeGreaterThan(0);
      expect(theme.captions.position).toMatch(/^(top|bottom)$/);

      // Beats config
      expect(theme.beats).toBeDefined();
      expect(theme.beats.impactZoom).toBeGreaterThan(1);
      expect(theme.beats.zoomDuration).toBeGreaterThan(0);
    });
  });

  describe('Default Theme', () => {
    it('should have MADFAM brand colors', () => {
      expect(defaultTheme.name).toBe('default');
      expect(defaultTheme.primary).toBe('#00E0A4');
      expect(defaultTheme.accent).toBe('#003434');
    });

    it('should have Inter font', () => {
      expect(defaultTheme.font.family).toBe('Inter');
    });

    it('should have circle cursor', () => {
      expect(defaultTheme.cursor.shape).toBe('circle');
    });
  });

  describe('MADFAM Trailer Theme', () => {
    it('should inherit from default', () => {
      expect(madfamTrailerTheme.primary).toBe(defaultTheme.primary);
    });

    it('should have larger cursor', () => {
      expect(madfamTrailerTheme.cursor.size).toBeGreaterThan(defaultTheme.cursor.size);
    });

    it('should have larger ripple', () => {
      expect(madfamTrailerTheme.ripple.size).toBeGreaterThan(defaultTheme.ripple.size);
    });

    it('should have more dramatic beats', () => {
      expect(madfamTrailerTheme.beats.impactZoom).toBeGreaterThan(defaultTheme.beats.impactZoom);
      expect(madfamTrailerTheme.beats.flash).toBe(true);
    });
  });

  describe('MADFAM How-to Theme', () => {
    it('should be named correctly', () => {
      expect(madfamHowtoTheme.name).toBe('madfam_howto');
    });

    it('should have larger cursor for visibility', () => {
      expect(madfamHowtoTheme.cursor.size).toBeGreaterThanOrEqual(defaultTheme.cursor.size);
    });

    it('should have solid focus ring animation', () => {
      expect(madfamHowtoTheme.focusRing.animation).toBe('solid');
    });

    it('should have subtler beats', () => {
      expect(madfamHowtoTheme.beats.impactZoom).toBeLessThan(madfamTrailerTheme.beats.impactZoom);
      expect(madfamHowtoTheme.beats.flash).toBe(false);
    });
  });

  describe('MADFAM Teaser Theme', () => {
    it('should be named correctly', () => {
      expect(madfamTeaserTheme.name).toBe('madfam_teaser');
    });

    it('should have smaller cursor', () => {
      expect(madfamTeaserTheme.cursor.size).toBeLessThan(defaultTheme.cursor.size);
    });

    it('should have trails disabled', () => {
      expect(madfamTeaserTheme.trail.enabled).toBe(false);
    });
  });

  describe('Minimal Theme', () => {
    it('should have minimal colors', () => {
      expect(minimalTheme.name).toBe('minimal');
      expect(minimalTheme.primary).toBe('#333333');
    });

    it('should have trails disabled', () => {
      expect(minimalTheme.trail.enabled).toBe(false);
    });

    it('should have subtle beats', () => {
      expect(minimalTheme.beats.impactZoom).toBe(1.05);
      expect(minimalTheme.beats.flash).toBe(false);
    });
  });

  describe('Dark Theme', () => {
    it('should have dark mode colors', () => {
      expect(darkTheme.name).toBe('dark');
      expect(darkTheme.primary).toBe('#BB86FC');
      expect(darkTheme.accent).toBe('#03DAC6');
      expect(darkTheme.background).toContain('18, 18, 18');
    });

    it('should have purple cursor', () => {
      expect(darkTheme.cursor.color).toBe('#BB86FC');
    });
  });

  describe('Light Theme', () => {
    it('should have light mode colors', () => {
      expect(lightTheme.name).toBe('light');
      expect(lightTheme.primary).toBe('#6200EE');
      expect(lightTheme.background).toContain('255, 255, 255');
      expect(lightTheme.text).toBe('#1F1F1F');
    });
  });

  describe('presetThemes', () => {
    it('should contain all preset themes', () => {
      expect(presetThemes.default).toBe(defaultTheme);
      expect(presetThemes.madfam_trailer).toBe(madfamTrailerTheme);
      expect(presetThemes.madfam_howto).toBe(madfamHowtoTheme);
      expect(presetThemes.madfam_teaser).toBe(madfamTeaserTheme);
      expect(presetThemes.minimal).toBe(minimalTheme);
      expect(presetThemes.dark).toBe(darkTheme);
      expect(presetThemes.light).toBe(lightTheme);
    });

    it('should have 7 themes', () => {
      expect(Object.keys(presetThemes)).toHaveLength(7);
    });
  });

  describe('getPresetTheme', () => {
    it('should return theme by name', () => {
      expect(getPresetTheme('default')).toBe(defaultTheme);
      expect(getPresetTheme('madfam_trailer')).toBe(madfamTrailerTheme);
      expect(getPresetTheme('dark')).toBe(darkTheme);
      expect(getPresetTheme('light')).toBe(lightTheme);
    });

    it('should return default for unknown name', () => {
      expect(getPresetTheme('unknown' as PresetThemeName)).toBe(defaultTheme);
    });
  });

  describe('getPresetThemeNames', () => {
    it('should return all preset names', () => {
      const names = getPresetThemeNames();
      expect(names).toContain('default');
      expect(names).toContain('madfam_trailer');
      expect(names).toContain('madfam_howto');
      expect(names).toContain('madfam_teaser');
      expect(names).toContain('minimal');
      expect(names).toContain('dark');
      expect(names).toContain('light');
    });

    it('should return array of strings', () => {
      const names = getPresetThemeNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names).toHaveLength(7);
      names.forEach((name) => {
        expect(typeof name).toBe('string');
      });
    });
  });
});
