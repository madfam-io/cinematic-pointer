import { TimeFormatter, parseTimeComponents } from '../utils/time-format';

describe('Time Format Utils', () => {
  describe('parseTimeComponents', () => {
    it('should parse zero seconds', () => {
      const result = parseTimeComponents(0);
      expect(result).toEqual({ hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
    });

    it('should parse seconds only', () => {
      const result = parseTimeComponents(45);
      expect(result).toEqual({ hours: 0, minutes: 0, seconds: 45, milliseconds: 0 });
    });

    it('should parse minutes and seconds', () => {
      const result = parseTimeComponents(125); // 2:05
      expect(result).toEqual({ hours: 0, minutes: 2, seconds: 5, milliseconds: 0 });
    });

    it('should parse hours, minutes, and seconds', () => {
      const result = parseTimeComponents(3725); // 1:02:05
      expect(result).toEqual({ hours: 1, minutes: 2, seconds: 5, milliseconds: 0 });
    });

    it('should parse milliseconds', () => {
      const result = parseTimeComponents(1.5);
      expect(result).toEqual({ hours: 0, minutes: 0, seconds: 1, milliseconds: 500 });
    });

    it('should parse complex time with milliseconds', () => {
      const result = parseTimeComponents(3661.123); // 1:01:01.123
      expect(result).toEqual({ hours: 1, minutes: 1, seconds: 1, milliseconds: 123 });
    });
  });

  describe('TimeFormatter.ass', () => {
    it('should format zero time', () => {
      expect(TimeFormatter.ass(0)).toBe('0:00:00.00');
    });

    it('should format seconds only', () => {
      expect(TimeFormatter.ass(5)).toBe('0:00:05.00');
    });

    it('should format minutes and seconds', () => {
      expect(TimeFormatter.ass(65)).toBe('0:01:05.00');
    });

    it('should format hours', () => {
      expect(TimeFormatter.ass(3665)).toBe('1:01:05.00');
    });

    it('should format centiseconds', () => {
      expect(TimeFormatter.ass(1.25)).toBe('0:00:01.25');
    });

    it('should round centiseconds correctly', () => {
      expect(TimeFormatter.ass(1.999)).toBe('0:00:01.99');
    });
  });

  describe('TimeFormatter.srt', () => {
    it('should format zero time', () => {
      expect(TimeFormatter.srt(0)).toBe('00:00:00,000');
    });

    it('should format seconds', () => {
      expect(TimeFormatter.srt(5)).toBe('00:00:05,000');
    });

    it('should format minutes and seconds', () => {
      expect(TimeFormatter.srt(125)).toBe('00:02:05,000');
    });

    it('should format hours', () => {
      expect(TimeFormatter.srt(3725)).toBe('01:02:05,000');
    });

    it('should format milliseconds with comma separator', () => {
      expect(TimeFormatter.srt(1.5)).toBe('00:00:01,500');
    });

    it('should format precise milliseconds', () => {
      expect(TimeFormatter.srt(1.234)).toBe('00:00:01,234');
    });
  });

  describe('TimeFormatter.vtt', () => {
    it('should format zero time', () => {
      expect(TimeFormatter.vtt(0)).toBe('00:00:00.000');
    });

    it('should format seconds', () => {
      expect(TimeFormatter.vtt(5)).toBe('00:00:05.000');
    });

    it('should format minutes and seconds', () => {
      expect(TimeFormatter.vtt(125)).toBe('00:02:05.000');
    });

    it('should format hours', () => {
      expect(TimeFormatter.vtt(3725)).toBe('01:02:05.000');
    });

    it('should format milliseconds with period separator', () => {
      expect(TimeFormatter.vtt(1.5)).toBe('00:00:01.500');
    });
  });

  describe('TimeFormatter.ffmpeg', () => {
    it('should use same format as VTT', () => {
      expect(TimeFormatter.ffmpeg(1.5)).toBe(TimeFormatter.vtt(1.5));
      expect(TimeFormatter.ffmpeg(3725.123)).toBe(TimeFormatter.vtt(3725.123));
    });
  });

  describe('TimeFormatter.display', () => {
    it('should format seconds only', () => {
      expect(TimeFormatter.display(45)).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      expect(TimeFormatter.display(125)).toBe('2m 5s');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(TimeFormatter.display(3725)).toBe('1h 2m 5s');
    });

    it('should not show fractional seconds', () => {
      expect(TimeFormatter.display(1.5)).toBe('1s');
    });
  });

  describe('TimeFormatter.displayPrecise', () => {
    it('should show decimal seconds', () => {
      expect(TimeFormatter.displayPrecise(1.5)).toBe('1.5s');
    });

    it('should format minutes with precise seconds', () => {
      expect(TimeFormatter.displayPrecise(65.5)).toBe('1m 5.5s');
    });

    it('should format hours with precise seconds', () => {
      expect(TimeFormatter.displayPrecise(3601.5)).toBe('1h 0m 1.5s');
    });
  });
});
