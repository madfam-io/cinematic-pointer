import { FFmpegCommand } from '../postprod/ffmpeg';

describe('FFmpegCommand', () => {
  describe('fluent API', () => {
    it('should build empty command', () => {
      const cmd = new FFmpegCommand();
      const args = cmd.build();
      expect(args).toEqual([]);
    });

    it('should add global options', () => {
      const cmd = new FFmpegCommand().global('-y', '-hide_banner');
      expect(cmd.build()).toEqual(['-y', '-hide_banner']);
    });

    it('should add input file', () => {
      const cmd = new FFmpegCommand().input('/path/to/input.mp4');
      expect(cmd.build()).toEqual(['-i', '/path/to/input.mp4']);
    });

    it('should add input with options', () => {
      const cmd = new FFmpegCommand().input('/path/to/input.mp4', ['-ss', '10']);
      expect(cmd.build()).toEqual(['-ss', '10', '-i', '/path/to/input.mp4']);
    });

    it('should add multiple inputs', () => {
      const cmd = new FFmpegCommand().input('/path/to/video.mp4').input('/path/to/audio.mp3');
      expect(cmd.build()).toEqual(['-i', '/path/to/video.mp4', '-i', '/path/to/audio.mp3']);
    });

    it('should set output path', () => {
      const cmd = new FFmpegCommand().input('/input.mp4').output('/output.mp4');
      expect(cmd.build()).toEqual(['-i', '/input.mp4', '/output.mp4']);
    });

    it('should add output options', () => {
      const cmd = new FFmpegCommand()
        .input('/input.mp4')
        .outputOpts('-c:v', 'libx264')
        .output('/output.mp4');
      expect(cmd.build()).toContain('-c:v');
      expect(cmd.build()).toContain('libx264');
    });

    it('should add filter', () => {
      const cmd = new FFmpegCommand()
        .input('/input.mp4')
        .filter('scale=1920:1080')
        .output('/output.mp4');
      expect(cmd.build()).toContain('-filter_complex');
      expect(cmd.build()).toContain('scale=1920:1080');
    });

    it('should add complex filter array', () => {
      const cmd = new FFmpegCommand()
        .input('/input.mp4')
        .complexFilter(['scale=1920:1080', 'fps=30'])
        .output('/output.mp4');
      const args = cmd.build();
      expect(args).toContain('-filter_complex');
      expect(args).toContain('scale=1920:1080;fps=30');
    });

    it('should add stream maps', () => {
      const cmd = new FFmpegCommand()
        .input('/input.mp4')
        .map('[v]')
        .map('[a]')
        .output('/output.mp4');
      const args = cmd.build();
      expect(args).toContain('-map');
      expect(args).toContain('[v]');
      expect(args).toContain('[a]');
    });

    it('should set video codec', () => {
      const cmd = new FFmpegCommand().videoCodec('libx264');
      expect(cmd.build()).toEqual(['-c:v', 'libx264']);
    });

    it('should set audio codec', () => {
      const cmd = new FFmpegCommand().audioCodec('aac');
      expect(cmd.build()).toEqual(['-c:a', 'aac']);
    });

    it('should set video bitrate', () => {
      const cmd = new FFmpegCommand().videoBitrate('5000k');
      expect(cmd.build()).toEqual(['-b:v', '5000k']);
    });

    it('should set audio bitrate', () => {
      const cmd = new FFmpegCommand().audioBitrate('192k');
      expect(cmd.build()).toEqual(['-b:a', '192k']);
    });

    it('should set framerate', () => {
      const cmd = new FFmpegCommand().fps(30);
      expect(cmd.build()).toEqual(['-r', '30']);
    });

    it('should set pixel format', () => {
      const cmd = new FFmpegCommand().pixelFormat('yuv420p');
      expect(cmd.build()).toEqual(['-pix_fmt', 'yuv420p']);
    });

    it('should set CRF', () => {
      const cmd = new FFmpegCommand().crf(18);
      expect(cmd.build()).toEqual(['-crf', '18']);
    });

    it('should set preset', () => {
      const cmd = new FFmpegCommand().preset('slow');
      expect(cmd.build()).toEqual(['-preset', 'slow']);
    });

    it('should add overwrite flag', () => {
      const cmd = new FFmpegCommand().overwrite();
      expect(cmd.build()).toEqual(['-y']);
    });

    it('should set duration', () => {
      const cmd = new FFmpegCommand().duration(60);
      expect(cmd.build()).toEqual(['-t', '60']);
    });

    it('should add arbitrary argument with value', () => {
      const cmd = new FFmpegCommand().arg('-threads', '4');
      expect(cmd.build()).toEqual(['-threads', '4']);
    });

    it('should add arbitrary argument without value', () => {
      const cmd = new FFmpegCommand().arg('-an');
      expect(cmd.build()).toEqual(['-an']);
    });

    it('should set seek position', () => {
      const cmd = new FFmpegCommand().seek(30);
      expect(cmd.build()).toEqual(['-ss', '30']);
    });
  });

  describe('complex command building', () => {
    it('should build a typical video encoding command', () => {
      const cmd = new FFmpegCommand()
        .overwrite()
        .input('/path/to/input.mp4')
        .videoCodec('libx264')
        .audioCodec('aac')
        .crf(18)
        .preset('slow')
        .fps(30)
        .pixelFormat('yuv420p')
        .output('/path/to/output.mp4');

      const args = cmd.build();

      expect(args[0]).toBe('-y'); // Global options first
      expect(args).toContain('-i');
      expect(args).toContain('/path/to/input.mp4');
      expect(args).toContain('-c:v');
      expect(args).toContain('libx264');
      expect(args).toContain('-c:a');
      expect(args).toContain('aac');
      expect(args).toContain('-crf');
      expect(args).toContain('18');
      expect(args).toContain('-preset');
      expect(args).toContain('slow');
      expect(args).toContain('-r');
      expect(args).toContain('30');
      expect(args).toContain('-pix_fmt');
      expect(args).toContain('yuv420p');
      expect(args[args.length - 1]).toBe('/path/to/output.mp4'); // Output last
    });

    it('should build a filter-based command', () => {
      const cmd = new FFmpegCommand()
        .overwrite()
        .input('/input1.mp4')
        .input('/input2.mp3')
        .filter('[0:v]scale=1920:1080[v]')
        .filter('[1:a]volume=1.5[a]')
        .map('[v]')
        .map('[a]')
        .videoCodec('libx264')
        .audioCodec('aac')
        .output('/output.mp4');

      const args = cmd.build();

      expect(args).toContain('-filter_complex');
      const filterIdx = args.indexOf('-filter_complex');
      expect(args[filterIdx + 1]).toBe('[0:v]scale=1920:1080[v];[1:a]volume=1.5[a]');
    });

    it('should maintain correct order of arguments', () => {
      const cmd = new FFmpegCommand()
        .global('-y')
        .input('/input.mp4', ['-ss', '10'])
        .filter('scale=1920:1080')
        .map('[v]')
        .videoCodec('libx264')
        .output('/output.mp4');

      const args = cmd.build();

      // Global options should be first
      expect(args.indexOf('-y')).toBe(0);

      // Input options before input
      const ssIdx = args.indexOf('-ss');
      const inputIdx = args.indexOf('-i');
      expect(ssIdx).toBeLessThan(inputIdx);

      // Output should be last
      expect(args[args.length - 1]).toBe('/output.mp4');
    });
  });

  describe('method chaining', () => {
    it('should support method chaining', () => {
      const cmd = new FFmpegCommand();
      const result = cmd
        .global('-y')
        .input('/input.mp4')
        .videoCodec('libx264')
        .audioCodec('aac')
        .output('/output.mp4');

      expect(result).toBe(cmd); // All methods should return this
    });
  });
});
