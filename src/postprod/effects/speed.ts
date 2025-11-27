/**
 * Speed Effects
 *
 * FFmpeg filter generators for speed manipulation and time remapping.
 */

import { SpeedSegment, VideoInfo } from './types';

/**
 * Generate setpts filter for speed changes.
 */
export function generateSpeedFilter(segments: SpeedSegment[]): string {
  if (segments.length === 0) {
    return '';
  }

  // Sort segments by start time
  const sorted = [...segments].sort((a, b) => a.start - b.start);

  // Build expression for PTS adjustment
  // setpts adjusts presentation timestamps
  // PTS/speed makes video faster (speed > 1) or slower (speed < 1)
  const expressions: string[] = [];

  for (const seg of sorted) {
    const startPts = seg.start;
    const endPts = seg.end;
    const factor = 1 / seg.speed; // PTS factor is inverse of speed

    expressions.push(`if(between(T,${startPts},${endPts}),PTS*${factor}`);
  }

  // Default: normal speed
  const expr = expressions.join(',') + ',PTS' + ')'.repeat(expressions.length);

  return `setpts='${expr}'`;
}

/**
 * Generate atempo filter for audio speed changes.
 * Note: atempo only supports values between 0.5 and 2.0,
 * so we chain multiple filters for larger changes.
 */
export function generateAudioSpeedFilter(speed: number): string {
  const filters: string[] = [];
  let remaining = speed;

  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }

  if (remaining !== 1.0) {
    filters.push(`atempo=${remaining}`);
  }

  return filters.length > 0 ? filters.join(',') : '';
}

/**
 * Generate a smooth speed ramp (slow to fast or vice versa).
 */
export function generateSpeedRampFilter(
  startSpeed: number,
  endSpeed: number,
  video: VideoInfo,
): string {
  // Create a smooth speed transition using setpts
  // The expression needs to integrate speed over time
  const duration = video.duration;

  // Linear speed ramp: speed(t) = startSpeed + (endSpeed - startSpeed) * t / duration
  // PTS = integral of 1/speed dt
  // For linear ramp, this involves logarithmic integration

  // Simplified: use discrete segments
  const numSegments = 10;
  const segments: SpeedSegment[] = [];

  for (let i = 0; i < numSegments; i++) {
    const t1 = (i / numSegments) * duration;
    const t2 = ((i + 1) / numSegments) * duration;
    const avgT = (t1 + t2) / 2;
    const speed = startSpeed + ((endSpeed - startSpeed) * avgT) / duration;

    segments.push({ start: t1, end: t2, speed });
  }

  return generateSpeedFilter(segments);
}
