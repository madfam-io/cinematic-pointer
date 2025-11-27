/**
 * FFmpeg Wrapper
 *
 * Provides a fluent API for building and executing FFmpeg commands.
 */

import { spawn } from 'child_process';
import { access } from 'fs/promises';

export interface FFmpegInput {
  path: string;
  options?: string[];
}

export interface FFmpegOutput {
  path: string;
  options?: string[];
}

export interface FFmpegFilter {
  name: string;
  options?: Record<string, string | number>;
  inputs?: string[];
  outputs?: string[];
}

/**
 * Check if FFmpeg is available on the system.
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Get FFmpeg version info.
 */
export async function getFFmpegVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-version']);
    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        const match = output.match(/ffmpeg version (\S+)/);
        resolve(match ? match[1] : 'unknown');
      } else {
        reject(new Error('Failed to get FFmpeg version'));
      }
    });
  });
}

/**
 * FFmpeg command builder with fluent API.
 */
export class FFmpegCommand {
  private inputs: FFmpegInput[] = [];
  private outputPath: string = '';
  private outputOptions: string[] = [];
  private globalOptions: string[] = [];
  private filterComplex: string[] = [];
  private maps: string[] = [];

  /**
   * Add global options (before inputs).
   */
  global(...options: string[]): this {
    this.globalOptions.push(...options);
    return this;
  }

  /**
   * Add an input file.
   */
  input(path: string, options?: string[]): this {
    this.inputs.push({ path, options });
    return this;
  }

  /**
   * Set the output file path.
   */
  output(path: string): this {
    this.outputPath = path;
    return this;
  }

  /**
   * Add output options.
   */
  outputOpts(...options: string[]): this {
    this.outputOptions.push(...options);
    return this;
  }

  /**
   * Add a filter to the filter complex.
   */
  filter(filter: string): this {
    this.filterComplex.push(filter);
    return this;
  }

  /**
   * Add a complex filter graph.
   */
  complexFilter(filters: string[]): this {
    this.filterComplex.push(...filters);
    return this;
  }

  /**
   * Map a stream to output.
   */
  map(stream: string): this {
    this.maps.push(stream);
    return this;
  }

  /**
   * Set video codec.
   */
  videoCodec(codec: string): this {
    this.outputOptions.push('-c:v', codec);
    return this;
  }

  /**
   * Set audio codec.
   */
  audioCodec(codec: string): this {
    this.outputOptions.push('-c:a', codec);
    return this;
  }

  /**
   * Set video bitrate.
   */
  videoBitrate(bitrate: string): this {
    this.outputOptions.push('-b:v', bitrate);
    return this;
  }

  /**
   * Set audio bitrate.
   */
  audioBitrate(bitrate: string): this {
    this.outputOptions.push('-b:a', bitrate);
    return this;
  }

  /**
   * Set output framerate.
   */
  fps(rate: number): this {
    this.outputOptions.push('-r', String(rate));
    return this;
  }

  /**
   * Set pixel format.
   */
  pixelFormat(format: string): this {
    this.outputOptions.push('-pix_fmt', format);
    return this;
  }

  /**
   * Set CRF (Constant Rate Factor) for quality.
   */
  crf(value: number): this {
    this.outputOptions.push('-crf', String(value));
    return this;
  }

  /**
   * Set preset (ultrafast, fast, medium, slow, etc.).
   */
  preset(preset: string): this {
    this.outputOptions.push('-preset', preset);
    return this;
  }

  /**
   * Overwrite output file without asking.
   */
  overwrite(): this {
    this.globalOptions.push('-y');
    return this;
  }

  /**
   * Set duration limit.
   */
  duration(seconds: number): this {
    this.outputOptions.push('-t', String(seconds));
    return this;
  }

  /**
   * Add arbitrary argument.
   */
  arg(key: string, value?: string): this {
    this.outputOptions.push(key);
    if (value !== undefined) {
      this.outputOptions.push(value);
    }
    return this;
  }

  /**
   * Seek to position.
   */
  seek(seconds: number): this {
    this.outputOptions.push('-ss', String(seconds));
    return this;
  }

  /**
   * Build the command arguments array.
   */
  build(): string[] {
    const args: string[] = [...this.globalOptions];

    // Add inputs
    for (const input of this.inputs) {
      if (input.options) {
        args.push(...input.options);
      }
      args.push('-i', input.path);
    }

    // Add filter complex
    if (this.filterComplex.length > 0) {
      args.push('-filter_complex', this.filterComplex.join(';'));
    }

    // Add maps
    for (const map of this.maps) {
      args.push('-map', map);
    }

    // Add output options
    args.push(...this.outputOptions);

    // Add output path
    if (this.outputPath) {
      args.push(this.outputPath);
    }

    return args;
  }

  /**
   * Execute the FFmpeg command.
   */
  async run(options?: {
    onProgress?: (progress: number) => void;
    onStderr?: (data: string) => void;
  }): Promise<void> {
    const args = this.build();

    // Validate inputs exist
    for (const input of this.inputs) {
      try {
        await access(input.path);
      } catch {
        throw new Error(`Input file not found: ${input.path}`);
      }
    }

    return new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', args);
      let stderr = '';

      proc.stderr.on('data', (data) => {
        const str = data.toString();
        stderr += str;
        options?.onStderr?.(str);

        // Parse progress from FFmpeg output
        const timeMatch = str.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const seconds = parseFloat(timeMatch[3]);
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;
          options?.onProgress?.(totalSeconds);
        }
      });

      proc.on('error', (error) => {
        reject(new Error(`FFmpeg failed to start: ${error.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
        }
      });
    });
  }

  /**
   * Get the command as a string for debugging.
   */
  toString(): string {
    return `ffmpeg ${this.build().join(' ')}`;
  }
}

/**
 * Create a new FFmpeg command builder.
 */
export function ffmpeg(): FFmpegCommand {
  return new FFmpegCommand();
}

/**
 * Probe result type.
 */
export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

/**
 * Probe a media file for metadata.
 */
export async function probe(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const proc = spawn('ffprobe', args);
    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed with code ${code}`));
        return;
      }

      try {
        const data = JSON.parse(output);
        const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
        const duration = parseFloat(data.format?.duration || '0');
        const width = videoStream?.width || 1920;
        const height = videoStream?.height || 1080;

        // Parse FPS safely
        let fps: number | undefined;
        if (videoStream?.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/');
          if (num && den) {
            fps = parseInt(num, 10) / parseInt(den, 10);
          }
        }

        resolve({
          duration,
          width,
          height,
          fps: fps || 30,
        });
      } catch (e) {
        reject(new Error(`Failed to parse ffprobe output: ${e}`));
      }
    });
  });
}
