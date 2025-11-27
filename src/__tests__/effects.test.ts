import {
  generateZoomPanFilter,
  generateSimpleZoomFilter,
  generateSpeedFilter,
  generateAudioSpeedFilter,
  generateSpeedRampFilter,
  generateFadeFilter,
  generateCrossfadeFilter,
  generateScaleFilter,
  generateCropFilter,
  generateVignetteFilter,
  generateColorGradeFilter,
  generateMotionBlurFilter,
  generateAdaptiveMotionBlurFilter,
  generateSegmentedMotionBlurFilter,
  generateAudioDuckingFilter,
  generateSidechainDuckFilter,
  generateAudioFadeFilter,
  generateVolumeFilter,
  generateNormalizeFilter,
  generateAudioProcessingChain,
  VideoInfo,
  ZoomPanKeyframe,
  SpeedSegment,
  MotionBlurSegment,
  DuckingConfig,
} from '../postprod/effects';

describe('Effects Module', () => {
  const mockVideo: VideoInfo = {
    width: 1920,
    height: 1080,
    duration: 60,
    fps: 30,
  };

  describe('Zoom Effects', () => {
    describe('generateZoomPanFilter', () => {
      it('should return empty string for no keyframes', () => {
        expect(generateZoomPanFilter([], mockVideo)).toBe('');
      });

      it('should generate filter for single keyframe', () => {
        const keyframes: ZoomPanKeyframe[] = [{ time: 0, zoom: 1.0, x: 0.5, y: 0.5 }];
        const result = generateZoomPanFilter(keyframes, mockVideo);
        expect(result).toContain('zoompan=');
        expect(result).toContain("z='1'");
        expect(result).toContain('s=1920x1080');
        expect(result).toContain('fps=30');
      });

      it('should generate filter for multiple keyframes', () => {
        const keyframes: ZoomPanKeyframe[] = [
          { time: 0, zoom: 1.0, x: 0.5, y: 0.5 },
          { time: 2, zoom: 1.5, x: 0.3, y: 0.7 },
        ];
        const result = generateZoomPanFilter(keyframes, mockVideo);
        expect(result).toContain('zoompan=');
        expect(result).toContain('if(between');
      });

      it('should respect custom output size', () => {
        const keyframes: ZoomPanKeyframe[] = [{ time: 0, zoom: 1.0, x: 0.5, y: 0.5 }];
        const result = generateZoomPanFilter(keyframes, mockVideo, { width: 1280, height: 720 });
        expect(result).toContain('s=1280x720');
      });
    });

    describe('generateSimpleZoomFilter', () => {
      it('should generate zoom filter', () => {
        const result = generateSimpleZoomFilter(1.0, 1.5, 0.5, 0.5, mockVideo);
        expect(result).toContain('zoompan=');
        expect(result).toContain("z='1+(1.5-1)");
      });

      it('should respect custom duration', () => {
        const result = generateSimpleZoomFilter(1.0, 2.0, 0.5, 0.5, mockVideo, 10);
        expect(result).toContain('d=300'); // 10 seconds * 30 fps
      });
    });
  });

  describe('Speed Effects', () => {
    describe('generateSpeedFilter', () => {
      it('should return empty string for no segments', () => {
        expect(generateSpeedFilter([])).toBe('');
      });

      it('should generate setpts filter for segments', () => {
        const segments: SpeedSegment[] = [{ start: 0, end: 5, speed: 2.0 }];
        const result = generateSpeedFilter(segments);
        expect(result).toContain("setpts='");
        expect(result).toContain('if(between');
      });

      it('should handle multiple segments', () => {
        const segments: SpeedSegment[] = [
          { start: 0, end: 5, speed: 2.0 },
          { start: 5, end: 10, speed: 0.5 },
        ];
        const result = generateSpeedFilter(segments);
        expect(result).toContain('if(between(T,0,5)');
        expect(result).toContain('if(between(T,5,10)');
      });
    });

    describe('generateAudioSpeedFilter', () => {
      it('should return empty for normal speed', () => {
        expect(generateAudioSpeedFilter(1.0)).toBe('');
      });

      it('should handle speeds between 0.5 and 2.0', () => {
        expect(generateAudioSpeedFilter(1.5)).toBe('atempo=1.5');
        expect(generateAudioSpeedFilter(0.75)).toBe('atempo=0.75');
      });

      it('should chain filters for speeds over 2.0', () => {
        const result = generateAudioSpeedFilter(4.0);
        expect(result).toContain('atempo=2.0');
        expect(result.split('atempo=2.0').length).toBe(2); // At least one 2.0 filter
      });

      it('should chain filters for speeds under 0.5', () => {
        const result = generateAudioSpeedFilter(0.25);
        expect(result).toContain('atempo=0.5');
      });
    });

    describe('generateSpeedRampFilter', () => {
      it('should generate ramping speed filter', () => {
        const result = generateSpeedRampFilter(1.0, 2.0, mockVideo);
        expect(result).toContain("setpts='");
      });
    });
  });

  describe('Video Effects', () => {
    describe('generateFadeFilter', () => {
      it('should return empty for no fades', () => {
        expect(generateFadeFilter()).toBe('');
        expect(generateFadeFilter(0, 0)).toBe('');
      });

      it('should generate fade in filter', () => {
        const result = generateFadeFilter(2);
        expect(result).toBe('fade=t=in:st=0:d=2');
      });

      it('should generate fade out filter', () => {
        const result = generateFadeFilter(0, 2, 60);
        expect(result).toBe('fade=t=out:st=58:d=2');
      });

      it('should generate both fades', () => {
        const result = generateFadeFilter(1, 2, 60);
        expect(result).toBe('fade=t=in:st=0:d=1,fade=t=out:st=58:d=2');
      });
    });

    describe('generateCrossfadeFilter', () => {
      it('should generate xfade filter', () => {
        const result = generateCrossfadeFilter(1.5, '[v1]', '[v2]', '[out]');
        expect(result).toBe('[v1][v2]xfade=transition=fade:duration=1.5:offset=0[out]');
      });
    });

    describe('generateScaleFilter', () => {
      it('should generate scale filter maintaining aspect', () => {
        const result = generateScaleFilter(1280, 720, true);
        expect(result).toContain('scale=1280:720');
        expect(result).toContain('force_original_aspect_ratio=decrease');
        expect(result).toContain('pad=1280:720');
      });

      it('should generate simple scale filter', () => {
        const result = generateScaleFilter(1280, 720, false);
        expect(result).toBe('scale=1280:720');
      });
    });

    describe('generateCropFilter', () => {
      it('should generate crop filter for wider input', () => {
        const result = generateCropFilter(1920, 1080, 1); // 16:9 to 1:1
        expect(result).toContain('crop=1080:1080');
      });

      it('should generate crop filter for taller input', () => {
        const result = generateCropFilter(1080, 1920, 1); // 9:16 to 1:1
        expect(result).toContain('crop=1080:1080');
      });

      it('should respect focus point', () => {
        const result = generateCropFilter(1920, 1080, 1, 0.2, 0.5);
        expect(result).toContain('crop=');
      });
    });

    describe('generateVignetteFilter', () => {
      it('should generate vignette filter', () => {
        const result = generateVignetteFilter(0.5);
        expect(result).toContain('vignette=angle=');
      });

      it('should use default intensity', () => {
        const result = generateVignetteFilter();
        expect(result).toContain('vignette=angle=');
      });
    });

    describe('generateColorGradeFilter', () => {
      it('should return empty for none preset', () => {
        expect(generateColorGradeFilter('none')).toBe('');
      });

      it('should generate warm color grading', () => {
        const result = generateColorGradeFilter('warm');
        expect(result).toContain('colorbalance=');
      });

      it('should generate cool color grading', () => {
        const result = generateColorGradeFilter('cool');
        expect(result).toContain('colorbalance=');
      });

      it('should generate dramatic color grading', () => {
        const result = generateColorGradeFilter('dramatic');
        expect(result).toContain('eq=');
      });
    });
  });

  describe('Motion Blur Effects', () => {
    describe('generateMotionBlurFilter', () => {
      it('should generate tblend filter', () => {
        const result = generateMotionBlurFilter(0.5);
        expect(result).toContain('tblend=all_mode=average');
      });

      it('should clamp strength between 0 and 1', () => {
        const result1 = generateMotionBlurFilter(-1);
        const result2 = generateMotionBlurFilter(2);
        expect(result1).toContain('all_opacity=0');
        expect(result2).toContain('all_opacity=0.5');
      });
    });

    describe('generateAdaptiveMotionBlurFilter', () => {
      it('should generate minterpolate filter', () => {
        const result = generateAdaptiveMotionBlurFilter(30);
        expect(result).toContain('minterpolate=fps=60');
        expect(result).toContain('mi_mode=blend');
      });
    });

    describe('generateSegmentedMotionBlurFilter', () => {
      it('should return empty for no segments', () => {
        expect(generateSegmentedMotionBlurFilter([])).toBe('');
      });

      it('should generate conditional blur filter', () => {
        const segments: MotionBlurSegment[] = [{ start: 0, end: 5, strength: 0.5 }];
        const result = generateSegmentedMotionBlurFilter(segments);
        expect(result).toContain('tblend=');
        expect(result).toContain("enable='between(t,0,5)'");
      });
    });
  });

  describe('Audio Effects', () => {
    describe('generateAudioDuckingFilter', () => {
      it('should return empty for no duck points', () => {
        const config: DuckingConfig = { duckPoints: [] };
        expect(generateAudioDuckingFilter(config)).toBe('');
      });

      it('should generate volume filter with duck points', () => {
        const config: DuckingConfig = {
          duckPoints: [{ time: 5, duration: 3, level: 0.3 }],
        };
        const result = generateAudioDuckingFilter(config);
        expect(result).toContain("volume='");
        expect(result).toContain('if(between');
      });
    });

    describe('generateSidechainDuckFilter', () => {
      it('should generate sidechaincompress filter', () => {
        const result = generateSidechainDuckFilter();
        expect(result).toContain('sidechaincompress=');
        expect(result).toContain('threshold=');
        expect(result).toContain('ratio=');
      });

      it('should use custom parameters', () => {
        const result = generateSidechainDuckFilter(0.02, 5, 30, 300);
        expect(result).toContain('threshold=0.02');
        expect(result).toContain('ratio=5');
        expect(result).toContain('attack=30');
        expect(result).toContain('release=300');
      });
    });

    describe('generateAudioFadeFilter', () => {
      it('should return empty for no fades', () => {
        expect(generateAudioFadeFilter()).toBe('');
      });

      it('should generate audio fade in', () => {
        const result = generateAudioFadeFilter(2);
        expect(result).toBe('afade=t=in:st=0:d=2');
      });

      it('should generate audio fade out', () => {
        const result = generateAudioFadeFilter(0, 2, 60);
        expect(result).toBe('afade=t=out:st=58:d=2');
      });
    });

    describe('generateVolumeFilter', () => {
      it('should generate volume filter', () => {
        expect(generateVolumeFilter(0.5)).toBe('volume=0.5');
        expect(generateVolumeFilter(1.5)).toBe('volume=1.5');
      });
    });

    describe('generateNormalizeFilter', () => {
      it('should generate loudnorm filter with defaults', () => {
        const result = generateNormalizeFilter();
        expect(result).toContain('loudnorm=I=-16');
      });

      it('should use custom target', () => {
        const result = generateNormalizeFilter(-23);
        expect(result).toContain('loudnorm=I=-23');
      });
    });

    describe('generateAudioProcessingChain', () => {
      it('should return empty for no options', () => {
        expect(generateAudioProcessingChain({})).toBe('');
      });

      it('should generate chain with normalize', () => {
        const result = generateAudioProcessingChain({ normalize: true });
        expect(result).toContain('loudnorm');
      });

      it('should generate chain with volume', () => {
        const result = generateAudioProcessingChain({ volume: 0.8 });
        expect(result).toContain('volume=0.8');
      });

      it('should generate chain with fades', () => {
        const result = generateAudioProcessingChain({
          fadeIn: 1,
          fadeOut: 2,
          duration: 60,
        });
        expect(result).toContain('afade=t=in');
        expect(result).toContain('afade=t=out');
      });

      it('should chain multiple filters', () => {
        const result = generateAudioProcessingChain({
          normalize: true,
          volume: 0.8,
          fadeIn: 1,
          duration: 60,
        });
        expect(result.split(',').length).toBeGreaterThan(1);
      });

      it('should generate chain with ducking', () => {
        const result = generateAudioProcessingChain({
          ducking: {
            duckPoints: [{ time: 5, duration: 3, level: 0.3 }],
          },
        });
        expect(result).toContain('volume=');
        expect(result).toContain('if(between(t,');
        expect(result).toContain('0.3');
      });
    });
  });
});
