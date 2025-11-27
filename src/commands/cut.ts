import { access } from 'fs/promises';

import chalk from 'chalk';
import ora from 'ora';

import {
  runPipeline,
  checkFFmpegAvailable,
  getFFmpegVersion,
  TemplateName,
  getAllTemplates,
} from '../postprod';

interface CutOptions {
  template: string;
  music?: string;
  captions: string;
  out: string;
  aspect?: string;
}

export async function cutVideo(videoPath: string, eventsPath: string, options: CutOptions) {
  const spinner = ora('Initializing post-production pipeline...').start();

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

    // Validate input files
    try {
      await access(videoPath);
    } catch {
      spinner.fail('Video file not found');
      console.error(chalk.red(`\nVideo file not found: ${videoPath}`));
      process.exit(1);
    }

    try {
      await access(eventsPath);
    } catch {
      spinner.fail('Events file not found');
      console.error(chalk.red(`\nEvents file not found: ${eventsPath}`));
      process.exit(1);
    }

    // Validate template
    const templates = getAllTemplates();
    const templateNames = templates.map((t) => t.name);
    if (!templateNames.includes(options.template as TemplateName)) {
      spinner.fail('Invalid template');
      console.error(chalk.red(`\nInvalid template: ${options.template}`));
      console.error(chalk.yellow(`Available templates: ${templateNames.join(', ')}`));
      process.exit(1);
    }

    // Validate music file if provided
    if (options.music) {
      try {
        await access(options.music);
      } catch {
        spinner.warn('Music file not found, continuing without music');
        options.music = undefined;
      }
    }

    // Display configuration
    spinner.stop();
    console.log(chalk.blue('\nPost-Production Configuration:'));
    console.log(`  ${chalk.gray('Video:')}    ${videoPath}`);
    console.log(`  ${chalk.gray('Events:')}   ${eventsPath}`);
    console.log(`  ${chalk.gray('Template:')} ${options.template}`);
    console.log(`  ${chalk.gray('Captions:')} ${options.captions}`);
    if (options.music) {
      console.log(`  ${chalk.gray('Music:')}    ${options.music}`);
    }
    if (options.aspect) {
      console.log(`  ${chalk.gray('Aspect:')}   ${options.aspect}`);
    }
    console.log(`  ${chalk.gray('Output:')}   ${options.out}`);
    console.log();

    spinner.start('Processing video...');

    // Run the pipeline
    const result = await runPipeline({
      videoPath,
      eventsPath,
      outputPath: options.out,
      template: options.template as TemplateName,
      musicPath: options.music,
      captions:
        options.captions === 'auto' ? 'auto' : options.captions === 'none' ? 'none' : 'auto',
      aspect: options.aspect,
      onProgress: (progress) => {
        spinner.text = progress.message;
      },
    });

    spinner.succeed('Video processing complete!');

    // Display results
    console.log(chalk.green(`\n✓ Exported to: ${result.outputPath}`));
    console.log(chalk.gray(`  Processing time: ${result.duration.toFixed(1)}s`));
    console.log(chalk.gray(`  Stages completed: ${result.stages.length}`));

    // Show stages
    if (result.stages.length > 0) {
      console.log(chalk.gray('\n  Pipeline stages:'));
      result.stages.forEach((stage) => {
        console.log(chalk.gray(`    • ${stage}`));
      });
    }
  } catch (error) {
    spinner.fail('Video processing failed');
    console.error(chalk.red('\n' + (error instanceof Error ? error.message : String(error))));

    if (error instanceof Error && error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }

    process.exit(1);
  }
}

/**
 * Display available templates.
 */
export function listTemplates(): void {
  console.log(chalk.blue('\nAvailable Templates:\n'));

  const templates = getAllTemplates();
  for (const template of templates) {
    console.log(`  ${chalk.green(template.name)}`);
    console.log(`    ${chalk.gray(template.description)}`);
    console.log();
  }
}
