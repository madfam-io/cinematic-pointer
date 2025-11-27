/**
 * Post-Production Pipeline
 *
 * Orchestrates video processing with effects, captions, and music.
 */

import { mkdir, readFile, access, rm } from 'fs/promises';
import path from 'path';

import { UesEvent } from '../types';

import {
  Caption,
  generateCaptionsFromSteps,
  extractCaptionsFromEvents,
  writeCaptionsToFile,
  generateSubtitlesFilter,
} from './captions';
import {
  generateZoomPanFilter,
  generateFadeFilter,
  generateColorGradeFilter,
  generateVignetteFilter,
  generateScaleFilter,
  ZoomPanKeyframe,
  VideoInfo,
} from './effects';
import { ffmpeg, probe, checkFFmpegAvailable } from './ffmpeg';
import {
  TemplateConfig,
  getTemplate,
  getQualityPreset,
  getAspectConfig,
  TemplateName,
} from './templates';

export interface PipelineOptions {
  videoPath: string;
  eventsPath: string;
  outputPath: string;
  template?: TemplateName;
  musicPath?: string;
  captions?: 'auto' | 'none' | Caption[];
  aspect?: string;
  onProgress?: (progress: PipelineProgress) => void;
}

export interface PipelineProgress {
  stage: string;
  percent: number;
  message: string;
}

export interface PipelineResult {
  outputPath: string;
  duration: number;
  stages: string[];
}

/**
 * Main post-production pipeline.
 */
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const stages: string[] = [];
  const startTime = Date.now();

  // Validate FFmpeg
  const ffmpegAvailable = await checkFFmpegAvailable();
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg is not available. Please install FFmpeg 6.0 or higher.');
  }

  // Load template
  const template = getTemplate(options.template ?? 'trailer');
  options.onProgress?.({ stage: 'init', percent: 0, message: 'Loading configuration...' });

  // Probe video
  const videoInfo = await probe(options.videoPath);
  if (!videoInfo.width || !videoInfo.height) {
    throw new Error('Could not determine video dimensions');
  }

  const video: VideoInfo = {
    width: videoInfo.width,
    height: videoInfo.height,
    duration: videoInfo.duration,
    fps: videoInfo.fps ?? 30,
  };

  stages.push('Video probed');

  // Load events
  const eventsContent = await readFile(options.eventsPath, 'utf-8');
  const events: UesEvent[] = eventsContent
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

  stages.push('Events loaded');

  // Set up temp directory
  const tempDir = path.join(path.dirname(options.outputPath), '.temp');
  await mkdir(tempDir, { recursive: true });

  try {
    // Build filter chain
    const filters: string[] = [];
    let currentLabel = '[0:v]';
    let labelCounter = 0;

    // 1. Apply zoom/pan effects
    if (template.enableZoomPan) {
      options.onProgress?.({ stage: 'zoom', percent: 10, message: 'Applying zoom effects...' });

      const keyframes = extractZoomKeyframes(events, video, template);
      if (keyframes.length > 0) {
        const zoomFilter = generateZoomPanFilter(keyframes, video);
        if (zoomFilter) {
          filters.push(`${currentLabel}${zoomFilter}[zoom${labelCounter}]`);
          currentLabel = `[zoom${labelCounter}]`;
          labelCounter++;
          stages.push('Zoom effects applied');
        }
      }
    }

    // 2. Apply aspect ratio crop/scale if needed
    if (options.aspect && options.aspect !== '16:9') {
      options.onProgress?.({ stage: 'aspect', percent: 20, message: 'Adjusting aspect ratio...' });

      const aspectConfig = getAspectConfig(options.aspect);
      const scaleFilter = generateScaleFilter(aspectConfig.width, aspectConfig.height, true);
      filters.push(`${currentLabel}${scaleFilter}[scale${labelCounter}]`);
      currentLabel = `[scale${labelCounter}]`;
      labelCounter++;
      stages.push(`Aspect ratio set to ${options.aspect}`);
    }

    // 3. Apply color grading
    if (template.colorGrade !== 'none') {
      options.onProgress?.({ stage: 'color', percent: 30, message: 'Applying color grading...' });

      const colorFilter = generateColorGradeFilter(template.colorGrade);
      if (colorFilter) {
        filters.push(`${currentLabel}${colorFilter}[color${labelCounter}]`);
        currentLabel = `[color${labelCounter}]`;
        labelCounter++;
        stages.push('Color grading applied');
      }
    }

    // 4. Apply vignette
    if (template.vignette > 0) {
      const vignetteFilter = generateVignetteFilter(template.vignette);
      filters.push(`${currentLabel}${vignetteFilter}[vignette${labelCounter}]`);
      currentLabel = `[vignette${labelCounter}]`;
      labelCounter++;
      stages.push('Vignette applied');
    }

    // 5. Apply fades
    const fadeFilter = generateFadeFilter(template.fadeIn, template.fadeOut, video.duration);
    if (fadeFilter) {
      filters.push(`${currentLabel}${fadeFilter}[fade${labelCounter}]`);
      currentLabel = `[fade${labelCounter}]`;
      labelCounter++;
      stages.push('Fades applied');
    }

    // 6. Generate captions
    let captionsPath: string | null = null;
    if (template.enableCaptions && options.captions !== 'none') {
      options.onProgress?.({ stage: 'captions', percent: 50, message: 'Generating captions...' });

      let captions: Caption[];
      if (Array.isArray(options.captions)) {
        captions = options.captions;
      } else if (options.captions === 'auto' || template.autoGenerateCaptions) {
        captions = generateCaptionsFromSteps(events);
        if (captions.length === 0) {
          captions = extractCaptionsFromEvents(events);
        }
      } else {
        captions = [];
      }

      if (captions.length > 0) {
        captionsPath = path.join(tempDir, 'captions.ass');
        await writeCaptionsToFile(
          captions,
          captionsPath,
          video.width,
          video.height,
          template.captionStyle,
        );

        const subtitlesFilter = generateSubtitlesFilter(captionsPath);
        filters.push(`${currentLabel}${subtitlesFilter}[subs${labelCounter}]`);
        currentLabel = `[subs${labelCounter}]`;
        labelCounter++;
        stages.push(`${captions.length} captions added`);
      }
    }

    // Build FFmpeg command
    options.onProgress?.({ stage: 'encode', percent: 60, message: 'Encoding video...' });

    const qualityPreset = getQualityPreset(template.quality);
    const cmd = ffmpeg().overwrite().input(options.videoPath);

    // Add music if provided
    if (options.musicPath) {
      try {
        await access(options.musicPath);
        cmd.input(options.musicPath, ['-stream_loop', '-1']); // Loop music
        stages.push('Music added');
      } catch {
        // Music file not found, continue without
      }
    }

    // Add filter complex
    if (filters.length > 0) {
      // Rename final output
      const lastFilter = filters[filters.length - 1];
      const finalLabel = lastFilter.match(/\[([^\]]+)\]$/)?.[1];
      if (finalLabel) {
        filters[filters.length - 1] = lastFilter.replace(/\[[^\]]+\]$/, '[vout]');
      }
      cmd.complexFilter(filters).map('[vout]');
    } else {
      cmd.map('0:v');
    }

    // Audio handling
    if (options.musicPath && template.musicVolume > 0) {
      // Mix music with original audio or replace
      const audioFilters: string[] = [];

      if (template.preserveAudio) {
        audioFilters.push(`[0:a]volume=0.3[orig]`);
        audioFilters.push(`[1:a]volume=${template.musicVolume}[music]`);
        audioFilters.push(`[orig][music]amix=inputs=2:duration=first[aout]`);
      } else {
        audioFilters.push(
          `[1:a]volume=${template.musicVolume},afade=t=in:st=0:d=${template.audioFadeIn},afade=t=out:st=${video.duration - template.audioFadeOut}:d=${template.audioFadeOut}[aout]`,
        );
      }

      cmd.complexFilter(audioFilters).map('[aout]');
    } else if (template.preserveAudio) {
      cmd.map('0:a?');
    }

    // Output settings
    cmd
      .videoCodec('libx264')
      .crf(qualityPreset.crf)
      .preset(qualityPreset.preset)
      .pixelFormat('yuv420p')
      .fps(template.framerate)
      .audioCodec('aac')
      .audioBitrate(qualityPreset.audioBitrate)
      .duration(video.duration)
      .output(options.outputPath);

    // Execute
    await cmd.run({
      onProgress: (seconds) => {
        const percent = Math.min(60 + (seconds / video.duration) * 35, 95);
        options.onProgress?.({
          stage: 'encode',
          percent,
          message: `Encoding: ${Math.round((seconds / video.duration) * 100)}%`,
        });
      },
    });

    stages.push('Video encoded');
    options.onProgress?.({ stage: 'complete', percent: 100, message: 'Complete!' });

    return {
      outputPath: options.outputPath,
      duration: (Date.now() - startTime) / 1000,
      stages,
    };
  } finally {
    // Cleanup temp directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Extract zoom keyframes from UES events.
 */
function extractZoomKeyframes(
  events: UesEvent[],
  video: VideoInfo,
  template: TemplateConfig,
): ZoomPanKeyframe[] {
  const keyframes: ZoomPanKeyframe[] = [];

  // Start with default zoom
  keyframes.push({
    time: 0,
    zoom: template.defaultZoom,
    x: 0.5,
    y: 0.5,
  });

  for (const event of events) {
    const time = event.ts / 1000; // Convert ms to seconds

    if (event.t === 'camera.mark' && template.zoomOnCameraMark) {
      // Camera mark with zoom directive
      const zoom = Math.min(event.zoom ?? template.defaultZoom, template.maxZoom);
      let x = 0.5,
        y = 0.5;

      if (event.focus?.region) {
        const [rx, ry, rw, rh] = event.focus.region;
        x = (rx + rw / 2) / video.width;
        y = (ry + rh / 2) / video.height;
      }

      keyframes.push({ time, zoom, x, y, ease: 'easeInOut' });

      // Return to default after duration
      const duration = (event.data?.durationMs ?? 2000) / 1000;
      keyframes.push({
        time: time + duration,
        zoom: template.defaultZoom,
        x: 0.5,
        y: 0.5,
        ease: 'easeInOut',
      });
    } else if (event.t === 'cursor.click' && template.zoomOnClick) {
      // Zoom on click
      if (event.to) {
        const [cx, cy] = event.to;
        keyframes.push({
          time,
          zoom: Math.min(1.15, template.maxZoom),
          x: cx / video.width,
          y: cy / video.height,
          ease: 'easeOut',
        });

        // Return to default
        keyframes.push({
          time: time + 0.5,
          zoom: template.defaultZoom,
          x: 0.5,
          y: 0.5,
          ease: 'easeIn',
        });
      }
    }
  }

  // Ensure ending keyframe
  if (keyframes.length > 1) {
    const lastKeyframe = keyframes[keyframes.length - 1];
    if (lastKeyframe.time < video.duration - 1) {
      keyframes.push({
        time: video.duration,
        zoom: template.defaultZoom,
        x: 0.5,
        y: 0.5,
      });
    }
  }

  return keyframes;
}

/**
 * Simple pipeline for basic video processing without events.
 */
export async function processVideoSimple(
  inputPath: string,
  outputPath: string,
  options: {
    aspect?: string;
    quality?: 'draft' | 'standard' | 'high';
    fadeIn?: number;
    fadeOut?: number;
  } = {},
): Promise<void> {
  const videoInfo = await probe(inputPath);
  const quality = getQualityPreset(options.quality ?? 'standard');

  const filters: string[] = [];

  if (options.aspect) {
    const aspectConfig = getAspectConfig(options.aspect);
    filters.push(generateScaleFilter(aspectConfig.width, aspectConfig.height, true));
  }

  if (options.fadeIn || options.fadeOut) {
    const fade = generateFadeFilter(options.fadeIn, options.fadeOut, videoInfo.duration);
    if (fade) filters.push(fade);
  }

  const cmd = ffmpeg().overwrite().input(inputPath);

  if (filters.length > 0) {
    cmd.filter(filters.join(','));
  }

  cmd
    .videoCodec('libx264')
    .crf(quality.crf)
    .preset(quality.preset)
    .pixelFormat('yuv420p')
    .audioCodec('aac')
    .audioBitrate(quality.audioBitrate)
    .output(outputPath);

  await cmd.run();
}
