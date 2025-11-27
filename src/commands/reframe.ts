import { access, mkdir } from 'fs/promises';
import path from 'path';

import chalk from 'chalk';
import ora from 'ora';

import {
  reframeVideo as reframe,
  batchReframe,
  getAvailableAspects,
  checkFFmpegAvailable,
  getFFmpegVersion,
} from '../postprod';

interface ReframeOptions {
  aspect: string;
  smartCrop: boolean;
  events?: string;
  quality?: 'draft' | 'standard' | 'high';
  out?: string;
  batch?: boolean;
}

export async function reframeVideo(videoPath: string, options: ReframeOptions) {
  const spinner = ora('Initializing reframe pipeline...').start();

  try {
    // Check FFmpeg availability
    const ffmpegAvailable = await checkFFmpegAvailable();
    if (!ffmpegAvailable) {
      spinner.fail('FFmpeg not found');
      console.error(chalk.red('\nFFmpeg is required for video processing.'));
      console.error(chalk.yellow('Install FFmpeg 6.0+ from: https://ffmpeg.org/download.html'));
      process.exit(1);
    }

    const ffmpegVersion = await getFFmpegVersion();
    spinner.text = `FFmpeg ${ffmpegVersion} detected`;

    // Validate input file
    try {
      await access(videoPath);
    } catch {
      spinner.fail('Video file not found');
      console.error(chalk.red(`\nVideo file not found: ${videoPath}`));
      process.exit(1);
    }

    // Validate events file if provided
    if (options.events) {
      try {
        await access(options.events);
      } catch {
        spinner.warn('Events file not found, smart crop will use center fallback');
        options.events = undefined;
      }
    }

    // Validate aspect ratio
    const availableAspects = getAvailableAspects();
    const aspectNames = availableAspects.map((a) => a.ratio);

    if (options.batch) {
      // Batch mode - process all aspects
      const outputDir = options.out || path.dirname(videoPath);
      await mkdir(outputDir, { recursive: true });

      spinner.stop();
      console.log(chalk.blue('\nBatch Reframe Configuration:'));
      console.log(`  ${chalk.gray('Input:')}      ${videoPath}`);
      console.log(`  ${chalk.gray('Output Dir:')} ${outputDir}`);
      console.log(`  ${chalk.gray('Aspects:')}    ${aspectNames.join(', ')}`);
      console.log(`  ${chalk.gray('Smart Crop:')} ${options.smartCrop ? 'enabled' : 'disabled'}`);
      if (options.events) {
        console.log(`  ${chalk.gray('Events:')}     ${options.events}`);
      }
      console.log();

      spinner.start('Processing videos...');

      const results = await batchReframe(videoPath, outputDir, aspectNames, {
        eventsPath: options.events,
        smartCrop: options.smartCrop,
        quality: options.quality,
        onProgress: (aspect, progress) => {
          spinner.text = `[${aspect}] ${progress.message}`;
        },
      });

      spinner.succeed('Batch reframe complete!');

      console.log(chalk.green('\n✓ Generated videos:'));
      for (const result of results) {
        const aspectStr = `${result.outputDimensions.width}x${result.outputDimensions.height}`;
        console.log(chalk.gray(`  • ${result.outputPath} (${aspectStr})`));
      }

      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
      console.log(chalk.gray(`\n  Total processing time: ${totalDuration.toFixed(1)}s`));
    } else {
      // Single aspect mode
      if (!aspectNames.includes(options.aspect)) {
        spinner.fail('Invalid aspect ratio');
        console.error(chalk.red(`\nInvalid aspect ratio: ${options.aspect}`));
        console.error(chalk.yellow(`Available ratios: ${aspectNames.join(', ')}`));
        process.exit(1);
      }

      const outputPath = options.out || generateOutputPath(videoPath, options.aspect);

      spinner.stop();
      console.log(chalk.blue('\nReframe Configuration:'));
      console.log(`  ${chalk.gray('Input:')}      ${videoPath}`);
      console.log(`  ${chalk.gray('Aspect:')}     ${options.aspect}`);
      console.log(`  ${chalk.gray('Smart Crop:')} ${options.smartCrop ? 'enabled' : 'disabled'}`);
      if (options.events) {
        console.log(`  ${chalk.gray('Events:')}     ${options.events}`);
      }
      console.log(`  ${chalk.gray('Output:')}     ${outputPath}`);
      console.log();

      spinner.start('Reframing video...');

      const result = await reframe({
        inputPath: videoPath,
        outputPath,
        targetAspect: options.aspect,
        eventsPath: options.events,
        smartCrop: options.smartCrop,
        quality: options.quality,
        onProgress: (progress) => {
          spinner.text = progress.message;
        },
      });

      spinner.succeed('Video reframing complete!');

      console.log(chalk.green(`\n✓ Exported to: ${result.outputPath}`));
      console.log(
        chalk.gray(
          `  Dimensions: ${result.inputDimensions.width}x${result.inputDimensions.height} → ${result.outputDimensions.width}x${result.outputDimensions.height}`,
        ),
      );

      if (result.cropRegion) {
        console.log(
          chalk.gray(
            `  Crop region: ${result.cropRegion.width}x${result.cropRegion.height} at (${result.cropRegion.x}, ${result.cropRegion.y})`,
          ),
        );
      }

      console.log(chalk.gray(`  Processing time: ${result.duration.toFixed(1)}s`));
    }
  } catch (error) {
    spinner.fail('Video reframing failed');
    console.error(chalk.red('\n' + (error instanceof Error ? error.message : String(error))));

    if (error instanceof Error && error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }

    process.exit(1);
  }
}

function generateOutputPath(inputPath: string, aspect: string): string {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const aspectSuffix = aspect.replace(':', 'x');
  return path.join(dir, `${base}_${aspectSuffix}${ext}`);
}

/**
 * Display available aspect ratios.
 */
export function listAspects(): void {
  console.log(chalk.blue('\nAvailable Aspect Ratios:\n'));

  const aspects = getAvailableAspects();
  for (const aspect of aspects) {
    console.log(`  ${chalk.green(aspect.ratio.padEnd(6))} ${chalk.gray(aspect.description)}`);
  }
  console.log();
}
