/**
 * Doctor Command
 *
 * System health checks and dependency verification.
 */

import chalk from 'chalk';
import ora from 'ora';

import { runHealthChecks, SystemHealth } from '../utils/health';

interface DoctorOptions {
  json?: boolean;
}

export async function runDoctor(options: DoctorOptions): Promise<void> {
  if (options.json) {
    // JSON output mode
    const health = await runHealthChecks();
    console.log(JSON.stringify(health, null, 2));
    process.exit(health.overall === 'healthy' ? 0 : 1);
    return;
  }

  // Interactive mode
  const spinner = ora('Running health checks...').start();

  try {
    const health = await runHealthChecks();
    spinner.stop();

    displayHealthReport(health);

    // Exit with appropriate code
    if (health.overall === 'unhealthy') {
      process.exit(1);
    }
  } catch (error) {
    spinner.fail('Health check failed');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

function displayHealthReport(health: SystemHealth): void {
  console.log();
  console.log(chalk.bold('Cinematic Pointer Health Check'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log();

  // Overall status
  const statusColors = {
    healthy: chalk.green,
    degraded: chalk.yellow,
    unhealthy: chalk.red,
  };
  const statusIcons = {
    healthy: '✓',
    degraded: '⚠',
    unhealthy: '✗',
  };

  console.log(
    `  Overall: ${statusColors[health.overall](statusIcons[health.overall] + ' ' + health.overall.toUpperCase())}`,
  );
  console.log();

  // Individual checks
  console.log(chalk.bold('  Checks:'));
  console.log();

  for (const check of health.checks) {
    const icon = check.status === 'ok' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
    const color =
      check.status === 'ok' ? chalk.green : check.status === 'warn' ? chalk.yellow : chalk.red;

    console.log(`    ${color(icon)} ${check.name}`);
    console.log(`      ${chalk.gray(check.message)}`);

    if (check.status === 'error' && check.details?.error) {
      console.log(`      ${chalk.red('Error: ' + check.details.error)}`);
    }
  }

  console.log();
  console.log(chalk.gray(`  Checked at: ${health.timestamp}`));
  console.log();

  // Recommendations
  const errors = health.checks.filter((c) => c.status === 'error');
  if (errors.length > 0) {
    console.log(chalk.bold('  Recommendations:'));
    console.log();

    for (const error of errors) {
      if (error.name === 'FFmpeg' || error.name === 'ffprobe') {
        console.log(
          chalk.yellow('    → Install FFmpeg 6.0+ from: https://ffmpeg.org/download.html'),
        );
      } else if (error.name === 'Playwright Browsers') {
        console.log(chalk.yellow('    → Run: npx playwright install'));
      }
    }
    console.log();
  }
}
