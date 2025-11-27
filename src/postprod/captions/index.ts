/**
 * Caption Module
 *
 * Subtitle generation and manipulation for video post-production.
 */

// Types
export type { Caption, CaptionStyle, CaptionFormat } from './types';
export { defaultCaptionStyle } from './types';

// Format generation
export {
  generateASSSubtitles,
  generateSRTSubtitles,
  generateVTTSubtitles,
  writeCaptionsToFile,
  writeSRTToFile,
  writeVTTToFile,
  exportAllCaptionFormats,
  exportCaptions,
} from './formats';

// Extraction
export { extractCaptionsFromEvents, generateCaptionsFromSteps } from './extraction';

// FFmpeg filters
export { generateDrawTextFilter, generateSubtitlesFilter } from './filters';

// Manipulation
export {
  mergeCaptions,
  splitLongCaptions,
  offsetCaptions,
  scaleCaptionTimes,
  filterCaptionsByTimeRange,
} from './manipulation';
