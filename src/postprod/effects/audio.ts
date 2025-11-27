/**
 * Audio Effects
 *
 * FFmpeg filter generators for audio manipulation.
 */

import { DuckingConfig } from './types';

/**
 * Generate audio ducking filter.
 * Lowers music volume when other audio (like voiceover) is playing.
 */
export function generateAudioDuckingFilter(config: DuckingConfig): string {
  const { duckPoints, attack = 50, release = 200 } = config;

  if (duckPoints.length === 0) {
    return '';
  }

  // Build volume expression with smooth transitions
  const expressions: string[] = [];

  for (const point of duckPoints) {
    const startTime = point.time;
    const endTime = point.time + point.duration;
    const level = point.level;

    // Create smooth duck: attack -> hold -> release
    const attackEnd = startTime + attack / 1000;
    const releaseStart = endTime - release / 1000;

    // Attack phase: 1 -> level
    expressions.push(
      `if(between(t,${startTime},${attackEnd}),1-(1-${level})*(t-${startTime})/${attack / 1000}`,
    );
    // Hold phase: level
    expressions.push(`if(between(t,${attackEnd},${releaseStart}),${level}`);
    // Release phase: level -> 1
    expressions.push(
      `if(between(t,${releaseStart},${endTime}),${level}+(1-${level})*(t-${releaseStart})/${release / 1000}`,
    );
  }

  // Default: full volume
  const expr = expressions.join(',') + ',1' + ')'.repeat(expressions.length);

  return `volume='${expr}'`;
}

/**
 * Generate simple sidechain ducking filter.
 * Ducks audio when another audio stream is present.
 */
export function generateSidechainDuckFilter(
  threshold: number = 0.015,
  ratio: number = 3,
  attack: number = 20,
  release: number = 250,
): string {
  // sidechaincompress: compresses audio based on another audio signal
  return [
    'sidechaincompress=',
    `threshold=${threshold}`,
    `:ratio=${ratio}`,
    `:attack=${attack}`,
    `:release=${release}`,
    ':level_in=1',
    ':level_sc=1',
    ':mix=1',
  ].join('');
}

/**
 * Generate audio fade filter.
 */
export function generateAudioFadeFilter(
  fadeIn?: number,
  fadeOut?: number,
  duration?: number,
): string {
  const filters: string[] = [];

  if (fadeIn && fadeIn > 0) {
    filters.push(`afade=t=in:st=0:d=${fadeIn}`);
  }

  if (fadeOut && fadeOut > 0 && duration) {
    const startTime = Math.max(0, duration - fadeOut);
    filters.push(`afade=t=out:st=${startTime}:d=${fadeOut}`);
  }

  return filters.join(',');
}

/**
 * Generate audio volume adjustment filter.
 */
export function generateVolumeFilter(level: number): string {
  return `volume=${level}`;
}

/**
 * Generate audio normalization filter.
 */
export function generateNormalizeFilter(target: number = -16): string {
  return `loudnorm=I=${target}:TP=-1.5:LRA=11`;
}

/**
 * Generate complete audio processing chain.
 */
export function generateAudioProcessingChain(options: {
  normalize?: boolean;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
  duration?: number;
  ducking?: DuckingConfig;
}): string {
  const filters: string[] = [];

  // Normalize first
  if (options.normalize) {
    filters.push(generateNormalizeFilter());
  }

  // Apply ducking
  if (options.ducking) {
    const duckFilter = generateAudioDuckingFilter(options.ducking);
    if (duckFilter) {
      filters.push(duckFilter);
    }
  }

  // Adjust volume
  if (options.volume !== undefined && options.volume !== 1) {
    filters.push(generateVolumeFilter(options.volume));
  }

  // Apply fades
  const fadeFilter = generateAudioFadeFilter(options.fadeIn, options.fadeOut, options.duration);
  if (fadeFilter) {
    filters.push(fadeFilter);
  }

  return filters.join(',');
}
