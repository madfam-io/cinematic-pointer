import {
  aspectRatios,
  getAspectConfig,
  getAvailableAspects,
  calculateCropDimensions,
  calculateCenterCrop,
  needsCrop,
  parseAspectRatio,
  generateCropFilterString,
} from '../utils/aspect';

describe('Aspect Ratio Utils', () => {
  describe('aspectRatios', () => {
    it('should define common aspect ratios', () => {
      expect(aspectRatios['16:9']).toBeDefined();
      expect(aspectRatios['9:16']).toBeDefined();
      expect(aspectRatios['1:1']).toBeDefined();
      expect(aspectRatios['4:3']).toBeDefined();
      expect(aspectRatios['21:9']).toBeDefined();
    });

    it('should have correct dimensions for 16:9', () => {
      expect(aspectRatios['16:9'].width).toBe(1920);
      expect(aspectRatios['16:9'].height).toBe(1080);
      expect(aspectRatios['16:9'].ratio).toBeCloseTo(16 / 9);
    });

    it('should have correct dimensions for 9:16 (vertical)', () => {
      expect(aspectRatios['9:16'].width).toBe(1080);
      expect(aspectRatios['9:16'].height).toBe(1920);
      expect(aspectRatios['9:16'].ratio).toBeCloseTo(9 / 16);
    });

    it('should have correct dimensions for 1:1 (square)', () => {
      expect(aspectRatios['1:1'].width).toBe(1080);
      expect(aspectRatios['1:1'].height).toBe(1080);
      expect(aspectRatios['1:1'].ratio).toBe(1);
    });
  });

  describe('getAspectConfig', () => {
    it('should return config for known aspect ratio', () => {
      const config = getAspectConfig('16:9');
      expect(config.width).toBe(1920);
      expect(config.height).toBe(1080);
    });

    it('should return default 16:9 for unknown aspect', () => {
      const config = getAspectConfig('unknown');
      expect(config).toEqual(aspectRatios['16:9']);
    });

    it('should return correct config for each ratio', () => {
      expect(getAspectConfig('9:16').name).toBe('Portrait');
      expect(getAspectConfig('1:1').name).toBe('Square');
      expect(getAspectConfig('4:3').name).toBe('Classic');
    });
  });

  describe('getAvailableAspects', () => {
    it('should return array of aspect options', () => {
      const aspects = getAvailableAspects();
      expect(Array.isArray(aspects)).toBe(true);
      expect(aspects.length).toBeGreaterThan(0);
    });

    it('should include common aspects', () => {
      const aspects = getAvailableAspects();
      const names = aspects.map((a) => a.name);
      expect(names).toContain('16:9');
      expect(names).toContain('9:16');
      expect(names).toContain('1:1');
    });

    it('should have description for each aspect', () => {
      const aspects = getAvailableAspects();
      aspects.forEach((aspect) => {
        expect(aspect.description).toBeDefined();
        expect(aspect.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateCropDimensions', () => {
    it('should crop wider input to narrower target', () => {
      // 16:9 input (1920x1080) to 1:1 target
      const result = calculateCropDimensions(1920, 1080, 1);
      expect(result.cropWidth).toBe(1080);
      expect(result.cropHeight).toBe(1080);
      expect(result.cropX).toBe(420); // centered
      expect(result.cropY).toBe(0);
    });

    it('should crop taller input to wider target', () => {
      // 9:16 input (1080x1920) to 1:1 target
      const result = calculateCropDimensions(1080, 1920, 1);
      expect(result.cropWidth).toBe(1080);
      expect(result.cropHeight).toBe(1080);
      expect(result.cropX).toBe(0);
      expect(result.cropY).toBe(420); // centered
    });

    it('should use focus point for crop position', () => {
      // Focus on left side (0.2)
      const result = calculateCropDimensions(1920, 1080, 1, 0.2, 0.5);
      expect(result.cropWidth).toBe(1080);
      expect(result.cropX).toBeLessThan(420); // Should be left of center
    });

    it('should clamp crop position to valid range', () => {
      // Focus at extreme left (0)
      const result = calculateCropDimensions(1920, 1080, 1, 0, 0.5);
      expect(result.cropX).toBeGreaterThanOrEqual(0);

      // Focus at extreme right (1)
      const result2 = calculateCropDimensions(1920, 1080, 1, 1, 0.5);
      expect(result2.cropX + result2.cropWidth).toBeLessThanOrEqual(1920);
    });

    it('should handle no-crop case (same aspect)', () => {
      const result = calculateCropDimensions(1920, 1080, 16 / 9);
      // Should return full dimensions
      expect(result.cropWidth).toBe(1920);
      expect(result.cropHeight).toBe(1080);
    });
  });

  describe('calculateCenterCrop', () => {
    it('should calculate center crop', () => {
      const result = calculateCenterCrop(1920, 1080, 1);
      expect(result.cropX).toBe(420);
      expect(result.cropY).toBe(0);
      expect(result.cropWidth).toBe(1080);
      expect(result.cropHeight).toBe(1080);
    });
  });

  describe('needsCrop', () => {
    it('should return true when aspects differ', () => {
      expect(needsCrop(1920, 1080, 1)).toBe(true); // 16:9 to 1:1
      expect(needsCrop(1920, 1080, 9 / 16)).toBe(true); // 16:9 to 9:16
    });

    it('should return false when aspects match', () => {
      expect(needsCrop(1920, 1080, 16 / 9)).toBe(false);
      expect(needsCrop(1080, 1080, 1)).toBe(false);
    });

    it('should respect tolerance', () => {
      // Slightly off 16:9 (within default tolerance)
      expect(needsCrop(1920, 1081, 16 / 9)).toBe(false);
      // Way off 16:9
      expect(needsCrop(1920, 1200, 16 / 9)).toBe(true);
    });

    it('should use custom tolerance', () => {
      expect(needsCrop(1920, 1085, 16 / 9, 0.001)).toBe(true);
      expect(needsCrop(1920, 1085, 16 / 9, 0.1)).toBe(false);
    });
  });

  describe('parseAspectRatio', () => {
    it('should parse known aspect ratios', () => {
      expect(parseAspectRatio('16:9')).toBeCloseTo(16 / 9);
      expect(parseAspectRatio('1:1')).toBe(1);
      expect(parseAspectRatio('9:16')).toBeCloseTo(9 / 16);
    });

    it('should parse custom W:H format', () => {
      expect(parseAspectRatio('3:2')).toBeCloseTo(1.5);
      expect(parseAspectRatio('2.35:1')).toBeCloseTo(2.35);
    });

    it('should return default for invalid input', () => {
      expect(parseAspectRatio('invalid')).toBeCloseTo(16 / 9);
      expect(parseAspectRatio('')).toBeCloseTo(16 / 9);
    });
  });

  describe('generateCropFilterString', () => {
    it('should generate valid FFmpeg crop filter', () => {
      const crop = { cropWidth: 1080, cropHeight: 1080, cropX: 420, cropY: 0 };
      const result = generateCropFilterString(crop);
      expect(result).toBe('crop=1080:1080:420:0');
    });
  });
});
