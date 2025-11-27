/**
 * Aspect Ratio Utilities
 *
 * Centralized aspect ratio configuration and crop calculations.
 */

/**
 * Aspect ratio configuration.
 */
export interface AspectConfig {
  name: string;
  width: number;
  height: number;
  ratio: number;
}

/**
 * Available aspect ratio presets.
 */
export const aspectRatios: Record<string, AspectConfig> = {
  '16:9': { name: 'Landscape', width: 1920, height: 1080, ratio: 16 / 9 },
  '1:1': { name: 'Square', width: 1080, height: 1080, ratio: 1 },
  '9:16': { name: 'Portrait', width: 1080, height: 1920, ratio: 9 / 16 },
  '4:3': { name: 'Classic', width: 1440, height: 1080, ratio: 4 / 3 },
  '4:5': { name: 'Portrait 4:5', width: 1080, height: 1350, ratio: 4 / 5 },
  '21:9': { name: 'Ultrawide', width: 2560, height: 1080, ratio: 21 / 9 },
};

/**
 * Get aspect configuration by name.
 */
export function getAspectConfig(aspect: string): AspectConfig {
  return aspectRatios[aspect] ?? aspectRatios['16:9'];
}

/**
 * Get all available aspect ratios.
 */
export function getAvailableAspects(): Array<{ name: string; ratio: string; description: string }> {
  return [
    { name: '16:9', ratio: '16:9', description: 'YouTube, TV (1920x1080)' },
    { name: '9:16', ratio: '9:16', description: 'TikTok, Instagram Reels (1080x1920)' },
    { name: '1:1', ratio: '1:1', description: 'Instagram Feed (1080x1080)' },
    { name: '4:3', ratio: '4:3', description: 'Classic TV (1440x1080)' },
    { name: '4:5', ratio: '4:5', description: 'Instagram Portrait (1080x1350)' },
    { name: '21:9', ratio: '21:9', description: 'Ultrawide Cinema (2560x1080)' },
  ];
}

/**
 * Crop dimensions result.
 */
export interface CropDimensions {
  cropWidth: number;
  cropHeight: number;
  cropX: number;
  cropY: number;
}

/**
 * Calculate crop dimensions to achieve target aspect ratio.
 *
 * @param inputWidth - Source video width
 * @param inputHeight - Source video height
 * @param targetAspect - Target aspect ratio (width/height)
 * @param focusX - Normalized focus point X (0-1, default 0.5)
 * @param focusY - Normalized focus point Y (0-1, default 0.5)
 */
export function calculateCropDimensions(
  inputWidth: number,
  inputHeight: number,
  targetAspect: number,
  focusX: number = 0.5,
  focusY: number = 0.5,
): CropDimensions {
  const inputAspect = inputWidth / inputHeight;

  let cropWidth: number;
  let cropHeight: number;

  if (inputAspect > targetAspect) {
    // Input is wider - crop sides
    cropHeight = inputHeight;
    cropWidth = Math.floor(inputHeight * targetAspect);
  } else {
    // Input is taller - crop top/bottom
    cropWidth = inputWidth;
    cropHeight = Math.floor(inputWidth / targetAspect);
  }

  // Calculate crop position based on focus point
  const maxX = inputWidth - cropWidth;
  const maxY = inputHeight - cropHeight;
  const cropX = Math.max(0, Math.min(Math.floor(focusX * maxX), maxX));
  const cropY = Math.max(0, Math.min(Math.floor(focusY * maxY), maxY));

  return { cropWidth, cropHeight, cropX, cropY };
}

/**
 * Calculate center crop dimensions (focus point at center).
 */
export function calculateCenterCrop(
  inputWidth: number,
  inputHeight: number,
  targetAspect: number,
): CropDimensions {
  return calculateCropDimensions(inputWidth, inputHeight, targetAspect, 0.5, 0.5);
}

/**
 * Check if crop is needed to achieve target aspect ratio.
 */
export function needsCrop(
  inputWidth: number,
  inputHeight: number,
  targetAspect: number,
  tolerance: number = 0.01,
): boolean {
  const inputAspect = inputWidth / inputHeight;
  return Math.abs(inputAspect - targetAspect) > tolerance;
}

/**
 * Parse aspect ratio string to numeric ratio.
 */
export function parseAspectRatio(aspect: string): number {
  const config = aspectRatios[aspect];
  if (config) {
    return config.ratio;
  }

  // Try parsing "W:H" format
  const match = aspect.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (match) {
    return parseFloat(match[1]) / parseFloat(match[2]);
  }

  // Default to 16:9
  return 16 / 9;
}

/**
 * Generate FFmpeg crop filter string.
 */
export function generateCropFilterString(crop: CropDimensions): string {
  return `crop=${crop.cropWidth}:${crop.cropHeight}:${crop.cropX}:${crop.cropY}`;
}
