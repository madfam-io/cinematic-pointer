/**
 * Caption FFmpeg Filters
 *
 * Generate FFmpeg filters for caption rendering.
 */

import { CaptionStyle, defaultCaptionStyle } from './types';

/**
 * Generate FFmpeg drawtext filter for captions.
 * Note: For complex captions, using subtitles filter with ASS is preferred.
 */
export function generateDrawTextFilter(
  text: string,
  startTime: number,
  endTime: number,
  style: CaptionStyle = defaultCaptionStyle,
): string {
  const mergedStyle = { ...defaultCaptionStyle, ...style };

  // Calculate y position
  let yPos: string;
  switch (mergedStyle.position) {
    case 'top':
      yPos = '50';
      break;
    case 'center':
      yPos = '(h-th)/2';
      break;
    case 'bottom':
    default:
      yPos = 'h-th-50';
  }

  // Calculate x position
  let xPos: string;
  switch (mergedStyle.alignment) {
    case 'left':
      xPos = '50';
      break;
    case 'right':
      xPos = 'w-tw-50';
      break;
    case 'center':
    default:
      xPos = '(w-tw)/2';
  }

  const escapedText = text.replace(/'/g, "'\\''").replace(/:/g, '\\:');

  return [
    `drawtext=text='${escapedText}'`,
    `:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`,
    `:fontsize=${mergedStyle.fontSize}`,
    `:fontcolor=${mergedStyle.fontColor}`,
    `:x=${xPos}`,
    `:y=${yPos}`,
    `:enable='between(t,${startTime},${endTime})'`,
    mergedStyle.outline
      ? `:borderw=${mergedStyle.outline}:bordercolor=${mergedStyle.outlineColor}`
      : '',
    mergedStyle.shadow ? `:shadowx=${mergedStyle.shadow}:shadowy=${mergedStyle.shadow}` : '',
  ]
    .filter(Boolean)
    .join('');
}

/**
 * Generate subtitles filter to overlay ASS file.
 */
export function generateSubtitlesFilter(assFilePath: string): string {
  // Escape special characters in path
  const escapedPath = assFilePath.replace(/([\\:'])/g, '\\$1');
  return `subtitles='${escapedPath}'`;
}
