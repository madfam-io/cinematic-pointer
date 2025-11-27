import { mkdir, rm, readFile } from 'fs/promises';
import path from 'path';

import {
  Caption,
  CaptionStyle,
  defaultCaptionStyle,
  generateASSSubtitles,
  generateSRTSubtitles,
  generateVTTSubtitles,
  extractCaptionsFromEvents,
  generateCaptionsFromSteps,
  generateDrawTextFilter,
  generateSubtitlesFilter,
  mergeCaptions,
  splitLongCaptions,
  offsetCaptions,
  scaleCaptionTimes,
  filterCaptionsByTimeRange,
  writeCaptionsToFile,
  writeSRTToFile,
  writeVTTToFile,
  exportCaptions,
  exportAllCaptionFormats,
} from '../postprod/captions';

describe('Captions Module', () => {
  const testDir = path.join(__dirname, '.test-captions');
  const sampleCaptions: Caption[] = [
    { start: 0, end: 3, text: 'Hello world' },
    { start: 3, end: 6, text: 'This is a test' },
    { start: 6, end: 10, text: 'Goodbye' },
  ];

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Types', () => {
    it('should have valid default caption style', () => {
      expect(defaultCaptionStyle.fontFamily).toBe('Arial');
      expect(defaultCaptionStyle.fontSize).toBe(48);
      expect(defaultCaptionStyle.fontColor).toBe('white');
      expect(defaultCaptionStyle.position).toBe('bottom');
      expect(defaultCaptionStyle.alignment).toBe('center');
    });
  });

  describe('Format Generation', () => {
    describe('generateASSSubtitles', () => {
      it('should generate valid ASS content', () => {
        const result = generateASSSubtitles(sampleCaptions, 1920, 1080);
        expect(result).toContain('[Script Info]');
        expect(result).toContain('PlayResX: 1920');
        expect(result).toContain('PlayResY: 1080');
        expect(result).toContain('[V4+ Styles]');
        expect(result).toContain('[Events]');
      });

      it('should include dialogue lines', () => {
        const result = generateASSSubtitles(sampleCaptions, 1920, 1080);
        expect(result).toContain('Dialogue: 0,0:00:00.00,0:00:03.00');
        expect(result).toContain('Hello world');
      });

      it('should apply custom style', () => {
        const style: CaptionStyle = { fontSize: 64, bold: true };
        const result = generateASSSubtitles(sampleCaptions, 1920, 1080, style);
        expect(result).toContain(',64,'); // fontSize
        expect(result).toContain(',1,0,'); // bold=1, italic=0
      });

      it('should handle different positions', () => {
        const topStyle: CaptionStyle = { position: 'top' };
        const centerStyle: CaptionStyle = { position: 'center' };
        const bottomStyle: CaptionStyle = { position: 'bottom' };

        const topResult = generateASSSubtitles(sampleCaptions, 1920, 1080, topStyle);
        const centerResult = generateASSSubtitles(sampleCaptions, 1920, 1080, centerStyle);
        const bottomResult = generateASSSubtitles(sampleCaptions, 1920, 1080, bottomStyle);

        // ASS alignment: 8=top center, 5=middle center, 2=bottom center
        expect(topResult).toContain(',8,'); // top
        expect(centerResult).toContain(',5,'); // center
        expect(bottomResult).toContain(',2,'); // bottom
      });

      it('should apply italic style', () => {
        const style: CaptionStyle = { italic: true };
        const result = generateASSSubtitles(sampleCaptions, 1920, 1080, style);
        expect(result).toContain(',0,1,'); // bold=0, italic=1
      });

      it('should use default position and alignment when not specified', () => {
        // Empty style object - should use defaults
        const result = generateASSSubtitles(sampleCaptions, 1920, 1080, {});
        // Default is bottom center (alignment 2)
        expect(result).toContain(',2,'); // alignment 2 = bottom center
      });

      it('should use default colors when not specified', () => {
        const result = generateASSSubtitles(sampleCaptions, 1920, 1080, {});
        // Should have white primary color and black outline
        expect(result).toContain('&H00FFFFFF'); // white
        expect(result).toContain('&H00000000'); // black
      });
    });

    describe('generateSRTSubtitles', () => {
      it('should generate valid SRT content', () => {
        const result = generateSRTSubtitles(sampleCaptions);
        expect(result).toContain('1\n00:00:00,000 --> 00:00:03,000\nHello world');
        expect(result).toContain('2\n00:00:03,000 --> 00:00:06,000\nThis is a test');
        expect(result).toContain('3\n00:00:06,000 --> 00:00:10,000\nGoodbye');
      });

      it('should use comma as decimal separator', () => {
        const captions: Caption[] = [{ start: 1.5, end: 2.5, text: 'Test' }];
        const result = generateSRTSubtitles(captions);
        expect(result).toContain('00:00:01,500');
      });
    });

    describe('generateVTTSubtitles', () => {
      it('should start with WEBVTT header', () => {
        const result = generateVTTSubtitles(sampleCaptions);
        expect(result).toMatch(/^WEBVTT\n/);
      });

      it('should use period as decimal separator', () => {
        const captions: Caption[] = [{ start: 1.5, end: 2.5, text: 'Test' }];
        const result = generateVTTSubtitles(captions);
        expect(result).toContain('00:00:01.500');
      });
    });
  });

  describe('Caption Extraction', () => {
    describe('extractCaptionsFromEvents', () => {
      it('should extract captions from caption events', () => {
        const events = [
          { ts: 0, t: 'caption.set', text: 'First' },
          { ts: 3000, t: 'caption.clear' },
          { ts: 5000, t: 'caption.set', text: 'Second' },
          { ts: 8000, t: 'caption.clear' },
        ];

        const result = extractCaptionsFromEvents(events);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ start: 0, end: 3, text: 'First' });
        expect(result[1]).toEqual({ start: 5, end: 8, text: 'Second' });
      });

      it('should handle caption without clear event', () => {
        const events = [{ ts: 0, t: 'caption.set', text: 'Test' }];

        const result = extractCaptionsFromEvents(events);
        expect(result).toHaveLength(1);
        expect(result[0].end).toBe(5); // Default duration
      });

      it('should ignore non-caption events', () => {
        const events = [
          { ts: 0, t: 'cursor.click' },
          { ts: 1000, t: 'caption.set', text: 'Test' },
          { ts: 2000, t: 'cursor.move' },
          { ts: 3000, t: 'caption.clear' },
        ];

        const result = extractCaptionsFromEvents(events);
        expect(result).toHaveLength(1);
      });

      it('should handle consecutive captions without clear', () => {
        const events = [
          { ts: 0, t: 'caption.set', text: 'First' },
          { ts: 2000, t: 'caption.set', text: 'Second' },
          { ts: 4000, t: 'caption.set', text: 'Third' },
          { ts: 6000, t: 'caption.clear' },
        ];

        const result = extractCaptionsFromEvents(events);
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ start: 0, end: 2, text: 'First' });
        expect(result[1]).toEqual({ start: 2, end: 4, text: 'Second' });
        expect(result[2]).toEqual({ start: 4, end: 6, text: 'Third' });
      });
    });

    describe('generateCaptionsFromSteps', () => {
      it('should generate captions from step comments', () => {
        const events = [
          { ts: 0, t: 'step.start', data: { comment: 'Step 1' } },
          { ts: 3000, t: 'step.start', data: { comment: 'Step 2' } },
        ];

        const result = generateCaptionsFromSteps(events);
        expect(result).toHaveLength(2);
        expect(result[0].text).toBe('Step 1');
        expect(result[0].start).toBe(0);
        expect(result[0].end).toBe(3);
      });

      it('should cap duration at 10 seconds', () => {
        const events = [{ ts: 0, t: 'step.start', data: { comment: 'Long step' } }];

        const result = generateCaptionsFromSteps(events, 20);
        expect(result[0].end).toBe(10);
      });

      it('should ignore steps without comments', () => {
        const events = [
          { ts: 0, t: 'step.start', data: {} },
          { ts: 1000, t: 'step.start', data: { comment: 'Has comment' } },
        ];

        const result = generateCaptionsFromSteps(events);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Has comment');
      });
    });
  });

  describe('FFmpeg Filters', () => {
    describe('generateDrawTextFilter', () => {
      it('should generate drawtext filter', () => {
        const result = generateDrawTextFilter('Test', 0, 5);
        expect(result).toContain('drawtext=');
        expect(result).toContain("text='Test'");
        expect(result).toContain("enable='between(t,0,5)'");
      });

      it('should escape special characters', () => {
        const result = generateDrawTextFilter("It's a test: value", 0, 5);
        expect(result).toContain("\\'");
        expect(result).toContain('\\:');
      });

      it('should apply position style', () => {
        const topResult = generateDrawTextFilter('Test', 0, 5, { position: 'top' });
        const bottomResult = generateDrawTextFilter('Test', 0, 5, { position: 'bottom' });

        expect(topResult).toContain(':y=50');
        expect(bottomResult).toContain(':y=h-th-50');
      });

      it('should apply center position', () => {
        const result = generateDrawTextFilter('Test', 0, 5, { position: 'center' });
        expect(result).toContain(':y=(h-th)/2');
      });

      it('should apply left alignment', () => {
        const result = generateDrawTextFilter('Test', 0, 5, { alignment: 'left' });
        expect(result).toContain(':x=50');
      });

      it('should apply right alignment', () => {
        const result = generateDrawTextFilter('Test', 0, 5, { alignment: 'right' });
        expect(result).toContain(':x=w-tw-50');
      });

      it('should apply center alignment by default', () => {
        const result = generateDrawTextFilter('Test', 0, 5);
        expect(result).toContain(':x=(w-tw)/2');
      });

      it('should include outline when specified', () => {
        const result = generateDrawTextFilter('Test', 0, 5, {
          outline: 2,
          outlineColor: 'black',
        });
        expect(result).toContain(':borderw=2');
        expect(result).toContain(':bordercolor=black');
      });

      it('should include shadow when specified', () => {
        const result = generateDrawTextFilter('Test', 0, 5, { shadow: 3 });
        expect(result).toContain(':shadowx=3');
        expect(result).toContain(':shadowy=3');
      });

      it('should not include outline when explicitly set to 0', () => {
        const result = generateDrawTextFilter('Test', 0, 5, { outline: 0 });
        expect(result).not.toContain(':borderw=');
        expect(result).not.toContain(':bordercolor=');
      });

      it('should not include shadow when explicitly set to 0', () => {
        const result = generateDrawTextFilter('Test', 0, 5, { shadow: 0 });
        expect(result).not.toContain(':shadowx=');
        expect(result).not.toContain(':shadowy=');
      });

      it('should include fontSize and fontColor', () => {
        const result = generateDrawTextFilter('Test', 0, 5, {
          fontSize: 48,
          fontColor: 'yellow',
        });
        expect(result).toContain(':fontsize=48');
        expect(result).toContain(':fontcolor=yellow');
      });
    });

    describe('generateSubtitlesFilter', () => {
      it('should generate subtitles filter', () => {
        const result = generateSubtitlesFilter('/path/to/captions.ass');
        expect(result).toBe("subtitles='/path/to/captions.ass'");
      });

      it('should escape special characters in path', () => {
        const result = generateSubtitlesFilter("/path/with:special'chars.ass");
        expect(result).toContain('\\:');
        expect(result).toContain("\\'");
      });
    });
  });

  describe('Caption Manipulation', () => {
    describe('mergeCaptions', () => {
      it('should return empty for no captions', () => {
        expect(mergeCaptions([])).toEqual([]);
      });

      it('should merge adjacent identical captions', () => {
        const captions: Caption[] = [
          { start: 0, end: 2, text: 'Same' },
          { start: 2, end: 4, text: 'Same' },
        ];

        const result = mergeCaptions(captions);
        expect(result).toHaveLength(1);
        expect(result[0].end).toBe(4);
      });

      it('should not merge different captions', () => {
        const captions: Caption[] = [
          { start: 0, end: 2, text: 'First' },
          { start: 2, end: 4, text: 'Second' },
        ];

        const result = mergeCaptions(captions);
        expect(result).toHaveLength(2);
      });

      it('should respect gap threshold', () => {
        const captions: Caption[] = [
          { start: 0, end: 2, text: 'Same' },
          { start: 3, end: 5, text: 'Same' },
        ];

        const merged = mergeCaptions(captions, 2);
        expect(merged).toHaveLength(1);

        const notMerged = mergeCaptions(captions, 0.5);
        expect(notMerged).toHaveLength(2);
      });
    });

    describe('splitLongCaptions', () => {
      it('should not split short captions', () => {
        const captions: Caption[] = [{ start: 0, end: 3, text: 'Short' }];
        const result = splitLongCaptions(captions);
        expect(result).toHaveLength(1);
      });

      it('should split by sentence boundaries', () => {
        const captions: Caption[] = [
          {
            start: 0,
            end: 10,
            text: 'First sentence here. Second sentence here. Third sentence here.',
          },
        ];

        // Splits at sentence boundaries when maxChars exceeded
        const result = splitLongCaptions(captions, 30);
        expect(result.length).toBeGreaterThan(1);
      });

      it('should distribute time across split captions', () => {
        const captions: Caption[] = [
          {
            start: 0,
            end: 10,
            text: 'First sentence. Second sentence.',
          },
        ];

        const result = splitLongCaptions(captions, 20);
        expect(result.length).toBe(2);
        expect(result[0].end).toBe(result[1].start);
      });
    });

    describe('offsetCaptions', () => {
      it('should offset all caption times', () => {
        const result = offsetCaptions(sampleCaptions, 5);
        expect(result[0].start).toBe(5);
        expect(result[0].end).toBe(8);
        expect(result[1].start).toBe(8);
      });

      it('should handle negative offset', () => {
        const result = offsetCaptions(sampleCaptions, -1);
        expect(result[0].start).toBe(-1);
      });
    });

    describe('scaleCaptionTimes', () => {
      it('should scale caption times by factor', () => {
        const result = scaleCaptionTimes(sampleCaptions, 2);
        expect(result[0].start).toBe(0);
        expect(result[0].end).toBe(6);
        expect(result[1].start).toBe(6);
        expect(result[1].end).toBe(12);
      });

      it('should handle fractional factor', () => {
        const result = scaleCaptionTimes(sampleCaptions, 0.5);
        expect(result[0].end).toBe(1.5);
      });
    });

    describe('filterCaptionsByTimeRange', () => {
      it('should filter captions within range', () => {
        // sampleCaptions: [0-3], [3-6], [6-10]
        // Range [2,7] overlaps all three captions
        const result = filterCaptionsByTimeRange(sampleCaptions, 2, 7);
        expect(result).toHaveLength(3);
        // First caption clipped to [2,3]
        expect(result[0].start).toBe(2);
        expect(result[0].end).toBe(3);
        // Last caption clipped to [6,7]
        expect(result[2].start).toBe(6);
        expect(result[2].end).toBe(7);
      });

      it('should clip caption times to range', () => {
        const result = filterCaptionsByTimeRange(sampleCaptions, 1, 5);
        expect(result[0].start).toBe(1);
        expect(result[result.length - 1].end).toBe(5);
      });

      it('should exclude captions fully outside range', () => {
        const result = filterCaptionsByTimeRange(sampleCaptions, 15, 20);
        expect(result).toHaveLength(0);
      });
    });
  });

  describe('File Writing', () => {
    describe('writeCaptionsToFile', () => {
      it('should write ASS file and return path', async () => {
        const outputPath = path.join(testDir, 'test-captions.ass');
        const result = await writeCaptionsToFile(sampleCaptions, outputPath, 1920, 1080);

        expect(result).toBe(outputPath);
        const content = await readFile(result, 'utf-8');
        expect(content).toContain('[Script Info]');
        expect(content).toContain('Hello world');
      });

      it('should append .ass extension if missing', async () => {
        const outputPath = path.join(testDir, 'test-no-ext');
        const result = await writeCaptionsToFile(sampleCaptions, outputPath, 1920, 1080);

        expect(result).toBe(`${outputPath}.ass`);
      });

      it('should apply custom style', async () => {
        const outputPath = path.join(testDir, 'test-styled.ass');
        const style: CaptionStyle = { fontSize: 72, bold: true };
        const result = await writeCaptionsToFile(sampleCaptions, outputPath, 1920, 1080, style);

        const content = await readFile(result, 'utf-8');
        expect(content).toContain(',72,'); // fontSize
        expect(content).toContain(',1,0,'); // bold=1, italic=0
      });
    });

    describe('writeSRTToFile', () => {
      it('should write SRT file and return path', async () => {
        const outputPath = path.join(testDir, 'test-captions.srt');
        const result = await writeSRTToFile(sampleCaptions, outputPath);

        expect(result).toBe(outputPath);
        const content = await readFile(result, 'utf-8');
        expect(content).toContain('1\n00:00:00,000 --> 00:00:03,000\nHello world');
      });

      it('should append .srt extension if missing', async () => {
        const outputPath = path.join(testDir, 'test-srt-no-ext');
        const result = await writeSRTToFile(sampleCaptions, outputPath);

        expect(result).toBe(`${outputPath}.srt`);
      });
    });

    describe('writeVTTToFile', () => {
      it('should write VTT file and return path', async () => {
        const outputPath = path.join(testDir, 'test-captions.vtt');
        const result = await writeVTTToFile(sampleCaptions, outputPath);

        expect(result).toBe(outputPath);
        const content = await readFile(result, 'utf-8');
        expect(content).toMatch(/^WEBVTT\n/);
        expect(content).toContain('Hello world');
      });

      it('should append .vtt extension if missing', async () => {
        const outputPath = path.join(testDir, 'test-vtt-no-ext');
        const result = await writeVTTToFile(sampleCaptions, outputPath);

        expect(result).toBe(`${outputPath}.vtt`);
      });
    });
  });

  describe('Export Functions', () => {
    describe('exportCaptions', () => {
      it('should export to SRT format', async () => {
        const outputPath = path.join(testDir, 'export-test');
        const result = await exportCaptions(sampleCaptions, outputPath, 'srt');

        expect(result).toBe(`${outputPath}.srt`);
        const content = await readFile(result, 'utf-8');
        expect(content).toContain('-->');
      });

      it('should export to VTT format', async () => {
        const outputPath = path.join(testDir, 'export-test-vtt');
        const result = await exportCaptions(sampleCaptions, outputPath, 'vtt');

        expect(result).toBe(`${outputPath}.vtt`);
        const content = await readFile(result, 'utf-8');
        expect(content).toMatch(/^WEBVTT\n/);
      });

      it('should export to ASS format with default dimensions', async () => {
        const outputPath = path.join(testDir, 'export-test-ass');
        const result = await exportCaptions(sampleCaptions, outputPath, 'ass');

        expect(result).toBe(`${outputPath}.ass`);
        const content = await readFile(result, 'utf-8');
        expect(content).toContain('PlayResX: 1920');
        expect(content).toContain('PlayResY: 1080');
      });

      it('should export to ASS format with custom dimensions', async () => {
        const outputPath = path.join(testDir, 'export-test-ass-custom');
        const result = await exportCaptions(sampleCaptions, outputPath, 'ass', {
          videoWidth: 1280,
          videoHeight: 720,
        });

        const content = await readFile(result, 'utf-8');
        expect(content).toContain('PlayResX: 1280');
        expect(content).toContain('PlayResY: 720');
      });

      it('should export to ASS format with custom style', async () => {
        const outputPath = path.join(testDir, 'export-test-ass-style');
        const result = await exportCaptions(sampleCaptions, outputPath, 'ass', {
          style: { fontSize: 64 },
        });

        const content = await readFile(result, 'utf-8');
        expect(content).toContain(',64,');
      });

      it('should throw for unknown format', async () => {
        const outputPath = path.join(testDir, 'export-unknown');
        await expect(
          exportCaptions(sampleCaptions, outputPath, 'unknown' as 'srt'),
        ).rejects.toThrow('Unknown caption format: unknown');
      });
    });

    describe('exportAllCaptionFormats', () => {
      it('should export to all formats', async () => {
        const basePath = path.join(testDir, 'export-all');
        const result = await exportAllCaptionFormats(sampleCaptions, basePath, 1920, 1080);

        // The function passes basePath.srt/vtt/ass which already have extension
        expect(result.srt).toBe(`${basePath}.srt`);
        expect(result.vtt).toBe(`${basePath}.vtt`);
        expect(result.ass).toBe(`${basePath}.ass`);

        // Verify files exist and have content
        const srtContent = await readFile(result.srt, 'utf-8');
        const vttContent = await readFile(result.vtt, 'utf-8');
        const assContent = await readFile(result.ass, 'utf-8');

        expect(srtContent).toContain('Hello world');
        expect(vttContent).toContain('WEBVTT');
        expect(assContent).toContain('[Script Info]');
      });

      it('should apply custom style to ASS export', async () => {
        const basePath = path.join(testDir, 'export-all-styled');
        const result = await exportAllCaptionFormats(sampleCaptions, basePath, 1920, 1080, {
          fontSize: 56,
        });

        const assContent = await readFile(result.ass, 'utf-8');
        expect(assContent).toContain(',56,');
      });
    });
  });

  describe('ASS Alignment Combinations', () => {
    it('should handle top-left alignment', () => {
      const style: CaptionStyle = { position: 'top', alignment: 'left' };
      const result = generateASSSubtitles(sampleCaptions, 1920, 1080, style);
      expect(result).toContain(',7,'); // ASS alignment 7 = top-left
    });

    it('should handle top-right alignment', () => {
      const style: CaptionStyle = { position: 'top', alignment: 'right' };
      const result = generateASSSubtitles(sampleCaptions, 1920, 1080, style);
      expect(result).toContain(',9,'); // ASS alignment 9 = top-right
    });

    it('should handle center-left alignment', () => {
      const style: CaptionStyle = { position: 'center', alignment: 'left' };
      const result = generateASSSubtitles(sampleCaptions, 1920, 1080, style);
      expect(result).toContain(',4,'); // ASS alignment 4 = middle-left
    });

    it('should handle center-right alignment', () => {
      const style: CaptionStyle = { position: 'center', alignment: 'right' };
      const result = generateASSSubtitles(sampleCaptions, 1920, 1080, style);
      expect(result).toContain(',6,'); // ASS alignment 6 = middle-right
    });

    it('should handle bottom-left alignment', () => {
      const style: CaptionStyle = { position: 'bottom', alignment: 'left' };
      const result = generateASSSubtitles(sampleCaptions, 1920, 1080, style);
      expect(result).toContain(',1,'); // ASS alignment 1 = bottom-left
    });

    it('should handle bottom-right alignment', () => {
      const style: CaptionStyle = { position: 'bottom', alignment: 'right' };
      const result = generateASSSubtitles(sampleCaptions, 1920, 1080, style);
      expect(result).toContain(',3,'); // ASS alignment 3 = bottom-right
    });
  });
});
