#!/usr/bin/env node
import { Command } from 'commander';

import { version } from '../package.json';

import { cutVideo, listTemplates } from './commands/cut';
import { runDoctor } from './commands/doctor';
import { reframeVideo, listAspects } from './commands/reframe';
import { runJourney } from './commands/run';

const program = new Command();

program
  .name('cinematic-pointer')
  .description('Automated system for creating cinematic demo videos')
  .version(version);

program
  .command('run')
  .description('Run a journey and record it')
  .argument('<journey>', 'Path to journey JSON file')
  .option('-b, --browser <browser>', 'Browser to use (chromium, firefox, webkit)', 'chromium')
  .option('-r, --recorder <recorder>', 'Recorder to use (playwright, ffmpeg, obs)', 'playwright')
  .option('-o, --out <dir>', 'Output directory', 'artifacts')
  .option('--headless', 'Run in headless mode', false)
  .option('--no-overlay', 'Disable cursor overlay effects')
  .option('--no-recording', 'Disable video recording')
  .option('--timeout <ms>', 'Default timeout for operations', '30000')
  .option('--retries <n>', 'Number of retries for failed steps', '3')
  .option('--speed <factor>', 'Speed factor for execution (0.1-10)', '1')
  .option('--brand <theme>', 'Brand theme name')
  .action(runJourney);

program
  .command('cut')
  .description('Auto-edit recorded footage')
  .argument('<video>', 'Path to raw video file')
  .argument('<events>', 'Path to events NDJSON file')
  .option('-t, --template <template>', 'Edit template (trailer, howto, teaser)', 'trailer')
  .option('-m, --music <file>', 'Background music file')
  .option('-c, --captions <mode>', 'Caption mode (auto, manual, none)', 'auto')
  .option('-a, --aspect <ratio>', 'Output aspect ratio (16:9, 1:1, 9:16)')
  .option('-q, --quality <level>', 'Quality level (draft, standard, high)', 'standard')
  .option('-o, --out <file>', 'Output file path', 'exports/output.mp4')
  .option('--list-templates', 'List available templates')
  .action((video, events, options) => {
    if (options.listTemplates) {
      listTemplates();
    } else {
      cutVideo(video, events, options);
    }
  });

program
  .command('reframe')
  .description('Reframe video for different aspect ratios')
  .argument('<video>', 'Path to video file')
  .option('-a, --aspect <ratio>', 'Target aspect ratio (16:9, 1:1, 9:16)', '9:16')
  .option('-e, --events <file>', 'Events file for smart crop focus detection')
  .option('--smart-crop', 'Use smart cropping to focus on action', true)
  .option('--no-smart-crop', 'Disable smart cropping')
  .option('-q, --quality <level>', 'Quality level (draft, standard, high)', 'standard')
  .option('--batch', 'Generate all aspect ratios')
  .option('-o, --out <file>', 'Output file or directory (for batch)')
  .option('--list-aspects', 'List available aspect ratios')
  .action((video, options) => {
    if (options.listAspects) {
      listAspects();
    } else {
      reframeVideo(video, options);
    }
  });

program
  .command('doctor')
  .description('Check system dependencies and health')
  .option('--json', 'Output results as JSON')
  .action(runDoctor);

program.parse(process.argv);
