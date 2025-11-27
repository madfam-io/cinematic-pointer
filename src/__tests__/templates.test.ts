import {
  trailerTemplate,
  howtoTemplate,
  teaserTemplate,
  getTemplate,
  getAllTemplates,
  getQualityPreset,
  TemplateName,
  TemplateConfig,
} from '../postprod/templates';

describe('Templates Module', () => {
  describe('Template Definitions', () => {
    const allTemplates = [trailerTemplate, howtoTemplate, teaserTemplate];

    it('should have valid trailer template', () => {
      expect(trailerTemplate.name).toBe('trailer');
      expect(trailerTemplate.description).toBeDefined();
      expect(trailerTemplate.enableZoomPan).toBe(true);
      expect(trailerTemplate.quality).toBe('high');
    });

    it('should have valid howto template', () => {
      expect(howtoTemplate.name).toBe('howto');
      expect(howtoTemplate.enableSpeedRamps).toBe(false); // Steady pacing
      expect(howtoTemplate.preserveAudio).toBe(true); // Keep system sounds
    });

    it('should have valid teaser template', () => {
      expect(teaserTemplate.name).toBe('teaser');
      expect(teaserTemplate.enableCaptions).toBe(false); // Minimal text
      expect(teaserTemplate.framerate).toBe(60); // Higher fps for slow-mo
    });

    it('should have required properties on all templates', () => {
      const requiredProps: (keyof TemplateConfig)[] = [
        'name',
        'description',
        'introDuration',
        'outroDuration',
        'enableZoomPan',
        'defaultZoom',
        'maxZoom',
        'baseSpeed',
        'colorGrade',
        'fadeIn',
        'fadeOut',
        'enableCaptions',
        'captionStyle',
        'musicVolume',
        'quality',
        'framerate',
      ];

      allTemplates.forEach((template) => {
        requiredProps.forEach((prop) => {
          expect(template[prop]).toBeDefined();
        });
      });
    });

    it('should have valid zoom constraints', () => {
      allTemplates.forEach((template) => {
        expect(template.defaultZoom).toBeGreaterThanOrEqual(1.0);
        expect(template.maxZoom).toBeGreaterThan(template.defaultZoom);
      });
    });

    it('should have valid audio settings', () => {
      allTemplates.forEach((template) => {
        expect(template.musicVolume).toBeGreaterThanOrEqual(0);
        expect(template.musicVolume).toBeLessThanOrEqual(1);
        expect(template.audioFadeIn).toBeGreaterThanOrEqual(0);
        expect(template.audioFadeOut).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getTemplate', () => {
    it('should return trailer template', () => {
      const template = getTemplate('trailer');
      expect(template).toBe(trailerTemplate);
    });

    it('should return howto template', () => {
      const template = getTemplate('howto');
      expect(template).toBe(howtoTemplate);
    });

    it('should return teaser template', () => {
      const template = getTemplate('teaser');
      expect(template).toBe(teaserTemplate);
    });

    it('should return trailer as default for unknown names', () => {
      const template = getTemplate('unknown' as TemplateName);
      expect(template).toBe(trailerTemplate);
    });
  });

  describe('getAllTemplates', () => {
    it('should return all templates', () => {
      const templates = getAllTemplates();
      expect(templates).toHaveLength(3);
      expect(templates).toContain(trailerTemplate);
      expect(templates).toContain(howtoTemplate);
      expect(templates).toContain(teaserTemplate);
    });
  });

  describe('getQualityPreset', () => {
    it('should return draft preset', () => {
      const preset = getQualityPreset('draft');
      expect(preset.crf).toBe(28);
      expect(preset.preset).toBe('ultrafast');
      expect(preset.audioBitrate).toBe('128k');
    });

    it('should return standard preset', () => {
      const preset = getQualityPreset('standard');
      expect(preset.crf).toBe(23);
      expect(preset.preset).toBe('medium');
      expect(preset.audioBitrate).toBe('192k');
    });

    it('should return high preset', () => {
      const preset = getQualityPreset('high');
      expect(preset.crf).toBe(18);
      expect(preset.preset).toBe('slow');
      expect(preset.audioBitrate).toBe('256k');
    });

    it('should have lower CRF for higher quality', () => {
      const draft = getQualityPreset('draft');
      const standard = getQualityPreset('standard');
      const high = getQualityPreset('high');

      expect(draft.crf).toBeGreaterThan(standard.crf);
      expect(standard.crf).toBeGreaterThan(high.crf);
    });

    it('should return standard preset for unknown quality', () => {
      const preset = getQualityPreset('unknown' as 'standard');
      expect(preset.crf).toBe(23);
      expect(preset.preset).toBe('medium');
      expect(preset.audioBitrate).toBe('192k');
    });
  });

  describe('Template Caption Styles', () => {
    it('should have trailer style with larger font', () => {
      expect(trailerTemplate.captionStyle.fontSize).toBe(56);
      expect(trailerTemplate.captionStyle.bold).toBe(true);
    });

    it('should have howto style with readable font', () => {
      expect(howtoTemplate.captionStyle.fontSize).toBe(42);
      expect(howtoTemplate.captionStyle.backgroundColor).toBe('black@0.7');
    });

    it('should have teaser style with largest font', () => {
      expect(teaserTemplate.captionStyle.fontSize).toBe(64);
    });
  });
});
