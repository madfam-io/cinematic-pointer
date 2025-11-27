/**
 * Video Reframe Module
 *
 * Smart cropping and aspect ratio conversion for multi-platform export.
 */

import { UesEvent } from '../types';
import {
  getAspectConfig,
  calculateCropDimensions,
  needsCrop,
  getAvailableAspects as getAspectsList,
} from '../utils/aspect';
import { parseNDJSON } from '../utils/ndjson';

import { ffmpeg, probe } from './ffmpeg';
import { getQualityPreset } from './templates';

export interface ReframeOptions {
  inputPath: string;
  outputPath: string;
  targetAspect: string;
  eventsPath?: string;
  smartCrop?: boolean;
  quality?: 'draft' | 'standard' | 'high';
  onProgress?: (progress: ReframeProgress) => void;
}

export interface ReframeProgress {
  stage: string;
  percent: number;
  message: string;
}

export interface ReframeResult {
  outputPath: string;
  inputDimensions: { width: number; height: number };
  outputDimensions: { width: number; height: number };
  cropRegion?: { x: number; y: number; width: number; height: number };
  duration: number;
}

export interface FocusPoint {
  time: number; // seconds
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  weight: number; // importance 0-1
}

/**
 * Reframe a video to a different aspect ratio.
 */
export async function reframeVideo(options: ReframeOptions): Promise<ReframeResult> {
  const startTime = Date.now();

  options.onProgress?.({ stage: 'init', percent: 0, message: 'Analyzing video...' });

  // Probe input video
  const videoInfo = await probe(options.inputPath);
  if (!videoInfo.width || !videoInfo.height) {
    throw new Error('Could not determine video dimensions');
  }

  const inputWidth = videoInfo.width;
  const inputHeight = videoInfo.height;

  // Get target dimensions
  const targetConfig = getAspectConfig(options.targetAspect);
  const targetAspect = targetConfig.ratio;

  options.onProgress?.({ stage: 'analyze', percent: 10, message: 'Calculating crop region...' });

  // Determine crop strategy
  let cropX = 0;
  let cropY = 0;
  let cropWidth = inputWidth;
  let cropHeight = inputHeight;

  if (needsCrop(inputWidth, inputHeight, targetAspect)) {
    // Calculate crop dimensions
    if (options.smartCrop && options.eventsPath) {
      // Use event data to determine optimal crop position
      const focusPoints = await extractFocusPoints(options.eventsPath, inputWidth, inputHeight);
      const optimalPosition = calculateOptimalCropPosition(
        focusPoints,
        inputWidth,
        inputHeight,
        targetAspect,
      );
      cropX = optimalPosition.x;
      cropY = optimalPosition.y;
      cropWidth = optimalPosition.width;
      cropHeight = optimalPosition.height;
    } else {
      // Center crop using utility
      const crop = calculateCropDimensions(inputWidth, inputHeight, targetAspect);
      cropX = crop.cropX;
      cropY = crop.cropY;
      cropWidth = crop.cropWidth;
      cropHeight = crop.cropHeight;
    }
  }

  options.onProgress?.({ stage: 'encode', percent: 30, message: 'Reframing video...' });

  // Build FFmpeg filter
  const filters: string[] = [];

  // Crop if needed
  if (cropWidth !== inputWidth || cropHeight !== inputHeight) {
    filters.push(`crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`);
  }

  // Scale to target resolution
  filters.push(`scale=${targetConfig.width}:${targetConfig.height}:flags=lanczos`);

  // Apply quality settings
  const quality = getQualityPreset(options.quality ?? 'standard');

  const cmd = ffmpeg().overwrite().input(options.inputPath);

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
    .output(options.outputPath);

  await cmd.run({
    onProgress: (seconds) => {
      const percent = Math.min(30 + (seconds / videoInfo.duration) * 65, 95);
      options.onProgress?.({
        stage: 'encode',
        percent,
        message: `Encoding: ${Math.round((seconds / videoInfo.duration) * 100)}%`,
      });
    },
  });

  options.onProgress?.({ stage: 'complete', percent: 100, message: 'Complete!' });

  return {
    outputPath: options.outputPath,
    inputDimensions: { width: inputWidth, height: inputHeight },
    outputDimensions: { width: targetConfig.width, height: targetConfig.height },
    cropRegion:
      cropWidth !== inputWidth || cropHeight !== inputHeight
        ? { x: cropX, y: cropY, width: cropWidth, height: cropHeight }
        : undefined,
    duration: (Date.now() - startTime) / 1000,
  };
}

/**
 * Extract focus points from UES events.
 */
async function extractFocusPoints(
  eventsPath: string,
  videoWidth: number,
  videoHeight: number,
): Promise<FocusPoint[]> {
  const events = await parseNDJSON<UesEvent>(eventsPath);

  const focusPoints: FocusPoint[] = [];

  for (const event of events) {
    const time = event.ts / 1000;

    // Click events - high importance
    if (event.t === 'cursor.click' && event.to) {
      focusPoints.push({
        time,
        x: event.to[0] / videoWidth,
        y: event.to[1] / videoHeight,
        weight: 1.0,
      });
    }

    // Cursor move events - medium importance
    if (event.t === 'cursor.move' && event.to) {
      focusPoints.push({
        time,
        x: event.to[0] / videoWidth,
        y: event.to[1] / videoHeight,
        weight: 0.5,
      });
    }

    // Camera marks - high importance
    if (event.t === 'camera.mark' && event.focus?.region) {
      const [rx, ry, rw, rh] = event.focus.region;
      focusPoints.push({
        time,
        x: (rx + rw / 2) / videoWidth,
        y: (ry + rh / 2) / videoHeight,
        weight: 1.0,
      });
    }

    // Input events - medium importance
    if (event.t === 'input.fill' && event.selector) {
      // Can't determine exact position without selector resolution
      // Use center as fallback
      focusPoints.push({
        time,
        x: 0.5,
        y: 0.5,
        weight: 0.3,
      });
    }
  }

  return focusPoints;
}

/**
 * Calculate optimal crop position based on focus points.
 */
function calculateOptimalCropPosition(
  focusPoints: FocusPoint[],
  inputWidth: number,
  inputHeight: number,
  targetAspect: number,
): { x: number; y: number; width: number; height: number } {
  // Calculate crop dimensions using utility
  const baseCrop = calculateCropDimensions(inputWidth, inputHeight, targetAspect);
  const cropWidth = baseCrop.cropWidth;
  const cropHeight = baseCrop.cropHeight;

  if (focusPoints.length === 0) {
    // Default to center
    return {
      x: baseCrop.cropX,
      y: baseCrop.cropY,
      width: cropWidth,
      height: cropHeight,
    };
  }

  // Calculate weighted center of focus points
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (const point of focusPoints) {
    totalWeight += point.weight;
    weightedX += point.x * point.weight;
    weightedY += point.y * point.weight;
  }

  const centerX = (weightedX / totalWeight) * inputWidth;
  const centerY = (weightedY / totalWeight) * inputHeight;

  // Calculate crop position to center on weighted focus
  let cropX = Math.floor(centerX - cropWidth / 2);
  let cropY = Math.floor(centerY - cropHeight / 2);

  // Clamp to valid range
  cropX = Math.max(0, Math.min(cropX, inputWidth - cropWidth));
  cropY = Math.max(0, Math.min(cropY, inputHeight - cropHeight));

  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
}

/**
 * Generate animated crop filter for dynamic reframing.
 * Follows focus points over time.
 */
export function generateDynamicCropFilter(
  focusPoints: FocusPoint[],
  inputWidth: number,
  inputHeight: number,
  cropWidth: number,
  cropHeight: number,
  fps: number,
): string {
  if (focusPoints.length === 0) {
    const x = Math.floor((inputWidth - cropWidth) / 2);
    const y = Math.floor((inputHeight - cropHeight) / 2);
    return `crop=${cropWidth}:${cropHeight}:${x}:${y}`;
  }

  // Sort focus points by time
  const sorted = [...focusPoints].sort((a, b) => a.time - b.time);

  // Build expression for x position
  const maxX = inputWidth - cropWidth;
  const maxY = inputHeight - cropHeight;

  // Create smooth interpolation between focus points
  const xExpressions: string[] = [];
  const yExpressions: string[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];

    const startFrame = Math.floor(p1.time * fps);
    const endFrame = Math.floor(p2.time * fps);

    const x1 = Math.max(0, Math.min(p1.x * inputWidth - cropWidth / 2, maxX));
    const x2 = Math.max(0, Math.min(p2.x * inputWidth - cropWidth / 2, maxX));
    const y1 = Math.max(0, Math.min(p1.y * inputHeight - cropHeight / 2, maxY));
    const y2 = Math.max(0, Math.min(p2.y * inputHeight - cropHeight / 2, maxY));

    const progress = `(n-${startFrame})/${endFrame - startFrame}`;

    // Ease in-out interpolation
    const ease = `(${progress}<0.5?2*${progress}*${progress}:1-pow(-2*${progress}+2,2)/2)`;

    xExpressions.push(`if(between(n,${startFrame},${endFrame}),${x1}+(${x2}-${x1})*${ease}`);
    yExpressions.push(`if(between(n,${startFrame},${endFrame}),${y1}+(${y2}-${y1})*${ease}`);
  }

  // Default position for frames outside defined ranges
  const defaultX = Math.floor((inputWidth - cropWidth) / 2);
  const defaultY = Math.floor((inputHeight - cropHeight) / 2);

  const xExpr =
    xExpressions.length > 0
      ? xExpressions.join(',') + `,${defaultX}` + ')'.repeat(xExpressions.length)
      : String(defaultX);

  const yExpr =
    yExpressions.length > 0
      ? yExpressions.join(',') + `,${defaultY}` + ')'.repeat(yExpressions.length)
      : String(defaultY);

  return `crop=${cropWidth}:${cropHeight}:'${xExpr}':'${yExpr}'`;
}

/**
 * Batch reframe to multiple aspect ratios.
 */
export async function batchReframe(
  inputPath: string,
  outputDir: string,
  aspects: string[],
  options: {
    eventsPath?: string;
    smartCrop?: boolean;
    quality?: 'draft' | 'standard' | 'high';
    onProgress?: (aspect: string, progress: ReframeProgress) => void;
  } = {},
): Promise<ReframeResult[]> {
  const results: ReframeResult[] = [];
  const { basename, extname, join } = await import('path');

  const baseName = basename(inputPath, extname(inputPath));
  const ext = extname(inputPath);

  for (const aspect of aspects) {
    const aspectSuffix = aspect.replace(':', 'x');
    const outputPath = join(outputDir, `${baseName}_${aspectSuffix}${ext}`);

    const result = await reframeVideo({
      inputPath,
      outputPath,
      targetAspect: aspect,
      eventsPath: options.eventsPath,
      smartCrop: options.smartCrop,
      quality: options.quality,
      onProgress: (progress) => options.onProgress?.(aspect, progress),
    });

    results.push(result);
  }

  return results;
}

/**
 * Get available aspect ratios.
 */
export function getAvailableAspects(): Array<{ name: string; ratio: string; description: string }> {
  return getAspectsList();
}
