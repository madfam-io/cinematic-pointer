/**
 * Shared Effect Types
 */

export interface VideoInfo {
  width: number;
  height: number;
  duration: number;
  fps: number;
}

export interface ZoomPanKeyframe {
  time: number; // seconds
  zoom: number; // 1.0 = 100%, 1.5 = 150%
  x: number; // focus x coordinate (0-1 normalized)
  y: number; // focus y coordinate (0-1 normalized)
  ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface SpeedSegment {
  start: number; // seconds
  end: number; // seconds
  speed: number; // 1.0 = normal, 2.0 = 2x, 0.5 = half
}

export interface MotionBlurSegment {
  start: number; // seconds
  end: number; // seconds
  strength: number; // 0-1, where 1 is maximum blur
}

export interface DuckingConfig {
  /** Times when ducking should occur (in seconds) */
  duckPoints: Array<{
    time: number;
    duration: number;
    level: number; // 0-1, target volume level during duck
  }>;
  /** Attack time in ms */
  attack?: number;
  /** Release time in ms */
  release?: number;
}
