import {
  generateBlurFilter,
  generateSimpleBlurFilter,
  extractBlurRegionsFromEvents,
  generateAutoDetectSelectors,
  createBlurMapFromJourney,
  validateBlurMap,
  ResolvedRegion,
  BlurMapConfig,
  RedactionStyle,
} from '../postprod/privacy';

describe('Privacy Module', () => {
  describe('generateBlurFilter', () => {
    it('should return empty string for no regions', () => {
      const result = generateBlurFilter([], 1920, 1080, 30, 900);
      expect(result).toBe('');
    });

    it('should generate blur filter for single region', () => {
      const regions: ResolvedRegion[] = [
        {
          id: 'region1',
          startFrame: 0,
          endFrame: 100,
          x: 100,
          y: 100,
          width: 200,
          height: 50,
          style: { type: 'blur', strength: 30 },
        },
      ];

      const result = generateBlurFilter(regions, 1920, 1080, 30, 900);
      expect(result).toContain('split=2');
      expect(result).toContain('crop=200:50:100:100');
      expect(result).toContain('boxblur=');
      expect(result).toContain('overlay=100:100');
    });

    it('should generate mosaic filter', () => {
      const regions: ResolvedRegion[] = [
        {
          id: 'region1',
          startFrame: 0,
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          style: { type: 'mosaic', strength: 20 },
        },
      ];

      const result = generateBlurFilter(regions, 1920, 1080, 30, 900);
      expect(result).toContain('scale=iw/');
      expect(result).toContain(':flags=neighbor');
    });

    it('should generate pixelate filter', () => {
      const regions: ResolvedRegion[] = [
        {
          id: 'region1',
          startFrame: 0,
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          style: { type: 'pixelate', strength: 40 },
        },
      ];

      const result = generateBlurFilter(regions, 1920, 1080, 30, 900);
      expect(result).toContain('scale=iw/');
    });

    it('should generate solid fill filter', () => {
      const regions: ResolvedRegion[] = [
        {
          id: 'region1',
          startFrame: 0,
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          style: { type: 'solid', color: 'red' },
        },
      ];

      const result = generateBlurFilter(regions, 1920, 1080, 30, 900);
      expect(result).toContain('drawbox=');
      expect(result).toContain('color=red');
      expect(result).toContain('t=fill');
    });

    it('should use default color for solid without color', () => {
      const regions: ResolvedRegion[] = [
        {
          id: 'region1',
          startFrame: 0,
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          style: { type: 'solid' },
        },
      ];

      const result = generateBlurFilter(regions, 1920, 1080, 30, 900);
      expect(result).toContain('color=black');
    });

    it('should handle unknown style type with default blur', () => {
      const regions: ResolvedRegion[] = [
        {
          id: 'region1',
          startFrame: 0,
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          style: { type: 'unknown' as 'blur' },
        },
      ];

      const result = generateBlurFilter(regions, 1920, 1080, 30, 900);
      expect(result).toContain('boxblur=10:10');
    });

    it('should clamp blur strength to valid range', () => {
      const regions: ResolvedRegion[] = [
        {
          id: 'region1',
          startFrame: 0,
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          style: { type: 'blur', strength: 200 },
        },
      ];

      const result = generateBlurFilter(regions, 1920, 1080, 30, 900);
      expect(result).toContain('boxblur=20:20'); // 100/5 = 20
    });

    it('should use total frames when endFrame not specified', () => {
      const regions: ResolvedRegion[] = [
        {
          id: 'region1',
          startFrame: 0,
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          style: { type: 'blur' },
        },
      ];

      const result = generateBlurFilter(regions, 1920, 1080, 30, 900);
      expect(result).toContain('between(n,0,900)');
    });

    it('should chain multiple regions', () => {
      const regions: ResolvedRegion[] = [
        {
          id: 'region1',
          startFrame: 0,
          endFrame: 100,
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          style: { type: 'blur', strength: 30 },
        },
        {
          id: 'region2',
          startFrame: 50,
          endFrame: 150,
          x: 200,
          y: 200,
          width: 150,
          height: 75,
          style: { type: 'blur', strength: 50 },
        },
      ];

      const result = generateBlurFilter(regions, 1920, 1080, 30, 900);
      expect(result).toContain('[base0]');
      expect(result).toContain('[base1]');
    });
  });

  describe('generateSimpleBlurFilter', () => {
    it('should generate simple blur filter', () => {
      const result = generateSimpleBlurFilter(100, 100, 200, 50, 30);
      expect(result).toContain('split[base][blur]');
      expect(result).toContain('crop=200:50:100:100');
      expect(result).toContain('boxblur=6:6');
      expect(result).toContain('overlay=100:100');
    });

    it('should use default strength', () => {
      const result = generateSimpleBlurFilter(0, 0, 100, 100);
      expect(result).toContain('boxblur=6:6'); // 30/5 = 6
    });

    it('should clamp strength to valid range', () => {
      const result = generateSimpleBlurFilter(0, 0, 100, 100, 0);
      expect(result).toContain('boxblur=');
    });
  });

  describe('extractBlurRegionsFromEvents', () => {
    it('should return empty array for no matching events', () => {
      const events = [{ ts: 0, t: 'cursor.click' }];
      const config: BlurMapConfig = { regions: [] };

      const result = extractBlurRegionsFromEvents(events, config, 1920, 1080);
      expect(result).toHaveLength(0);
    });

    it('should extract fixed regions', () => {
      const events: Array<{ ts: number; t: string }> = [];
      const config: BlurMapConfig = {
        regions: [
          {
            id: 'fixed1',
            startTime: 0,
            type: 'fixed',
            coords: { x: 100, y: 100, width: 200, height: 50 },
            style: { type: 'blur', strength: 30 },
          },
        ],
      };

      const result = extractBlurRegionsFromEvents(events, config, 1920, 1080);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fixed1');
      expect(result[0].x).toBe(100);
      expect(result[0].y).toBe(100);
    });

    it('should apply padding to fixed regions', () => {
      const events: Array<{ ts: number; t: string }> = [];
      const config: BlurMapConfig = {
        regions: [
          {
            id: 'fixed1',
            startTime: 0,
            type: 'fixed',
            coords: { x: 100, y: 100, width: 200, height: 50 },
            padding: 10,
            style: { type: 'blur' },
          },
        ],
      };

      const result = extractBlurRegionsFromEvents(events, config, 1920, 1080);
      expect(result[0].x).toBe(90);
      expect(result[0].y).toBe(90);
      expect(result[0].width).toBe(220);
      expect(result[0].height).toBe(70);
    });

    it('should clamp coordinates to video bounds', () => {
      const events: Array<{ ts: number; t: string }> = [];
      const config: BlurMapConfig = {
        regions: [
          {
            id: 'fixed1',
            startTime: 0,
            type: 'fixed',
            coords: { x: 10, y: 10, width: 200, height: 50 },
            padding: 20,
            style: { type: 'blur' },
          },
        ],
      };

      const result = extractBlurRegionsFromEvents(events, config, 100, 100);
      expect(result[0].x).toBe(0);
      expect(result[0].y).toBe(0);
      expect(result[0].width).toBe(100);
      expect(result[0].height).toBe(90);
    });

    it('should extract regions from input.fill events with selector match', () => {
      const events = [
        {
          ts: 1000,
          t: 'input.fill',
          to: [500, 300],
          selector: { placeholder: 'Password' },
        },
      ];
      const config: BlurMapConfig = {
        regions: [
          {
            id: 'password-field',
            startTime: 0,
            type: 'selector',
            selector: { placeholder: 'Password' },
            style: { type: 'blur', strength: 50 },
          },
        ],
      };

      const result = extractBlurRegionsFromEvents(events, config, 1920, 1080);
      expect(result).toHaveLength(1);
      expect(result[0].startFrame).toBe(30); // 1000ms / 1000 * 30fps
    });

    it('should not extract regions for non-matching selectors', () => {
      const events = [
        {
          ts: 1000,
          t: 'input.fill',
          to: [500, 300],
          selector: { placeholder: 'Username' },
        },
      ];
      const config: BlurMapConfig = {
        regions: [
          {
            id: 'password-field',
            startTime: 0,
            type: 'selector',
            selector: { placeholder: 'Password' },
            style: { type: 'blur' },
          },
        ],
      };

      const result = extractBlurRegionsFromEvents(events, config, 1920, 1080);
      expect(result).toHaveLength(0);
    });
  });

  describe('generateAutoDetectSelectors', () => {
    it('should return empty array for undefined config', () => {
      const result = generateAutoDetectSelectors(undefined);
      expect(result).toHaveLength(0);
    });

    it('should generate password selectors', () => {
      const result = generateAutoDetectSelectors({ passwords: true });
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((s) => s.by === 'css' && s.value?.includes('password'))).toBe(true);
      expect(result.some((s) => s.placeholder === 'Password')).toBe(true);
    });

    it('should generate credit card selectors', () => {
      const result = generateAutoDetectSelectors({ creditCards: true });
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((s) => s.placeholder === 'Card number')).toBe(true);
      expect(result.some((s) => s.placeholder === 'CVV')).toBe(true);
    });

    it('should generate email selectors', () => {
      const result = generateAutoDetectSelectors({ emails: true });
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((s) => s.by === 'css' && s.value?.includes('email'))).toBe(true);
    });

    it('should include custom patterns', () => {
      const result = generateAutoDetectSelectors({
        patterns: ['input[name="ssn"]', 'input[name="secret"]'],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ by: 'css', value: 'input[name="ssn"]' });
    });

    it('should combine multiple options', () => {
      const result = generateAutoDetectSelectors({
        passwords: true,
        creditCards: true,
        emails: true,
        patterns: ['input[custom]'],
      });
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe('createBlurMapFromJourney', () => {
    it('should return empty regions for steps without mask', () => {
      const steps = [
        { action: 'click', locator: { role: 'button', name: 'Submit' } },
        { action: 'fill', locator: { placeholder: 'Username' }, mask: false },
      ];

      const result = createBlurMapFromJourney(steps);
      expect(result.regions).toHaveLength(0);
    });

    it('should create regions for masked steps', () => {
      const steps = [
        { action: 'fill', locator: { placeholder: 'Password' }, mask: true },
        { action: 'fill', locator: { placeholder: 'Credit Card' }, mask: true },
      ];

      const result = createBlurMapFromJourney(steps);
      expect(result.regions).toHaveLength(2);
      expect(result.regions[0].id).toBe('step-0');
      expect(result.regions[0].selector).toEqual({ placeholder: 'Password' });
      expect(result.regions[1].id).toBe('step-1');
    });

    it('should use default style', () => {
      const steps = [{ action: 'fill', locator: { placeholder: 'Password' }, mask: true }];

      const result = createBlurMapFromJourney(steps);
      expect(result.regions[0].style).toEqual({ type: 'blur', strength: 30 });
    });

    it('should use custom style', () => {
      const steps = [{ action: 'fill', locator: { placeholder: 'Password' }, mask: true }];
      const customStyle: RedactionStyle = { type: 'pixelate', strength: 50 };

      const result = createBlurMapFromJourney(steps, customStyle);
      expect(result.regions[0].style).toEqual(customStyle);
    });

    it('should include autoDetect defaults', () => {
      const steps = [{ action: 'fill', locator: { placeholder: 'Password' }, mask: true }];

      const result = createBlurMapFromJourney(steps);
      expect(result.autoDetect?.passwords).toBe(true);
      expect(result.autoDetect?.creditCards).toBe(true);
    });

    it('should ignore steps without locator', () => {
      const steps = [
        { action: 'pause', mask: true },
        { action: 'fill', locator: { placeholder: 'Password' }, mask: true },
      ];

      const result = createBlurMapFromJourney(steps);
      expect(result.regions).toHaveLength(1);
      expect(result.regions[0].id).toBe('step-1');
    });
  });

  describe('validateBlurMap', () => {
    it('should return no errors for valid config', () => {
      const config: BlurMapConfig = {
        regions: [
          {
            id: 'region1',
            startTime: 0,
            type: 'fixed',
            coords: { x: 0, y: 0, width: 100, height: 50 },
            style: { type: 'blur' },
          },
        ],
      };

      const errors = validateBlurMap(config);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing id', () => {
      const config: BlurMapConfig = {
        regions: [
          {
            id: '',
            startTime: 0,
            type: 'fixed',
            coords: { x: 0, y: 0, width: 100, height: 50 },
            style: { type: 'blur' },
          },
        ],
      };

      const errors = validateBlurMap(config);
      expect(errors).toContain('Region missing id');
    });

    it('should detect fixed type without coords', () => {
      const config: BlurMapConfig = {
        regions: [
          {
            id: 'region1',
            startTime: 0,
            type: 'fixed',
            style: { type: 'blur' },
          },
        ],
      };

      const errors = validateBlurMap(config);
      expect(errors.some((e) => e.includes('fixed type requires coords'))).toBe(true);
    });

    it('should detect selector type without selector', () => {
      const config: BlurMapConfig = {
        regions: [
          {
            id: 'region1',
            startTime: 0,
            type: 'selector',
            style: { type: 'blur' },
          },
        ],
      };

      const errors = validateBlurMap(config);
      expect(errors.some((e) => e.includes('selector type requires selector'))).toBe(true);
    });

    it('should detect missing style', () => {
      const config: BlurMapConfig = {
        regions: [
          {
            id: 'region1',
            startTime: 0,
            type: 'fixed',
            coords: { x: 0, y: 0, width: 100, height: 50 },
          } as BlurMapConfig['regions'][0],
        ],
      };

      const errors = validateBlurMap(config);
      expect(errors.some((e) => e.includes('missing style'))).toBe(true);
    });

    it('should report multiple errors', () => {
      const config: BlurMapConfig = {
        regions: [
          {
            id: '',
            startTime: 0,
            type: 'fixed',
          } as BlurMapConfig['regions'][0],
        ],
      };

      const errors = validateBlurMap(config);
      expect(errors.length).toBeGreaterThan(1);
    });
  });
});
