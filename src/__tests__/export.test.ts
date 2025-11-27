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

import {
  outputFormats,
  platformPresets,
  getAvailableFormats,
  getAvailablePlatforms,
  estimateFileSizes,
  FormatConfig,
  PlatformPreset,
} from '../postprod/export';

describe('Export Module', () => {
  describe('outputFormats', () => {
    it('should define MP4 format', () => {
      expect(outputFormats.mp4).toBeDefined();
      expect(outputFormats.mp4.extension).toBe('.mp4');
      expect(outputFormats.mp4.videoCodec).toBe('libx264');
      expect(outputFormats.mp4.audioCodec).toBe('aac');
      expect(outputFormats.mp4.pixelFormat).toBe('yuv420p');
    });

    it('should define WebM format', () => {
      expect(outputFormats.webm).toBeDefined();
      expect(outputFormats.webm.extension).toBe('.webm');
      expect(outputFormats.webm.videoCodec).toBe('libvpx-vp9');
      expect(outputFormats.webm.audioCodec).toBe('libopus');
      expect(outputFormats.webm.options).toEqual({ 'b:v': '0' });
    });

    it('should define HEVC format', () => {
      expect(outputFormats.hevc).toBeDefined();
      expect(outputFormats.hevc.videoCodec).toBe('libx265');
    });

    it('should define GIF format with no audio', () => {
      expect(outputFormats.gif).toBeDefined();
      expect(outputFormats.gif.audioCodec).toBe('none');
      expect(outputFormats.gif.options?.loop).toBe(0);
    });

    it('should define ProRes format', () => {
      expect(outputFormats.prores).toBeDefined();
      expect(outputFormats.prores.extension).toBe('.mov');
      expect(outputFormats.prores.videoCodec).toBe('prores_ks');
      expect(outputFormats.prores.audioCodec).toBe('pcm_s16le');
    });

    it('should have required properties on all formats', () => {
      const requiredProps: (keyof FormatConfig)[] = [
        'name',
        'extension',
        'videoCodec',
        'audioCodec',
        'description',
      ];

      Object.values(outputFormats).forEach((format) => {
        requiredProps.forEach((prop) => {
          expect(format[prop]).toBeDefined();
        });
      });
    });
  });

  describe('platformPresets', () => {
    it('should define YouTube preset', () => {
      expect(platformPresets.youtube).toBeDefined();
      expect(platformPresets.youtube.format).toBe('mp4');
      expect(platformPresets.youtube.aspects).toContain('16:9');
      expect(platformPresets.youtube.quality).toBe('high');
    });

    it('should define TikTok preset with vertical aspect', () => {
      expect(platformPresets.tiktok).toBeDefined();
      expect(platformPresets.tiktok.aspects).toContain('9:16');
      expect(platformPresets.tiktok.maxDuration).toBe(180);
      expect(platformPresets.tiktok.maxFileSize).toBe(287);
    });

    it('should define Instagram Reels preset', () => {
      expect(platformPresets.instagram_reels).toBeDefined();
      expect(platformPresets.instagram_reels.aspects).toContain('9:16');
      expect(platformPresets.instagram_reels.maxDuration).toBe(90);
    });

    it('should define Instagram Feed preset', () => {
      expect(platformPresets.instagram_feed).toBeDefined();
      expect(platformPresets.instagram_feed.aspects).toContain('1:1');
      expect(platformPresets.instagram_feed.aspects).toContain('4:5');
    });

    it('should define Twitter preset', () => {
      expect(platformPresets.twitter).toBeDefined();
      expect(platformPresets.twitter.maxDuration).toBe(140);
      expect(platformPresets.twitter.maxFileSize).toBe(512);
    });

    it('should define LinkedIn preset', () => {
      expect(platformPresets.linkedin).toBeDefined();
      expect(platformPresets.linkedin.maxDuration).toBe(600);
    });

    it('should define web embed preset with WebM', () => {
      expect(platformPresets.web).toBeDefined();
      expect(platformPresets.web.format).toBe('webm');
    });

    it('should define archive preset with ProRes', () => {
      expect(platformPresets.archive).toBeDefined();
      expect(platformPresets.archive.format).toBe('prores');
      expect(platformPresets.archive.quality).toBe('high');
    });

    it('should have required properties on all presets', () => {
      const requiredProps: (keyof PlatformPreset)[] = ['name', 'format', 'aspects', 'quality'];

      Object.values(platformPresets).forEach((preset) => {
        requiredProps.forEach((prop) => {
          expect(preset[prop]).toBeDefined();
        });
      });
    });
  });

  describe('getAvailableFormats', () => {
    it('should return all formats as array', () => {
      const formats = getAvailableFormats();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
    });

    it('should include key and config for each format', () => {
      const formats = getAvailableFormats();
      formats.forEach((f) => {
        expect(f.key).toBeDefined();
        expect(f.config).toBeDefined();
        expect(f.config.name).toBeDefined();
      });
    });

    it('should include mp4 format', () => {
      const formats = getAvailableFormats();
      const mp4 = formats.find((f) => f.key === 'mp4');
      expect(mp4).toBeDefined();
      expect(mp4?.config.extension).toBe('.mp4');
    });
  });

  describe('getAvailablePlatforms', () => {
    it('should return all platforms as array', () => {
      const platforms = getAvailablePlatforms();
      expect(Array.isArray(platforms)).toBe(true);
      expect(platforms.length).toBeGreaterThan(0);
    });

    it('should include key and preset for each platform', () => {
      const platforms = getAvailablePlatforms();
      platforms.forEach((p) => {
        expect(p.key).toBeDefined();
        expect(p.preset).toBeDefined();
        expect(p.preset.name).toBeDefined();
      });
    });

    it('should include youtube platform', () => {
      const platforms = getAvailablePlatforms();
      const youtube = platforms.find((p) => p.key === 'youtube');
      expect(youtube).toBeDefined();
      expect(youtube?.preset.format).toBe('mp4');
    });
  });

  describe('estimateFileSizes', () => {
    it('should estimate sizes for multiple formats', () => {
      const estimates = estimateFileSizes(60, ['mp4', 'webm'], ['16:9'], 'standard');
      expect(estimates).toHaveLength(2);
      expect(estimates[0].format).toBe('mp4');
      expect(estimates[1].format).toBe('webm');
    });

    it('should estimate sizes for multiple aspects', () => {
      const estimates = estimateFileSizes(60, ['mp4'], ['16:9', '9:16', '1:1'], 'standard');
      expect(estimates).toHaveLength(3);
      expect(estimates[0].aspect).toBe('16:9');
      expect(estimates[1].aspect).toBe('9:16');
      expect(estimates[2].aspect).toBe('1:1');
    });

    it('should return larger estimates for high quality', () => {
      const highQuality = estimateFileSizes(60, ['mp4'], ['16:9'], 'high');
      const lowQuality = estimateFileSizes(60, ['mp4'], ['16:9'], 'draft');
      expect(highQuality[0].estimatedSizeMB).toBeGreaterThan(lowQuality[0].estimatedSizeMB);
    });

    it('should scale with duration', () => {
      const shortVideo = estimateFileSizes(30, ['mp4'], ['16:9'], 'standard');
      const longVideo = estimateFileSizes(60, ['mp4'], ['16:9'], 'standard');
      expect(longVideo[0].estimatedSizeMB).toBeGreaterThan(shortVideo[0].estimatedSizeMB);
    });

    it('should handle GIF format with higher bitrate', () => {
      const gifEstimate = estimateFileSizes(10, ['gif'], ['16:9'], 'standard');
      const mp4Estimate = estimateFileSizes(10, ['mp4'], ['16:9'], 'standard');
      expect(gifEstimate[0].estimatedSizeMB).toBeGreaterThan(mp4Estimate[0].estimatedSizeMB);
    });

    it('should handle ProRes format with high bitrate', () => {
      const proresEstimate = estimateFileSizes(10, ['prores'], ['16:9'], 'high');
      expect(proresEstimate[0].estimatedSizeMB).toBeGreaterThan(100);
    });

    it('should handle unknown formats with default bitrate', () => {
      const estimate = estimateFileSizes(60, ['unknown'], ['16:9'], 'standard');
      expect(estimate).toHaveLength(1);
      expect(estimate[0].estimatedSizeMB).toBeGreaterThan(0);
    });

    it('should round to one decimal place', () => {
      const estimates = estimateFileSizes(33, ['mp4'], ['16:9'], 'standard');
      const sizeMB = estimates[0].estimatedSizeMB;
      expect(sizeMB).toBe(Math.round(sizeMB * 10) / 10);
    });
  });
});
