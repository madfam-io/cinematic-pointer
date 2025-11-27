/**
 * Brand Theme Presets
 *
 * Pre-configured themes for different use cases.
 */

import { BrandTheme, PresetThemeName } from './types';

/**
 * Default theme - MADFAM brand colors.
 */
export const defaultTheme: BrandTheme = {
  name: 'default',
  description: 'Default Cinematic Pointer theme with MADFAM brand colors',

  primary: '#00E0A4',
  accent: '#003434',
  background: 'rgba(0, 0, 0, 0.8)',
  text: '#FFFFFF',
  error: '#FF5252',
  success: '#00E0A4',

  font: {
    family: 'Inter',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    weight: 400,
    weightBold: 600,
  },

  cursor: {
    size: 24,
    color: '#00E0A4',
    borderColor: '#003434',
    borderWidth: 2,
    shape: 'circle',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },

  ripple: {
    color: '#00E0A4',
    size: 80,
    duration: 600,
    count: 1,
  },

  trail: {
    enabled: true,
    color: 'rgba(0, 224, 164, 0.5)',
    length: 8,
    fadeDuration: 400,
    minDistance: 10,
  },

  focusRing: {
    color: '#00E0A4',
    width: 3,
    padding: 4,
    borderRadius: 8,
    animation: 'pulse',
  },

  captions: {
    fontSize: 24,
    color: '#FFFFFF',
    backgroundColor: '#000000',
    backgroundOpacity: 0.7,
    padding: 12,
    borderRadius: 8,
    position: 'bottom',
    margin: 40,
  },

  beats: {
    impactZoom: 1.15,
    zoomDuration: 300,
    easing: 'ease-out',
    flash: false,
  },
};

/**
 * MADFAM Trailer theme - high energy, cinematic.
 */
export const madfamTrailerTheme: BrandTheme = {
  ...defaultTheme,
  name: 'madfam_trailer',
  description: 'High-energy trailer theme with dramatic effects',

  cursor: {
    ...defaultTheme.cursor,
    size: 28,
    shadow: '0 4px 16px rgba(0, 224, 164, 0.5)',
  },

  ripple: {
    ...defaultTheme.ripple,
    size: 120,
    duration: 800,
    count: 2,
  },

  trail: {
    ...defaultTheme.trail,
    length: 12,
    color: 'rgba(0, 224, 164, 0.6)',
  },

  beats: {
    impactZoom: 1.25,
    zoomDuration: 400,
    easing: 'ease-out',
    flash: true,
    flashColor: 'rgba(0, 224, 164, 0.3)',
  },

  captions: {
    ...defaultTheme.captions,
    fontSize: 28,
    padding: 16,
  },
};

/**
 * MADFAM How-to theme - clear, instructional.
 */
export const madfamHowtoTheme: BrandTheme = {
  ...defaultTheme,
  name: 'madfam_howto',
  description: 'Clear instructional theme for tutorials',

  cursor: {
    ...defaultTheme.cursor,
    size: 32,
    borderWidth: 3,
  },

  ripple: {
    ...defaultTheme.ripple,
    size: 100,
    duration: 700,
  },

  trail: {
    ...defaultTheme.trail,
    enabled: true,
    length: 6,
  },

  focusRing: {
    ...defaultTheme.focusRing,
    width: 4,
    padding: 6,
    animation: 'solid',
  },

  beats: {
    impactZoom: 1.1,
    zoomDuration: 250,
    easing: 'ease-in-out',
    flash: false,
  },

  captions: {
    ...defaultTheme.captions,
    fontSize: 26,
    position: 'bottom',
    margin: 48,
  },
};

/**
 * MADFAM Teaser theme - subtle, elegant.
 */
export const madfamTeaserTheme: BrandTheme = {
  ...defaultTheme,
  name: 'madfam_teaser',
  description: 'Subtle elegant theme for teaser content',

  cursor: {
    ...defaultTheme.cursor,
    size: 20,
    shadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },

  ripple: {
    ...defaultTheme.ripple,
    size: 60,
    duration: 500,
  },

  trail: {
    ...defaultTheme.trail,
    enabled: false,
  },

  beats: {
    impactZoom: 1.08,
    zoomDuration: 200,
    easing: 'ease-out',
    flash: false,
  },

  captions: {
    ...defaultTheme.captions,
    fontSize: 20,
    backgroundOpacity: 0.6,
  },
};

/**
 * Minimal theme - clean, no effects.
 */
export const minimalTheme: BrandTheme = {
  ...defaultTheme,
  name: 'minimal',
  description: 'Clean minimal theme with no effects',

  primary: '#333333',
  accent: '#666666',

  cursor: {
    size: 20,
    color: '#333333',
    shape: 'circle',
  },

  ripple: {
    color: '#333333',
    size: 50,
    duration: 400,
    count: 1,
  },

  trail: {
    enabled: false,
    color: 'rgba(51, 51, 51, 0.3)',
    length: 4,
    fadeDuration: 200,
    minDistance: 15,
  },

  focusRing: {
    color: '#333333',
    width: 2,
    padding: 2,
    borderRadius: 4,
    animation: 'solid',
  },

  beats: {
    impactZoom: 1.05,
    zoomDuration: 150,
    easing: 'linear',
    flash: false,
  },

  captions: {
    ...defaultTheme.captions,
    fontSize: 20,
    backgroundColor: '#333333',
    backgroundOpacity: 0.8,
    borderRadius: 4,
  },
};

/**
 * Dark theme - dark mode friendly.
 */
export const darkTheme: BrandTheme = {
  ...defaultTheme,
  name: 'dark',
  description: 'Dark mode optimized theme',

  primary: '#BB86FC',
  accent: '#03DAC6',
  background: 'rgba(18, 18, 18, 0.95)',
  text: '#E1E1E1',
  error: '#CF6679',
  success: '#03DAC6',

  cursor: {
    size: 24,
    color: '#BB86FC',
    borderColor: '#03DAC6',
    borderWidth: 2,
    shape: 'circle',
    shadow: '0 2px 12px rgba(187, 134, 252, 0.4)',
  },

  ripple: {
    color: '#BB86FC',
    size: 80,
    duration: 600,
    count: 1,
  },

  trail: {
    enabled: true,
    color: 'rgba(187, 134, 252, 0.4)',
    length: 8,
    fadeDuration: 400,
    minDistance: 10,
  },

  focusRing: {
    color: '#03DAC6',
    width: 3,
    padding: 4,
    borderRadius: 8,
    animation: 'pulse',
  },

  captions: {
    ...defaultTheme.captions,
    color: '#E1E1E1',
    backgroundColor: '#121212',
    backgroundOpacity: 0.9,
  },
};

/**
 * Light theme - light mode friendly.
 */
export const lightTheme: BrandTheme = {
  ...defaultTheme,
  name: 'light',
  description: 'Light mode optimized theme',

  primary: '#6200EE',
  accent: '#03DAC6',
  background: 'rgba(255, 255, 255, 0.95)',
  text: '#1F1F1F',
  error: '#B00020',
  success: '#00C853',

  cursor: {
    size: 24,
    color: '#6200EE',
    borderColor: '#03DAC6',
    borderWidth: 2,
    shape: 'circle',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },

  ripple: {
    color: '#6200EE',
    size: 80,
    duration: 600,
    count: 1,
  },

  trail: {
    enabled: true,
    color: 'rgba(98, 0, 238, 0.3)',
    length: 8,
    fadeDuration: 400,
    minDistance: 10,
  },

  focusRing: {
    color: '#6200EE',
    width: 3,
    padding: 4,
    borderRadius: 8,
    animation: 'pulse',
  },

  captions: {
    ...defaultTheme.captions,
    color: '#1F1F1F',
    backgroundColor: '#FFFFFF',
    backgroundOpacity: 0.9,
  },
};

/**
 * All preset themes.
 */
export const presetThemes: Record<PresetThemeName, BrandTheme> = {
  default: defaultTheme,
  madfam_trailer: madfamTrailerTheme,
  madfam_howto: madfamHowtoTheme,
  madfam_teaser: madfamTeaserTheme,
  minimal: minimalTheme,
  dark: darkTheme,
  light: lightTheme,
};

/**
 * Get a preset theme by name.
 */
export function getPresetTheme(name: PresetThemeName): BrandTheme {
  return presetThemes[name] ?? defaultTheme;
}

/**
 * Get all available preset theme names.
 */
export function getPresetThemeNames(): PresetThemeName[] {
  return Object.keys(presetThemes) as PresetThemeName[];
}
