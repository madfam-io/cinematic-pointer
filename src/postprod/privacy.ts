/**
 * Privacy & Blur Maps Module
 *
 * Handles redaction of sensitive areas in videos using blur, mosaic, or solid overlays.
 */

import { UesEvent, Selector } from '../types';

/**
 * Redaction region definition.
 */
export interface RedactionRegion {
  /** Unique ID for this region */
  id: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds (optional, defaults to video end) */
  endTime?: number;
  /** Region type */
  type: 'fixed' | 'selector' | 'dynamic';
  /** For fixed regions: coordinates */
  coords?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** For selector-based regions: the selector */
  selector?: Selector;
  /** Padding around the region in pixels */
  padding?: number;
  /** Redaction style */
  style: RedactionStyle;
}

/**
 * Redaction style options.
 */
export interface RedactionStyle {
  /** Style type */
  type: 'blur' | 'mosaic' | 'solid' | 'pixelate';
  /** Blur strength (1-100) */
  strength?: number;
  /** Solid color (for solid type) */
  color?: string;
  /** Feather edge (pixels) */
  feather?: number;
}

/**
 * Blur map configuration.
 */
export interface BlurMapConfig {
  /** Regions to redact */
  regions: RedactionRegion[];
  /** Global selectors to always blur (e.g., [placeholder="password"]) */
  globalSelectors?: Selector[];
  /** Auto-detect sensitive content */
  autoDetect?: {
    /** Detect password fields */
    passwords?: boolean;
    /** Detect credit card inputs */
    creditCards?: boolean;
    /** Detect email inputs */
    emails?: boolean;
    /** Custom patterns */
    patterns?: string[];
  };
}

/**
 * Resolved region with pixel coordinates.
 */
export interface ResolvedRegion {
  id: string;
  startFrame: number;
  endFrame?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  style: RedactionStyle;
}

/**
 * Generate FFmpeg filter for blur map.
 */
export function generateBlurFilter(
  regions: ResolvedRegion[],
  _videoWidth: number,
  _videoHeight: number,
  _fps: number,
  totalFrames: number,
): string {
  if (regions.length === 0) {
    return '';
  }

  const filters: string[] = [];

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const endFrame = region.endFrame ?? totalFrames;

    // Generate the blur/mosaic effect
    let effectFilter: string;

    switch (region.style.type) {
      case 'blur': {
        const blurStrength = Math.min(100, Math.max(1, region.style.strength ?? 30));
        const sigma = blurStrength / 5;
        effectFilter = `boxblur=${sigma}:${sigma}`;
        break;
      }

      case 'mosaic':
      case 'pixelate': {
        const blockSize = Math.max(4, Math.floor((region.style.strength ?? 20) / 2));
        effectFilter = `scale=iw/${blockSize}:ih/${blockSize}:flags=neighbor,scale=iw*${blockSize}:ih*${blockSize}:flags=neighbor`;
        break;
      }

      case 'solid': {
        const color = region.style.color ?? 'black';
        effectFilter = `drawbox=x=0:y=0:w=iw:h=ih:color=${color}:t=fill`;
        break;
      }

      default:
        effectFilter = 'boxblur=10:10';
    }

    // Crop the region, apply effect, then overlay back
    const regionFilter = [
      // Source split
      `[0:v]split=2[base${i}][blur${i}]`,
      // Crop the region
      `[blur${i}]crop=${region.width}:${region.height}:${region.x}:${region.y}[cropped${i}]`,
      // Apply effect
      `[cropped${i}]${effectFilter}[blurred${i}]`,
      // Overlay with time enable
      `[base${i}][blurred${i}]overlay=${region.x}:${region.y}:enable='between(n,${region.startFrame},${endFrame})'[out${i}]`,
    ].join(';');

    filters.push(regionFilter);
  }

  // For multiple regions, chain them together
  if (regions.length === 1) {
    return filters[0].replace('[out0]', '');
  }

  // Chain multiple region filters
  let chainedFilter = filters[0];
  for (let i = 1; i < filters.length; i++) {
    chainedFilter = chainedFilter.replace(`[out${i - 1}]`, '');
    chainedFilter += `;[out${i - 1}]` + filters[i].split(';').slice(1).join(';');
  }

  return chainedFilter.replace(`[out${regions.length - 1}]`, '');
}

/**
 * Simple blur filter for a single region.
 */
export function generateSimpleBlurFilter(
  x: number,
  y: number,
  width: number,
  height: number,
  strength: number = 30,
): string {
  const sigma = Math.min(100, Math.max(1, strength)) / 5;

  return [
    `split[base][blur]`,
    `[blur]crop=${width}:${height}:${x}:${y},boxblur=${sigma}:${sigma}[blurred]`,
    `[base][blurred]overlay=${x}:${y}`,
  ].join(';');
}

/**
 * Extract blur regions from UES events.
 *
 * @param events - UES events from recording
 * @param config - Blur map configuration
 * @param videoWidth - Video width in pixels
 * @param videoHeight - Video height in pixels
 * @param fps - Video frame rate (defaults to 30)
 */
export function extractBlurRegionsFromEvents(
  events: UesEvent[],
  config: BlurMapConfig,
  videoWidth: number,
  videoHeight: number,
  fps: number = 30,
): ResolvedRegion[] {
  const resolved: ResolvedRegion[] = [];

  // Process fixed regions
  for (const region of config.regions) {
    if (region.type === 'fixed' && region.coords) {
      const padding = region.padding ?? 0;
      resolved.push({
        id: region.id,
        startFrame: 0,
        x: Math.max(0, region.coords.x - padding),
        y: Math.max(0, region.coords.y - padding),
        width: Math.min(videoWidth, region.coords.width + padding * 2),
        height: Math.min(videoHeight, region.coords.height + padding * 2),
        style: region.style,
      });
    }
  }

  // Process events for selector-based and dynamic regions
  for (const event of events) {
    // Check for input fill events that may need masking
    if (event.t === 'input.fill') {
      // Find corresponding region with matching selector
      const inputRegion = config.regions.find(
        (r) => r.type === 'selector' && matchesSelector(r.selector, event.selector),
      );

      // Use 'to' coordinates if available (cursor position during input)
      if (inputRegion && event.to && event.to.length >= 2) {
        const [x, y] = event.to;
        const padding = inputRegion.padding ?? 8;

        resolved.push({
          id: `input-${event.ts}`,
          startFrame: Math.floor((event.ts / 1000) * fps),
          x: Math.max(0, x - padding),
          y: Math.max(0, y - padding),
          width: 200 + padding * 2, // Approximate input width
          height: 40 + padding * 2, // Approximate input height
          style: inputRegion.style,
        });
      }
    }
  }

  return resolved;
}

/**
 * Check if an event selector matches a region selector.
 */
function matchesSelector(regionSelector: Selector | undefined, eventSelector: unknown): boolean {
  if (!regionSelector || !eventSelector) return false;

  const evtSel = eventSelector as Record<string, string>;

  // Check by selector type
  if (regionSelector.by && evtSel.by === regionSelector.by) {
    return regionSelector.value === evtSel.value;
  }

  // Check by placeholder
  if (regionSelector.placeholder && evtSel.placeholder) {
    return regionSelector.placeholder === evtSel.placeholder;
  }

  // Check by role
  if (regionSelector.role && evtSel.role) {
    return regionSelector.role === evtSel.role && regionSelector.name === evtSel.name;
  }

  return false;
}

/**
 * Auto-detect sensitive selectors.
 */
export function generateAutoDetectSelectors(config: BlurMapConfig['autoDetect']): Selector[] {
  const selectors: Selector[] = [];

  if (!config) return selectors;

  if (config.passwords) {
    selectors.push(
      { by: 'css', value: 'input[type="password"]' },
      { placeholder: 'password' },
      { placeholder: 'Password' },
    );
  }

  if (config.creditCards) {
    selectors.push(
      { by: 'css', value: 'input[name*="card"]' },
      { by: 'css', value: 'input[name*="cc"]' },
      { by: 'css', value: 'input[autocomplete*="cc-"]' },
      { placeholder: 'Card number' },
      { placeholder: 'CVV' },
      { placeholder: 'CVC' },
    );
  }

  if (config.emails) {
    selectors.push(
      { by: 'css', value: 'input[type="email"]' },
      { placeholder: 'email' },
      { placeholder: 'Email' },
    );
  }

  // Custom patterns would be converted to CSS selectors
  if (config.patterns) {
    for (const pattern of config.patterns) {
      selectors.push({ by: 'css', value: pattern });
    }
  }

  return selectors;
}

/**
 * Create a blur map configuration from journey DSL.
 */
export function createBlurMapFromJourney(
  steps: Array<{ action: string; mask?: boolean; locator?: Selector }>,
  defaultStyle: RedactionStyle = { type: 'blur', strength: 30 },
): BlurMapConfig {
  const regions: RedactionRegion[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    if (step.mask && step.locator) {
      regions.push({
        id: `step-${i}`,
        startTime: 0,
        type: 'selector',
        selector: step.locator,
        padding: 8,
        style: defaultStyle,
      });
    }
  }

  return {
    regions,
    autoDetect: {
      passwords: true,
      creditCards: true,
    },
  };
}

/**
 * Validate blur map configuration.
 */
export function validateBlurMap(config: BlurMapConfig): string[] {
  const errors: string[] = [];

  for (const region of config.regions) {
    if (!region.id) {
      errors.push('Region missing id');
    }

    if (region.type === 'fixed' && !region.coords) {
      errors.push(`Region ${region.id}: fixed type requires coords`);
    }

    if (region.type === 'selector' && !region.selector) {
      errors.push(`Region ${region.id}: selector type requires selector`);
    }

    if (!region.style) {
      errors.push(`Region ${region.id}: missing style`);
    }
  }

  return errors;
}

/**
 * Export types for external use.
 */
export type { Selector };
