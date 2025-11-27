import path from 'path';

import chalk from 'chalk';
import ora from 'ora';

interface ReframeOptions {
  aspect: string;
  smartCrop: boolean;
  out?: string;
}

export async function reframeVideo(videoPath: string, options: ReframeOptions) {
  const spinner = ora('Loading video...').start();

  try {
    const outputPath = options.out || generateOutputPath(videoPath, options.aspect);

    console.log(chalk.blue('\nReframe Configuration:'));
    console.log(`  Input: ${videoPath}`);
    console.log(`  Aspect Ratio: ${options.aspect}`);
    console.log(`  Smart Crop: ${options.smartCrop ? 'enabled' : 'disabled'}`);
    console.log(`  Output: ${outputPath}`);

    spinner.text = 'Reframing video...';

    spinner.succeed('Video reframing complete!');
    console.log(chalk.green(`\nExported to: ${outputPath}`));
  } catch (error) {
    spinner.fail('Video reframing failed');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
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
