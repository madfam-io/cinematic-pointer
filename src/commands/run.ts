import path from 'path';

import chalk from 'chalk';
import ora, { Ora } from 'ora';

import { BrowserType } from '../drivers/playwright';
import { executeJourneyFile, ExecutorOptions } from '../executor';
import { JourneyStep } from '../types';
import { describeSelector } from '../utils/selector';

interface RunOptions {
  browser: string;
  recorder: string;
  out: string;
  headless: boolean;
  timeout: string;
  retries: string;
  speed: string;
}

export async function runJourney(journeyPath: string, options: RunOptions) {
  const spinner = ora('Loading journey...').start();

  try {
    const resolvedPath = path.resolve(journeyPath);

    // Parse options
    const executorOptions: ExecutorOptions = {
      browserType: options.browser as BrowserType,
      headless: options.headless,
      timeout: parseInt(options.timeout, 10),
      retries: parseInt(options.retries, 10),
      speed: parseFloat(options.speed),
      outputDir: options.out,
      enableRecording: options.recorder !== 'none',
    };

    spinner.succeed('Journey loaded');

    console.log(chalk.blue('\nConfiguration:'));
    console.log(`  Browser: ${chalk.cyan(options.browser)}`);
    console.log(`  Recorder: ${chalk.cyan(options.recorder)}`);
    console.log(`  Output: ${chalk.cyan(options.out)}`);
    console.log(`  Mode: ${chalk.cyan(options.headless ? 'headless' : 'headed')}`);
    console.log(`  Timeout: ${chalk.cyan(options.timeout + 'ms')}`);
    console.log(`  Retries: ${chalk.cyan(options.retries)}`);
    console.log(`  Speed: ${chalk.cyan(options.speed + 'x')}`);
    console.log();

    let currentSpinner: Ora | null = null;

    // Execute with progress callbacks
    const result = await executeJourneyFile(resolvedPath, executorOptions, {
      onStepStart: (step: JourneyStep, index: number) => {
        const desc = getStepDescription(step);
        currentSpinner = ora(`Step ${index + 1}: ${desc}`).start();
      },
      onStepComplete: (step: JourneyStep, index: number) => {
        if (currentSpinner) {
          currentSpinner.succeed(`Step ${index + 1}: ${getStepDescription(step)}`);
        }
      },
      onStepError: (step: JourneyStep, index: number, error: Error) => {
        if (currentSpinner) {
          currentSpinner.fail(
            `Step ${index + 1}: ${getStepDescription(step)} - ${chalk.red(error.message)}`,
          );
        }
      },
    });

    console.log();

    if (result.success) {
      console.log(chalk.green('✓ Journey completed successfully!'));
    } else {
      console.log(chalk.yellow(`⚠ Journey completed with ${result.stepsFailed} failed step(s)`));
    }

    console.log();
    console.log(chalk.blue('Summary:'));
    console.log(`  Duration: ${chalk.cyan(formatDuration(result.duration))}`);
    console.log(`  Steps executed: ${chalk.cyan(result.stepsExecuted)}`);
    console.log(`  Steps failed: ${chalk.cyan(result.stepsFailed)}`);
    console.log();
    console.log(chalk.blue('Artifacts:'));
    console.log(`  Events: ${chalk.cyan(result.artifacts.eventsPath)}`);
    if (result.artifacts.videoPath) {
      console.log(`  Video: ${chalk.cyan(result.artifacts.videoPath)}`);
    }

    if (result.errors.length > 0) {
      console.log();
      console.log(chalk.red('Errors:'));
      for (const err of result.errors) {
        console.log(`  Step ${err.step + 1}: ${err.error}`);
      }
    }

    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    spinner.fail('Journey failed');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

function getStepDescription(step: JourneyStep): string {
  const action = chalk.bold(step.action);

  switch (step.action) {
    case 'navigate':
      return `${action} to ${step.to}`;
    case 'click':
      return `${action} ${step.locator ? describeSelector(step.locator) : ''}`;
    case 'fill':
      return `${action} ${step.locator ? describeSelector(step.locator) : ''} with "${step.mask ? '••••' : step.text}"`;
    case 'hover':
      return `${action} ${step.locator ? describeSelector(step.locator) : ''}`;
    case 'scroll':
      return `${action} to ${step.to}`;
    case 'press':
      return `${action} "${step.key}"`;
    case 'waitFor':
      return `${action} ${step.locator ? describeSelector(step.locator) : ''}`;
    case 'cameraMark':
      return `${action} (zoom: ${step.cinema?.zoom ?? 1}x)`;
    case 'pause':
      return `${action} ${step.durationMs}ms`;
    default:
      return action;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}
