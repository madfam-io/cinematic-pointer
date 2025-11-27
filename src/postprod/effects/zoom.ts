/**
 * Zoom and Pan Effects
 *
 * FFmpeg filter generators for zoom, pan, and Ken Burns effects.
 */

import { VideoInfo, ZoomPanKeyframe } from './types';

/**
 * Build an FFmpeg expression for interpolating between keyframes.
 */
function buildKeyframeExpression(
  keyframes: ZoomPanKeyframe[],
  fps: number,
  property: 'zoom' | 'x' | 'y',
  defaultValue: number,
): string {
  if (keyframes.length === 0) {
    return String(defaultValue);
  }

  if (keyframes.length === 1) {
    return String(keyframes[0][property]);
  }

  // Build nested if expressions for each segment
  const expressions: string[] = [];

  for (let i = 0; i < keyframes.length - 1; i++) {
    const kf1 = keyframes[i];
    const kf2 = keyframes[i + 1];
    const startFrame = Math.floor(kf1.time * fps);
    const endFrame = Math.floor(kf2.time * fps);
    const v1 = kf1[property];
    const v2 = kf2[property];

    // Linear interpolation between keyframes
    const progress = `(on-${startFrame})/${endFrame - startFrame}`;
    const interp = `${v1}+(${v2}-${v1})*${progress}`;

    expressions.push(`if(between(on,${startFrame},${endFrame}),${interp}`);
  }

  // Close all if statements and add default
  const lastValue = keyframes[keyframes.length - 1][property];
  return expressions.join(',') + `,${lastValue}` + ')'.repeat(expressions.length);
}

/**
 * Generate FFmpeg zoompan filter for Ken Burns effect.
 */
export function generateZoomPanFilter(
  keyframes: ZoomPanKeyframe[],
  video: VideoInfo,
  outputSize?: { width: number; height: number },
): string {
  if (keyframes.length === 0) {
    return '';
  }

  const outW = outputSize?.width ?? video.width;
  const outH = outputSize?.height ?? video.height;
  const totalFrames = Math.ceil(video.duration * video.fps);

  // Sort keyframes by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Build expression for zoom based on keyframes
  const zoomExpr = buildKeyframeExpression(sorted, video.fps, 'zoom', 1);
  const xExpr = buildKeyframeExpression(sorted, video.fps, 'x', 0.5);
  const yExpr = buildKeyframeExpression(sorted, video.fps, 'y', 0.5);

  // Calculate zoom and position expressions
  // zoompan expects: z=zoom, x=pan_x, y=pan_y
  const filter = [
    `zoompan=`,
    `z='${zoomExpr}'`,
    `:x='iw/2-(iw/zoom/2)+((${xExpr})-0.5)*iw/zoom'`,
    `:y='ih/2-(ih/zoom/2)+((${yExpr})-0.5)*ih/zoom'`,
    `:d=${totalFrames}`,
    `:s=${outW}x${outH}`,
    `:fps=${video.fps}`,
  ].join('');

  return filter;
}

/**
 * Generate a simple zoom effect centered on a region.
 */
export function generateSimpleZoomFilter(
  startZoom: number,
  endZoom: number,
  centerX: number, // 0-1
  centerY: number, // 0-1
  video: VideoInfo,
  duration?: number,
): string {
  const d = duration ?? video.duration;
  const totalFrames = Math.ceil(d * video.fps);

  // Interpolate zoom over duration
  const zoomExpr = `${startZoom}+(${endZoom}-${startZoom})*on/${totalFrames}`;

  // Pan to keep center point in view
  const xExpr = `iw/2-(iw/zoom/2)+${centerX - 0.5}*iw/zoom`;
  const yExpr = `ih/2-(ih/zoom/2)+${centerY - 0.5}*ih/zoom`;

  return `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:s=${video.width}x${video.height}:fps=${video.fps}`;
}
