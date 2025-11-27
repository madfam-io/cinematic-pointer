/**
 * Video Effects Module
 *
 * FFmpeg filter generators for cinematic effects.
 */

// Types
export type {
  VideoInfo,
  ZoomPanKeyframe,
  SpeedSegment,
  MotionBlurSegment,
  DuckingConfig,
} from './types';

// Zoom and pan effects
export { generateZoomPanFilter, generateSimpleZoomFilter } from './zoom';

// Speed effects
export { generateSpeedFilter, generateAudioSpeedFilter, generateSpeedRampFilter } from './speed';

// Video effects (fade, scale, crop, color)
export type { ColorGradePreset } from './video';
export {
  generateFadeFilter,
  generateCrossfadeFilter,
  generateScaleFilter,
  generateCropFilter,
  generateVignetteFilter,
  generateColorGradeFilter,
} from './video';

// Motion blur effects
export {
  generateMotionBlurFilter,
  generateAdaptiveMotionBlurFilter,
  generateSegmentedMotionBlurFilter,
} from './motion';

// Audio effects
export {
  generateAudioDuckingFilter,
  generateSidechainDuckFilter,
  generateAudioFadeFilter,
  generateVolumeFilter,
  generateNormalizeFilter,
  generateAudioProcessingChain,
} from './audio';
