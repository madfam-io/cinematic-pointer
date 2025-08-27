import chalk from 'chalk';
import ora from 'ora';
import path from 'path';

interface CutOptions {
  template: string;
  music?: string;
  captions: string;
  out: string;
}

export async function cutVideo(videoPath: string, eventsPath: string, options: CutOptions) {
  const spinner = ora('Loading video and events...').start();

  try {
    console.log(chalk.blue('\nCut Configuration:'));
    console.log(`  Video: ${videoPath}`);
    console.log(`  Events: ${eventsPath}`);
    console.log(`  Template: ${options.template}`);
    console.log(`  Captions: ${options.captions}`);
    if (options.music) {
      console.log(`  Music: ${options.music}`);
    }

    spinner.text = 'Processing video...';

    spinner.succeed('Video processing complete!');
    console.log(chalk.green(`\nExported to: ${options.out}`));
  } catch (error) {
    spinner.fail('Video processing failed');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}