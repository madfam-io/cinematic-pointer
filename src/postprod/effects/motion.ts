/**
 * Motion Blur Effects
 *
 * FFmpeg filter generators for motion blur effects.
 */

import { MotionBlurSegment } from './types';

/**
 * Generate motion blur filter using tblend.
 * Creates a trailing effect by blending consecutive frames.
 */
export function generateMotionBlurFilter(strength: number = 0.5): string {
  // Clamp strength between 0 and 1
  const s = Math.max(0, Math.min(1, strength));

  // Calculate blend factor (0.5 = 50% current, 50% previous)
  const blendFactor = s * 0.5;

  // tblend blends the current frame with the previous frame
  // Using average mode with adjusted weights for motion blur effect
  return `tblend=all_mode=average:all_opacity=${blendFactor}`;
}

/**
 * Generate adaptive motion blur based on cursor velocity.
 * Uses minterpolate for smoother motion blur effect.
 */
export function generateAdaptiveMotionBlurFilter(fps: number = 30): string {
  // minterpolate can create motion blur by generating intermediate frames
  // mi_mode=blend creates a blur effect
  return `minterpolate=fps=${fps * 2}:mi_mode=blend,fps=${fps}`;
}

/**
 * Generate segment-based motion blur.
 * Applies blur only during specified time segments.
 */
export function generateSegmentedMotionBlurFilter(segments: MotionBlurSegment[]): string {
  if (segments.length === 0) {
    return '';
  }

  // Build enable expression for when blur should be active
  const enableExprs = segments.map((seg) => `between(t,${seg.start},${seg.end})`);
  const enableExpr = enableExprs.join('+');

  // Use average strength across segments for simplicity
  const avgStrength = segments.reduce((sum, seg) => sum + seg.strength, 0) / segments.length;
  const blendFactor = avgStrength * 0.5;

  return `tblend=all_mode=average:all_opacity=${blendFactor}:enable='${enableExpr}'`;
}
