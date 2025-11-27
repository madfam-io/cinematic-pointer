/**
 * Multi-Format Export Module
 *
 * Handles exporting videos to multiple formats and platforms.
 */

import { mkdir } from 'fs/promises';
import path from 'path';

import {
  getAspectConfig,
  calculateCropDimensions,
  needsCrop,
  generateCropFilterString,
} from '../utils/aspect';
import { logger } from '../utils/logger';

import { ffmpeg, probe, ProbeResult } from './ffmpeg';
import { getQualityPreset } from './templates';

/**
 * Video output format configuration.
 */
export interface FormatConfig {
  /** Format name */
  name: string;
  /** File extension */
  extension: string;
  /** Video codec */
  videoCodec: string;
  /** Audio codec */
  audioCodec: string;
  /** Additional FFmpeg options */
  options?: Record<string, string | number>;
  /** Pixel format */
  pixelFormat?: string;
  /** Description */
  description: string;
}

/**
 * Available output formats.
 */
export const outputFormats: Record<string, FormatConfig> = {
  mp4: {
    name: 'MP4',
    extension: '.mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
    description: 'H.264 MP4 - Best compatibility',
  },
  webm: {
    name: 'WebM',
    extension: '.webm',
    videoCodec: 'libvpx-vp9',
    audioCodec: 'libopus',
    options: {
      'b:v': '0', // Variable bitrate for VP9
    },
    description: 'VP9 WebM - Best quality/size for web',
  },
  hevc: {
    name: 'HEVC/H.265',
    extension: '.mp4',
    videoCodec: 'libx265',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
    description: 'H.265 - Better compression, less compatible',
  },
  gif: {
    name: 'GIF',
    extension: '.gif',
    videoCodec: 'gif',
    audioCodec: 'none',
    options: {
      loop: 0, // Infinite loop
    },
    description: 'Animated GIF - No audio, large files',
  },
  prores: {
    name: 'ProRes',
    extension: '.mov',
    videoCodec: 'prores_ks',
    audioCodec: 'pcm_s16le',
    options: {
      profile: 3, // ProRes 422 HQ
    },
    description: 'Apple ProRes - Professional editing',
  },
};

/**
 * Platform preset configuration.
 */
export interface PlatformPreset {
  /** Platform name */
  name: string;
  /** Recommended format */
  format: string;
  /** Recommended aspect ratios */
  aspects: string[];
  /** Max duration in seconds (optional) */
  maxDuration?: number;
  /** Max file size in MB (optional) */
  maxFileSize?: number;
  /** Quality preset */
  quality: 'draft' | 'standard' | 'high';
  /** Additional notes */
  notes?: string;
}

/**
 * Platform presets for easy export.
 */
export const platformPresets: Record<string, PlatformPreset> = {
  youtube: {
    name: 'YouTube',
    format: 'mp4',
    aspects: ['16:9'],
    quality: 'high',
    notes: 'Upload in highest quality for best processing',
  },
  tiktok: {
    name: 'TikTok',
    format: 'mp4',
    aspects: ['9:16'],
    maxDuration: 180,
    maxFileSize: 287,
    quality: 'high',
    notes: 'Vertical format required',
  },
  instagram_reels: {
    name: 'Instagram Reels',
    format: 'mp4',
    aspects: ['9:16'],
    maxDuration: 90,
    quality: 'high',
  },
  instagram_feed: {
    name: 'Instagram Feed',
    format: 'mp4',
    aspects: ['1:1', '4:5'],
    maxDuration: 60,
    quality: 'high',
  },
  twitter: {
    name: 'Twitter/X',
    format: 'mp4',
    aspects: ['16:9', '1:1'],
    maxDuration: 140,
    maxFileSize: 512,
    quality: 'standard',
  },
  linkedin: {
    name: 'LinkedIn',
    format: 'mp4',
    aspects: ['16:9', '1:1', '9:16'],
    maxDuration: 600,
    quality: 'standard',
  },
  web: {
    name: 'Web Embed',
    format: 'webm',
    aspects: ['16:9'],
    quality: 'standard',
    notes: 'VP9 for smaller files',
  },
  archive: {
    name: 'Archive/Master',
    format: 'prores',
    aspects: ['16:9'],
    quality: 'high',
    notes: 'Lossless for editing',
  },
};

/**
 * Export options.
 */
export interface ExportOptions {
  /** Input video path */
  inputPath: string;
  /** Output directory */
  outputDir: string;
  /** Base name for output files */
  baseName?: string;
  /** Output formats */
  formats: string[];
  /** Aspect ratios (optional) */
  aspects?: string[];
  /** Quality level */
  quality?: 'draft' | 'standard' | 'high';
  /** Events file for smart crop */
  eventsPath?: string;
  /** Use smart crop */
  smartCrop?: boolean;
  /** Progress callback */
  onProgress?: (progress: ExportProgress) => void;
}

/**
 * Export progress information.
 */
export interface ExportProgress {
  /** Current stage */
  stage: string;
  /** Current format being processed */
  currentFormat?: string;
  /** Current aspect being processed */
  currentAspect?: string;
  /** Overall progress (0-100) */
  overallPercent: number;
  /** Stage progress (0-100) */
  stagePercent: number;
  /** Status message */
  message: string;
}

/**
 * Export result for a single output.
 */
export interface ExportOutput {
  /** Output file path */
  path: string;
  /** Format used */
  format: string;
  /** Aspect ratio */
  aspect: string;
  /** File size in bytes */
  size: number;
  /** Duration in seconds */
  duration: number;
  /** Dimensions */
  dimensions: { width: number; height: number };
}

/**
 * Complete export result.
 */
export interface ExportResult {
  /** Input video info */
  input: ProbeResult;
  /** All output files */
  outputs: ExportOutput[];
  /** Total processing time */
  totalDuration: number;
  /** Any errors encountered */
  errors: Array<{ format: string; aspect?: string; error: string }>;
}

/**
 * Export video to multiple formats and aspect ratios.
 */
export async function exportVideo(options: ExportOptions): Promise<ExportResult> {
  const startTime = Date.now();
  const log = logger.child({ component: 'export' });

  log.info('Starting multi-format export', {
    formats: options.formats,
    aspects: options.aspects,
  });

  // Ensure output directory exists
  await mkdir(options.outputDir, { recursive: true });

  // Probe input
  const inputInfo = await probe(options.inputPath);
  const baseName =
    options.baseName || path.basename(options.inputPath, path.extname(options.inputPath));

  const outputs: ExportOutput[] = [];
  const errors: Array<{ format: string; aspect?: string; error: string }> = [];

  const aspects = options.aspects || ['16:9'];
  const totalSteps = options.formats.length * aspects.length;
  let currentStep = 0;

  for (const formatKey of options.formats) {
    const format = outputFormats[formatKey];
    if (!format) {
      errors.push({ format: formatKey, error: `Unknown format: ${formatKey}` });
      continue;
    }

    for (const aspect of aspects) {
      currentStep++;
      const overallPercent = ((currentStep - 1) / totalSteps) * 100;

      options.onProgress?.({
        stage: 'encoding',
        currentFormat: formatKey,
        currentAspect: aspect,
        overallPercent,
        stagePercent: 0,
        message: `Exporting ${format.name} ${aspect}...`,
      });

      try {
        const output = await exportSingleFormat({
          inputPath: options.inputPath,
          outputDir: options.outputDir,
          baseName,
          format,
          formatKey,
          aspect,
          quality: options.quality || 'standard',
          eventsPath: options.eventsPath,
          smartCrop: options.smartCrop,
          onProgress: (percent) => {
            options.onProgress?.({
              stage: 'encoding',
              currentFormat: formatKey,
              currentAspect: aspect,
              overallPercent: overallPercent + percent / totalSteps,
              stagePercent: percent,
              message: `Encoding ${format.name} ${aspect}: ${Math.round(percent)}%`,
            });
          },
        });

        outputs.push(output);
        log.info(`Exported ${formatKey} ${aspect}`, { path: output.path, size: output.size });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Failed to export ${formatKey} ${aspect}`, error);
        errors.push({ format: formatKey, aspect, error: errorMessage });
      }
    }
  }

  options.onProgress?.({
    stage: 'complete',
    overallPercent: 100,
    stagePercent: 100,
    message: `Export complete! ${outputs.length} files created.`,
  });

  return {
    input: inputInfo,
    outputs,
    totalDuration: (Date.now() - startTime) / 1000,
    errors,
  };
}

/**
 * Export to a single format and aspect ratio.
 */
async function exportSingleFormat(options: {
  inputPath: string;
  outputDir: string;
  baseName: string;
  format: FormatConfig;
  formatKey: string;
  aspect: string;
  quality: 'draft' | 'standard' | 'high';
  eventsPath?: string;
  smartCrop?: boolean;
  onProgress?: (percent: number) => void;
}): Promise<ExportOutput> {
  const aspectSuffix = options.aspect.replace(':', 'x');
  const outputPath = path.join(
    options.outputDir,
    `${options.baseName}_${aspectSuffix}${options.format.extension}`,
  );

  const videoInfo = await probe(options.inputPath);
  const aspectConfig = getAspectConfig(options.aspect);
  const qualityPreset = getQualityPreset(options.quality);

  // Build FFmpeg command
  const cmd = ffmpeg().overwrite().input(options.inputPath);

  // Handle aspect ratio conversion
  const targetAspect = aspectConfig.ratio;

  const filters: string[] = [];

  if (needsCrop(videoInfo.width, videoInfo.height, targetAspect)) {
    // Calculate and apply crop
    const crop = calculateCropDimensions(videoInfo.width, videoInfo.height, targetAspect);
    filters.push(generateCropFilterString(crop));
  }

  // Scale to target dimensions
  filters.push(`scale=${aspectConfig.width}:${aspectConfig.height}:flags=lanczos`);

  // Apply filters
  if (filters.length > 0) {
    cmd.filter(filters.join(','));
  }

  // Apply format-specific settings
  cmd.videoCodec(options.format.videoCodec);

  if (options.format.pixelFormat) {
    cmd.pixelFormat(options.format.pixelFormat);
  }

  // Apply quality settings
  if (options.format.videoCodec === 'libx264' || options.format.videoCodec === 'libx265') {
    cmd.crf(qualityPreset.crf).preset(qualityPreset.preset);
  } else if (options.format.videoCodec === 'libvpx-vp9') {
    cmd.crf(qualityPreset.crf + 8); // VP9 CRF is different scale
    cmd.arg('-b:v', '0'); // Enable CRF mode
  }

  // Audio settings
  if (options.format.audioCodec !== 'none') {
    cmd.audioCodec(options.format.audioCodec).audioBitrate(qualityPreset.audioBitrate);
  } else {
    cmd.arg('-an'); // No audio
  }

  // Apply additional format options
  if (options.format.options) {
    for (const [key, value] of Object.entries(options.format.options)) {
      cmd.arg(`-${key}`, String(value));
    }
  }

  cmd.output(outputPath);

  // Run export
  await cmd.run({
    onProgress: (seconds) => {
      const percent = (seconds / videoInfo.duration) * 100;
      options.onProgress?.(Math.min(percent, 100));
    },
  });

  // Get output file info
  const outputInfo = await probe(outputPath);
  const { stat } = await import('fs/promises');
  const stats = await stat(outputPath);

  return {
    path: outputPath,
    format: options.formatKey,
    aspect: options.aspect,
    size: stats.size,
    duration: outputInfo.duration,
    dimensions: { width: outputInfo.width, height: outputInfo.height },
  };
}

/**
 * Export for a specific platform.
 */
export async function exportForPlatform(
  inputPath: string,
  outputDir: string,
  platform: string,
  options: {
    eventsPath?: string;
    smartCrop?: boolean;
    onProgress?: (progress: ExportProgress) => void;
  } = {},
): Promise<ExportResult> {
  const preset = platformPresets[platform];
  if (!preset) {
    throw new Error(
      `Unknown platform: ${platform}. Available: ${Object.keys(platformPresets).join(', ')}`,
    );
  }

  return exportVideo({
    inputPath,
    outputDir,
    formats: [preset.format],
    aspects: preset.aspects,
    quality: preset.quality,
    eventsPath: options.eventsPath,
    smartCrop: options.smartCrop,
    onProgress: options.onProgress,
  });
}

/**
 * Get available formats.
 */
export function getAvailableFormats(): Array<{ key: string; config: FormatConfig }> {
  return Object.entries(outputFormats).map(([key, config]) => ({ key, config }));
}

/**
 * Get available platform presets.
 */
export function getAvailablePlatforms(): Array<{ key: string; preset: PlatformPreset }> {
  return Object.entries(platformPresets).map(([key, preset]) => ({ key, preset }));
}

/**
 * Estimate export file sizes.
 */
export function estimateFileSizes(
  durationSeconds: number,
  formats: string[],
  aspects: string[],
  quality: 'draft' | 'standard' | 'high',
): Array<{ format: string; aspect: string; estimatedSizeMB: number }> {
  // Rough bitrate estimates (Mbps) based on quality
  const bitrateEstimates: Record<string, number> = {
    mp4: quality === 'high' ? 8 : quality === 'standard' ? 5 : 3,
    webm: quality === 'high' ? 4 : quality === 'standard' ? 2.5 : 1.5,
    hevc: quality === 'high' ? 4 : quality === 'standard' ? 2.5 : 1.5,
    gif: 20, // GIFs are inefficient
    prores: 150, // ProRes is large
  };

  const estimates: Array<{ format: string; aspect: string; estimatedSizeMB: number }> = [];

  for (const format of formats) {
    const bitrate = bitrateEstimates[format] || 5;

    for (const aspect of aspects) {
      // Adjust for aspect ratio (vertical videos at same dimensions = same bitrate)
      const sizeMB = (bitrate * durationSeconds) / 8;
      estimates.push({ format, aspect, estimatedSizeMB: Math.round(sizeMB * 10) / 10 });
    }
  }

  return estimates;
}
