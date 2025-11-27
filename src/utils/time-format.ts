/**
 * Time Formatting Utilities
 *
 * Consistent time formatting for various subtitle and media formats.
 */

/**
 * Time components for formatting.
 */
export interface TimeComponents {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

/**
 * Parse seconds into time components.
 */
export function parseTimeComponents(totalSeconds: number): TimeComponents {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);

  return { hours, minutes, seconds, milliseconds };
}

/**
 * Time formatter with multiple output format support.
 */
export const TimeFormatter = {
  /**
   * Format time as ASS timestamp (H:MM:SS.CC).
   * ASS uses centiseconds (hundredths of a second).
   */
  ass(totalSeconds: number): string {
    const { hours, minutes, seconds, milliseconds } = parseTimeComponents(totalSeconds);
    const centiseconds = Math.floor(milliseconds / 10);
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  },

  /**
   * Format time as SRT timestamp (HH:MM:SS,mmm).
   * SRT uses comma as decimal separator and milliseconds.
   */
  srt(totalSeconds: number): string {
    const { hours, minutes, seconds, milliseconds } = parseTimeComponents(totalSeconds);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
  },

  /**
   * Format time as WebVTT timestamp (HH:MM:SS.mmm).
   * VTT uses period as decimal separator and milliseconds.
   */
  vtt(totalSeconds: number): string {
    const { hours, minutes, seconds, milliseconds } = parseTimeComponents(totalSeconds);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  },

  /**
   * Format time as FFmpeg timestamp (HH:MM:SS.mmm).
   * Same as VTT format.
   */
  ffmpeg(totalSeconds: number): string {
    return TimeFormatter.vtt(totalSeconds);
  },

  /**
   * Format duration for display (e.g., "1h 23m 45s" or "2m 30s").
   */
  display(totalSeconds: number): string {
    const { hours, minutes, seconds } = parseTimeComponents(totalSeconds);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  },

  /**
   * Format duration with milliseconds for display (e.g., "2m 30.5s").
   */
  displayPrecise(totalSeconds: number): string {
    const { hours, minutes, seconds, milliseconds } = parseTimeComponents(totalSeconds);
    const secondsWithMs = seconds + milliseconds / 1000;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secondsWithMs.toFixed(1)}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secondsWithMs.toFixed(1)}s`;
    } else {
      return `${secondsWithMs.toFixed(1)}s`;
    }
  },
};
