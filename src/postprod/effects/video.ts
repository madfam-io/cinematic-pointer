/**
 * Video Effects
 *
 * FFmpeg filter generators for fades, scaling, cropping, and color grading.
 */

import { calculateCropDimensions, generateCropFilterString } from '../../utils/aspect';

/**
 * Generate fade in/out filter.
 */
export function generateFadeFilter(
  fadeIn?: number, // seconds
  fadeOut?: number, // seconds
  duration?: number, // total duration for fade out calculation
): string {
  const filters: string[] = [];

  if (fadeIn && fadeIn > 0) {
    filters.push(`fade=t=in:st=0:d=${fadeIn}`);
  }

  if (fadeOut && fadeOut > 0 && duration) {
    const startTime = duration - fadeOut;
    filters.push(`fade=t=out:st=${startTime}:d=${fadeOut}`);
  }

  return filters.join(',');
}

/**
 * Generate crossfade transition between two clips.
 */
export function generateCrossfadeFilter(
  duration: number,
  input1: string,
  input2: string,
  output: string,
): string {
  return `${input1}${input2}xfade=transition=fade:duration=${duration}:offset=0${output}`;
}

/**
 * Generate scale filter for resolution changes.
 */
export function generateScaleFilter(
  width: number,
  height: number,
  maintainAspect: boolean = true,
): string {
  if (maintainAspect) {
    return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  }
  return `scale=${width}:${height}`;
}

/**
 * Generate crop filter for aspect ratio changes.
 */
export function generateCropFilter(
  inputWidth: number,
  inputHeight: number,
  targetAspect: number,
  focusX: number = 0.5, // 0-1
  focusY: number = 0.5, // 0-1
): string {
  const crop = calculateCropDimensions(inputWidth, inputHeight, targetAspect, focusX, focusY);
  return generateCropFilterString(crop);
}

/**
 * Generate vignette filter for cinematic look.
 */
export function generateVignetteFilter(intensity: number = 0.3): string {
  const angle = Math.PI / 4 + intensity * (Math.PI / 4);
  return `vignette=angle=${angle}`;
}

/**
 * Color grading preset type.
 */
export type ColorGradePreset = 'warm' | 'cool' | 'dramatic' | 'none';

/**
 * Generate color grading filter for cinematic look.
 */
export function generateColorGradeFilter(preset: ColorGradePreset): string {
  switch (preset) {
    case 'warm':
      return 'colorbalance=rs=0.1:gs=0:bs=-0.1:rm=0.1:gm=0:bm=-0.05';
    case 'cool':
      return 'colorbalance=rs=-0.1:gs=0:bs=0.1:rm=-0.05:gm=0:bm=0.1';
    case 'dramatic':
      return 'eq=contrast=1.1:saturation=0.9:brightness=-0.05';
    default:
      return '';
  }
}
