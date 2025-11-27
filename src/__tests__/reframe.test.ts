// Mock chalk (ESM module that doesn't work with Jest)
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    gray: (s: string) => s,
    blue: (s: string) => s,
    cyan: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    green: (s: string) => s,
    white: (s: string) => s,
    dim: (s: string) => s,
    bold: (s: string) => s,
  },
}));

import { generateDynamicCropFilter, getAvailableAspects, FocusPoint } from '../postprod/reframe';

describe('Reframe Module', () => {
  describe('generateDynamicCropFilter', () => {
    it('should return center crop for no focus points', () => {
      const result = generateDynamicCropFilter([], 1920, 1080, 1080, 1080, 30);

      expect(result).toBe('crop=1080:1080:420:0');
    });

    it('should return center crop for single focus point', () => {
      const focusPoints: FocusPoint[] = [{ time: 0, x: 0.5, y: 0.5, weight: 1.0 }];

      const result = generateDynamicCropFilter(focusPoints, 1920, 1080, 1080, 1080, 30);

      // Single point returns default position with quoted values
      expect(result).toContain('crop=1080:1080:');
      expect(result).toContain('420');
    });

    it('should generate interpolated filter for multiple focus points', () => {
      const focusPoints: FocusPoint[] = [
        { time: 0, x: 0.25, y: 0.5, weight: 1.0 },
        { time: 2, x: 0.75, y: 0.5, weight: 1.0 },
      ];

      const result = generateDynamicCropFilter(focusPoints, 1920, 1080, 1080, 1080, 30);

      expect(result).toContain('crop=1080:1080:');
      expect(result).toContain('if(between(n,');
      expect(result).toContain("'");
    });

    it('should clamp crop positions to valid range', () => {
      const focusPoints: FocusPoint[] = [
        { time: 0, x: 0, y: 0, weight: 1.0 }, // Far left corner
        { time: 2, x: 1, y: 1, weight: 1.0 }, // Far right corner
      ];

      const result = generateDynamicCropFilter(focusPoints, 1920, 1080, 1080, 1080, 30);

      // Should produce valid crop filter with interpolation
      expect(result).toContain('crop=1080:1080:');
      expect(result).toContain('if(between(n,');
      // The clamping ensures start positions are 0 (not negative)
      expect(result).toMatch(/if\(between\(n,0,60\),0\+/);
    });

    it('should sort focus points by time', () => {
      const focusPoints: FocusPoint[] = [
        { time: 2, x: 0.75, y: 0.5, weight: 1.0 },
        { time: 0, x: 0.25, y: 0.5, weight: 1.0 },
        { time: 1, x: 0.5, y: 0.5, weight: 1.0 },
      ];

      const result = generateDynamicCropFilter(focusPoints, 1920, 1080, 1080, 1080, 30);

      // Should have two interpolation segments (0->1, 1->2)
      const matches = result.match(/if\(between/g);
      expect(matches?.length).toBe(4); // 2 for x, 2 for y
    });

    it('should use correct frame numbers based on fps', () => {
      const focusPoints: FocusPoint[] = [
        { time: 0, x: 0.25, y: 0.5, weight: 1.0 },
        { time: 1, x: 0.75, y: 0.5, weight: 1.0 },
      ];

      // 60 fps should have different frame numbers than 30 fps
      const result30 = generateDynamicCropFilter(focusPoints, 1920, 1080, 1080, 1080, 30);
      const result60 = generateDynamicCropFilter(focusPoints, 1920, 1080, 1080, 1080, 60);

      expect(result30).toContain('between(n,0,30)');
      expect(result60).toContain('between(n,0,60)');
    });

    it('should handle vertical crop (9:16)', () => {
      const focusPoints: FocusPoint[] = [{ time: 0, x: 0.5, y: 0.5, weight: 1.0 }];

      // Crop 1920x1080 to 607x1080 (9:16)
      const result = generateDynamicCropFilter(focusPoints, 1920, 1080, 607, 1080, 30);

      expect(result).toContain('crop=607:1080:');
    });

    it('should handle different crop dimensions', () => {
      // 16:9 from 4:3 source (needs vertical crop)
      const focusPoints: FocusPoint[] = [];
      const result = generateDynamicCropFilter(focusPoints, 1440, 1080, 1440, 810, 30);

      expect(result).toBe('crop=1440:810:0:135');
    });
  });

  describe('getAvailableAspects', () => {
    it('should return array of aspect ratios', () => {
      const aspects = getAvailableAspects();

      expect(Array.isArray(aspects)).toBe(true);
      expect(aspects.length).toBeGreaterThan(0);
    });

    it('should include common aspects', () => {
      const aspects = getAvailableAspects();
      const ratios = aspects.map((a) => a.ratio);

      expect(ratios).toContain('16:9');
      expect(ratios).toContain('9:16');
      expect(ratios).toContain('1:1');
    });

    it('should have name, ratio, and description for each', () => {
      const aspects = getAvailableAspects();

      aspects.forEach((aspect) => {
        expect(aspect.name).toBeDefined();
        expect(aspect.ratio).toBeDefined();
        expect(aspect.description).toBeDefined();
      });
    });
  });
});
