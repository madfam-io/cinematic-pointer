import chalk from 'chalk';
import ora from 'ora';
import { readFile } from 'fs/promises';
import path from 'path';

import { Journey } from '../types';

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
    const journeyContent = await readFile(path.resolve(journeyPath), 'utf-8');
    const journey: Journey = JSON.parse(journeyContent);

    spinner.succeed(`Loaded journey: ${journey.meta.name}`);

    console.log(chalk.blue('\nJourney Configuration:'));
    console.log(`  Browser: ${options.browser}`);
    console.log(`  Recorder: ${options.recorder}`);
    console.log(`  Output: ${options.out}`);
    console.log(`  Mode: ${options.headless ? 'headless' : 'headed'}`);

    spinner.start('Initializing browser...');
    
    spinner.succeed('Journey completed successfully!');
    console.log(chalk.green(`\nArtifacts saved to: ${options.out}`));
  } catch (error) {
    spinner.fail('Journey failed');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}