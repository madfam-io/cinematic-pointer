/**
 * Post-Production Templates
 *
 * Preset configurations for different video styles.
 */

import { CaptionStyle } from './captions';

export type TemplateName = 'trailer' | 'howto' | 'teaser';

export interface TemplateConfig {
  name: TemplateName;
  description: string;

  // Timing
  introDuration: number; // seconds
  outroDuration: number; // seconds
  transitionDuration: number; // seconds between segments

  // Visual effects
  enableZoomPan: boolean;
  defaultZoom: number;
  maxZoom: number;
  zoomOnClick: boolean;
  zoomOnCameraMark: boolean;

  // Speed
  baseSpeed: number;
  fastForwardSpeed: number;
  pauseSpeed: number; // Speed during pause steps
  enableSpeedRamps: boolean;

  // Color grading
  colorGrade: 'none' | 'warm' | 'cool' | 'dramatic';
  vignette: number; // 0 = none, 1 = max

  // Fades
  fadeIn: number; // seconds
  fadeOut: number; // seconds

  // Captions
  enableCaptions: boolean;
  captionStyle: CaptionStyle;
  autoGenerateCaptions: boolean;

  // Audio
  musicVolume: number; // 0-1
  preserveAudio: boolean;
  audioFadeIn: number;
  audioFadeOut: number;

  // Output
  quality: 'draft' | 'standard' | 'high';
  framerate: number;
}

/**
 * Trailer template - Punchy, high-energy product showcase.
 */
export const trailerTemplate: TemplateConfig = {
  name: 'trailer',
  description: 'Punchy, high-energy product showcase with dynamic zooms and speed ramps',

  introDuration: 1,
  outroDuration: 2,
  transitionDuration: 0.3,

  enableZoomPan: true,
  defaultZoom: 1.0,
  maxZoom: 1.3,
  zoomOnClick: true,
  zoomOnCameraMark: true,

  baseSpeed: 1.0,
  fastForwardSpeed: 2.0,
  pauseSpeed: 0.5, // Slow motion on important moments
  enableSpeedRamps: true,

  colorGrade: 'dramatic',
  vignette: 0.3,

  fadeIn: 0.5,
  fadeOut: 1.0,

  enableCaptions: true,
  captionStyle: {
    fontFamily: 'Arial',
    fontSize: 56,
    fontColor: 'white',
    position: 'bottom',
    alignment: 'center',
    outline: 3,
    outlineColor: 'black',
    shadow: 2,
    bold: true,
  },
  autoGenerateCaptions: true,

  musicVolume: 0.7,
  preserveAudio: false,
  audioFadeIn: 1,
  audioFadeOut: 2,

  quality: 'high',
  framerate: 30,
};

/**
 * How-to template - Clear, instructional content.
 */
export const howtoTemplate: TemplateConfig = {
  name: 'howto',
  description: 'Clear, instructional video with readable captions and steady pacing',

  introDuration: 2,
  outroDuration: 3,
  transitionDuration: 0.5,

  enableZoomPan: true,
  defaultZoom: 1.0,
  maxZoom: 1.2,
  zoomOnClick: true,
  zoomOnCameraMark: true,

  baseSpeed: 1.0,
  fastForwardSpeed: 1.5,
  pauseSpeed: 1.0,
  enableSpeedRamps: false, // Steady pacing for tutorials

  colorGrade: 'none',
  vignette: 0,

  fadeIn: 1.0,
  fadeOut: 1.5,

  enableCaptions: true,
  captionStyle: {
    fontFamily: 'Arial',
    fontSize: 42,
    fontColor: 'white',
    backgroundColor: 'black@0.7',
    position: 'bottom',
    alignment: 'center',
    outline: 2,
    outlineColor: 'black',
    shadow: 0,
    bold: false,
  },
  autoGenerateCaptions: true,

  musicVolume: 0.3,
  preserveAudio: true, // Keep system sounds for tutorials
  audioFadeIn: 0.5,
  audioFadeOut: 1,

  quality: 'standard',
  framerate: 30,
};

/**
 * Teaser template - Short, attention-grabbing clips.
 */
export const teaserTemplate: TemplateConfig = {
  name: 'teaser',
  description: 'Short, attention-grabbing clip with fast cuts and dramatic effects',

  introDuration: 0.5,
  outroDuration: 1,
  transitionDuration: 0.2,

  enableZoomPan: true,
  defaultZoom: 1.1, // Slightly zoomed for intimacy
  maxZoom: 1.5,
  zoomOnClick: true,
  zoomOnCameraMark: true,

  baseSpeed: 1.2, // Slightly faster base
  fastForwardSpeed: 3.0, // Quick fast-forwards
  pauseSpeed: 0.3, // Dramatic slow-mo
  enableSpeedRamps: true,

  colorGrade: 'dramatic',
  vignette: 0.5,

  fadeIn: 0.3,
  fadeOut: 0.5,

  enableCaptions: false, // Minimal text for teasers
  captionStyle: {
    fontFamily: 'Arial',
    fontSize: 64,
    fontColor: 'white',
    position: 'center',
    alignment: 'center',
    outline: 4,
    outlineColor: 'black',
    shadow: 3,
    bold: true,
  },
  autoGenerateCaptions: false,

  musicVolume: 0.9,
  preserveAudio: false,
  audioFadeIn: 0.5,
  audioFadeOut: 0.5,

  quality: 'high',
  framerate: 60, // Higher framerate for smooth slow-mo
};

/**
 * Get template by name.
 */
export function getTemplate(name: TemplateName): TemplateConfig {
  switch (name) {
    case 'trailer':
      return trailerTemplate;
    case 'howto':
      return howtoTemplate;
    case 'teaser':
      return teaserTemplate;
    default:
      return trailerTemplate;
  }
}

/**
 * Get all available templates.
 */
export function getAllTemplates(): TemplateConfig[] {
  return [trailerTemplate, howtoTemplate, teaserTemplate];
}

/**
 * Quality presets for encoding.
 */
export interface QualityPreset {
  crf: number;
  preset: string;
  videoBitrate?: string;
  audioBitrate: string;
}

export function getQualityPreset(quality: 'draft' | 'standard' | 'high'): QualityPreset {
  switch (quality) {
    case 'draft':
      return {
        crf: 28,
        preset: 'ultrafast',
        audioBitrate: '128k',
      };
    case 'standard':
      return {
        crf: 23,
        preset: 'medium',
        audioBitrate: '192k',
      };
    case 'high':
      return {
        crf: 18,
        preset: 'slow',
        audioBitrate: '256k',
      };
    default:
      return {
        crf: 23,
        preset: 'medium',
        audioBitrate: '192k',
      };
  }
}

// Re-export aspect ratio utilities from centralized location
export { type AspectConfig, aspectRatios, getAspectConfig } from '../utils/aspect';
