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
} from '../postprod/captions';

describe('Captions Module', () => {
  const sampleCaptions: Caption[] = [
    { start: 0, end: 3, text: 'Hello world' },
    { start: 3, end: 6, text: 'This is a test' },
    { start: 6, end: 10, text: 'Goodbye' },
  ];

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
});
