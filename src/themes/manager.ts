/**
 * Theme Manager
 *
 * Handles loading, merging, and validating brand themes.
 */

import { readFile } from 'fs/promises';
import path from 'path';

import { ValidationError, FileNotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

import { defaultTheme, getPresetTheme, presetThemes } from './presets';
import { BrandTheme, PartialTheme, PresetThemeName } from './types';

/**
 * Deep merge two objects.
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue as Partial<typeof targetValue>);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Validate a theme configuration.
 */
export function validateTheme(theme: unknown): theme is BrandTheme {
  if (!theme || typeof theme !== 'object') {
    throw new ValidationError('Theme must be an object');
  }

  const t = theme as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ['name', 'primary', 'accent', 'background', 'text'];
  for (const field of requiredStrings) {
    if (typeof t[field] !== 'string') {
      throw new ValidationError(`Theme must have a ${field} string field`, { field });
    }
  }

  // Required object fields
  const requiredObjects = ['font', 'cursor', 'ripple', 'trail', 'focusRing', 'captions', 'beats'];
  for (const field of requiredObjects) {
    if (!t[field] || typeof t[field] !== 'object') {
      throw new ValidationError(`Theme must have a ${field} object`, { field });
    }
  }

  // Validate cursor
  const cursor = t.cursor as Record<string, unknown>;
  if (typeof cursor.size !== 'number' || cursor.size <= 0) {
    throw new ValidationError('Cursor size must be a positive number', { field: 'cursor.size' });
  }
  if (typeof cursor.color !== 'string') {
    throw new ValidationError('Cursor color must be a string', { field: 'cursor.color' });
  }

  // Validate font
  const font = t.font as Record<string, unknown>;
  if (typeof font.family !== 'string') {
    throw new ValidationError('Font family must be a string', { field: 'font.family' });
  }

  return true;
}

/**
 * Theme manager class.
 */
export class ThemeManager {
  private currentTheme: BrandTheme;
  private customThemes: Map<string, BrandTheme> = new Map();

  constructor(initialTheme: BrandTheme = defaultTheme) {
    this.currentTheme = initialTheme;
  }

  /**
   * Get the current theme.
   */
  getTheme(): BrandTheme {
    return this.currentTheme;
  }

  /**
   * Set the current theme by name.
   */
  setTheme(name: string): void {
    // Check preset themes first
    if (name in presetThemes) {
      this.currentTheme = getPresetTheme(name as PresetThemeName);
      logger.info(`Theme set to preset: ${name}`);
      return;
    }

    // Check custom themes
    const custom = this.customThemes.get(name);
    if (custom) {
      this.currentTheme = custom;
      logger.info(`Theme set to custom: ${name}`);
      return;
    }

    throw new ValidationError(`Unknown theme: ${name}`, { field: 'theme' });
  }

  /**
   * Apply overrides to the current theme.
   */
  applyOverrides(overrides: PartialTheme): void {
    this.currentTheme = deepMerge(this.currentTheme, overrides as Partial<BrandTheme>);
    logger.debug('Theme overrides applied', { overrides: Object.keys(overrides) });
  }

  /**
   * Register a custom theme.
   */
  registerTheme(theme: BrandTheme): void {
    validateTheme(theme);
    this.customThemes.set(theme.name, theme);
    logger.info(`Custom theme registered: ${theme.name}`);
  }

  /**
   * Load a theme from a JSON file.
   */
  async loadFromFile(filePath: string): Promise<BrandTheme> {
    const absolutePath = path.resolve(filePath);

    try {
      const content = await readFile(absolutePath, 'utf-8');
      const parsed = JSON.parse(content);

      // If it's a partial theme, merge with default
      const theme = deepMerge(defaultTheme, parsed);
      theme.name = parsed.name || path.basename(filePath, '.json');

      validateTheme(theme);
      this.registerTheme(theme);

      return theme;
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        throw new FileNotFoundError(absolutePath, { context: { type: 'theme file' } });
      }
      if (error instanceof SyntaxError) {
        throw new ValidationError(`Invalid JSON in theme file: ${error.message}`, {
          field: 'file',
        });
      }
      throw error;
    }
  }

  /**
   * Export the current theme to JSON.
   */
  exportTheme(): string {
    return JSON.stringify(this.currentTheme, null, 2);
  }

  /**
   * Get CSS variables for the current theme.
   */
  getCssVariables(): string {
    const theme = this.currentTheme;

    return `
:root {
  /* Colors */
  --cp-primary: ${theme.primary};
  --cp-accent: ${theme.accent};
  --cp-background: ${theme.background};
  --cp-text: ${theme.text};
  --cp-error: ${theme.error};
  --cp-success: ${theme.success};

  /* Font */
  --cp-font-family: ${theme.font.family}, ${theme.font.fallback?.join(', ') || 'sans-serif'};
  --cp-font-weight: ${theme.font.weight || 400};
  --cp-font-weight-bold: ${theme.font.weightBold || 600};

  /* Cursor */
  --cp-cursor-size: ${theme.cursor.size}px;
  --cp-cursor-color: ${theme.cursor.color};
  --cp-cursor-border-color: ${theme.cursor.borderColor || theme.cursor.color};
  --cp-cursor-border-width: ${theme.cursor.borderWidth || 0}px;
  --cp-cursor-shadow: ${theme.cursor.shadow || 'none'};

  /* Ripple */
  --cp-ripple-color: ${theme.ripple.color};
  --cp-ripple-size: ${theme.ripple.size}px;
  --cp-ripple-duration: ${theme.ripple.duration}ms;

  /* Trail */
  --cp-trail-color: ${theme.trail.color};
  --cp-trail-length: ${theme.trail.length};
  --cp-trail-fade: ${theme.trail.fadeDuration}ms;

  /* Focus Ring */
  --cp-focus-color: ${theme.focusRing.color};
  --cp-focus-width: ${theme.focusRing.width}px;
  --cp-focus-padding: ${theme.focusRing.padding}px;
  --cp-focus-radius: ${theme.focusRing.borderRadius}px;

  /* Captions */
  --cp-caption-font-size: ${theme.captions.fontSize}px;
  --cp-caption-color: ${theme.captions.color};
  --cp-caption-bg: ${theme.captions.backgroundColor};
  --cp-caption-bg-opacity: ${theme.captions.backgroundOpacity};
  --cp-caption-padding: ${theme.captions.padding}px;
  --cp-caption-radius: ${theme.captions.borderRadius}px;
  --cp-caption-margin: ${theme.captions.margin}px;

  /* Beats */
  --cp-beat-zoom: ${theme.beats.impactZoom};
  --cp-beat-duration: ${theme.beats.zoomDuration}ms;
}
${theme.customCss || ''}
    `.trim();
  }

  /**
   * Generate overlay styles for the current theme.
   */
  generateOverlayStyles(): string {
    const theme = this.currentTheme;

    return `
${this.getCssVariables()}

.cp-cursor-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999999;
  font-family: var(--cp-font-family);
}

.cp-cursor {
  position: absolute;
  width: var(--cp-cursor-size);
  height: var(--cp-cursor-size);
  background: var(--cp-cursor-color);
  ${theme.cursor.borderWidth ? `border: var(--cp-cursor-border-width) solid var(--cp-cursor-border-color);` : ''}
  border-radius: ${theme.cursor.shape === 'circle' ? '50%' : theme.cursor.shape === 'crosshair' ? '0' : '0'};
  transform: translate(-50%, -50%);
  transition: transform 0.08s ease-out;
  pointer-events: none;
  box-shadow: var(--cp-cursor-shadow);
}

.cp-cursor.clicking {
  transform: translate(-50%, -50%) scale(0.85);
}

.cp-ripple {
  position: absolute;
  width: var(--cp-ripple-size);
  height: var(--cp-ripple-size);
  border: 2px solid var(--cp-ripple-color);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  opacity: 1;
  animation: cp-ripple-anim var(--cp-ripple-duration) ease-out forwards;
  pointer-events: none;
}

@keyframes cp-ripple-anim {
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}

.cp-trail {
  position: absolute;
  width: calc(var(--cp-cursor-size) / 3);
  height: calc(var(--cp-cursor-size) / 3);
  background: var(--cp-trail-color);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0;
  animation: cp-trail-fade var(--cp-trail-fade) ease-out forwards;
}

@keyframes cp-trail-fade {
  0% { opacity: 0.8; }
  100% { opacity: 0; }
}

.cp-focus-ring {
  position: absolute;
  border: var(--cp-focus-width) solid var(--cp-focus-color);
  border-radius: var(--cp-focus-radius);
  transition: all 0.25s ease-out;
  pointer-events: none;
  ${theme.focusRing.animation === 'pulse' ? 'animation: cp-focus-pulse 1.5s ease-in-out infinite;' : ''}
  ${theme.focusRing.animation === 'dashed' ? 'border-style: dashed;' : ''}
}

@keyframes cp-focus-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 0.4; }
}

.cp-caption {
  position: fixed;
  ${theme.captions.position}: var(--cp-caption-margin);
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--cp-caption-font-size);
  color: var(--cp-caption-color);
  background: var(--cp-caption-bg);
  opacity: var(--cp-caption-bg-opacity);
  padding: var(--cp-caption-padding);
  border-radius: var(--cp-caption-radius);
  max-width: 80%;
  text-align: center;
  pointer-events: none;
}

${
  theme.beats.flash && theme.beats.flashColor
    ? `
.cp-flash {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: ${theme.beats.flashColor};
  opacity: 0;
  pointer-events: none;
  animation: cp-flash-anim 0.15s ease-out;
}

@keyframes cp-flash-anim {
  0% { opacity: 0.6; }
  100% { opacity: 0; }
}
`
    : ''
}
    `.trim();
  }

  /**
   * Get available theme names.
   */
  getAvailableThemes(): string[] {
    return [...Object.keys(presetThemes), ...this.customThemes.keys()];
  }
}

/**
 * Default theme manager instance.
 */
export const themeManager = new ThemeManager();
