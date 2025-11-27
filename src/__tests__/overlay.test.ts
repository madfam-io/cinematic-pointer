import { generateOverlayScript, defaultConfig, OverlayConfig } from '../overlay/script';
import { generateOverlayCSS, defaultTheme, OverlayTheme } from '../overlay/styles';

describe('Overlay Script', () => {
  describe('defaultConfig', () => {
    it('should have all required properties', () => {
      expect(defaultConfig.trailCount).toBe(5);
      expect(defaultConfig.trailDecay).toBe(0.92);
      expect(defaultConfig.easing).toBe(0.15);
      expect(defaultConfig.clickRipple).toBe(true);
      expect(defaultConfig.focusRing).toBe(true);
      expect(defaultConfig.beatMarkers).toBe(true);
    });
  });

  describe('generateOverlayScript', () => {
    it('should generate valid JavaScript', () => {
      const script = generateOverlayScript();
      expect(script).toBeTruthy();
      expect(typeof script).toBe('string');
    });

    it('should include IIFE wrapper', () => {
      const script = generateOverlayScript();
      expect(script).toContain('(function()');
      expect(script).toContain("'use strict'");
      expect(script).toContain('})()');
    });

    it('should embed configuration', () => {
      const script = generateOverlayScript();
      expect(script).toContain('const CONFIG =');
      expect(script).toContain('"trailCount":5');
      expect(script).toContain('"trailDecay":0.92');
    });

    it('should include cursor element creation', () => {
      const script = generateOverlayScript();
      expect(script).toContain('cp-cursor');
      expect(script).toContain('createOverlayElements');
    });

    it('should include trail elements', () => {
      const script = generateOverlayScript();
      expect(script).toContain('cp-trail');
      expect(script).toContain('trailPositions');
    });

    it('should include focus ring support', () => {
      const script = generateOverlayScript();
      expect(script).toContain('cp-focus-ring');
      expect(script).toContain('updateFocusRing');
    });

    it('should include event handlers', () => {
      const script = generateOverlayScript();
      expect(script).toContain('handleMouseMove');
      expect(script).toContain('handleMouseDown');
      expect(script).toContain('handleMouseUp');
      expect(script).toContain('handleMouseOver');
      expect(script).toContain('handleMouseOut');
    });

    it('should include ripple effect', () => {
      const script = generateOverlayScript();
      expect(script).toContain('createRipple');
      expect(script).toContain('cp-ripple');
    });

    it('should include beat marker effect', () => {
      const script = generateOverlayScript();
      expect(script).toContain('createBeat');
      expect(script).toContain('cp-beat');
    });

    it('should expose window API', () => {
      const script = generateOverlayScript();
      expect(script).toContain('window.__cpOverlay');
      expect(script).toContain('createRipple:');
      expect(script).toContain('createBeat:');
      expect(script).toContain('updateFocusRing:');
      expect(script).toContain('setPosition:');
      expect(script).toContain('destroy:');
    });

    it('should use custom config when provided', () => {
      const customConfig: OverlayConfig = {
        trailCount: 10,
        trailDecay: 0.8,
        easing: 0.2,
        clickRipple: false,
        focusRing: false,
        beatMarkers: false,
      };

      const script = generateOverlayScript(customConfig);
      expect(script).toContain('"trailCount":10');
      expect(script).toContain('"trailDecay":0.8');
      expect(script).toContain('"easing":0.2');
      expect(script).toContain('"clickRipple":false');
      expect(script).toContain('"focusRing":false');
      expect(script).toContain('"beatMarkers":false');
    });

    it('should include DOMContentLoaded handling', () => {
      const script = generateOverlayScript();
      expect(script).toContain('DOMContentLoaded');
      expect(script).toContain('document.readyState');
    });

    it('should include console log message', () => {
      const script = generateOverlayScript();
      expect(script).toContain('[Cinematic Pointer] Overlay initialized');
    });

    it('should include animation frame logic', () => {
      const script = generateOverlayScript();
      expect(script).toContain('requestAnimationFrame');
      expect(script).toContain('cancelAnimationFrame');
      expect(script).toContain('animationFrameId');
    });
  });
});

describe('Overlay Styles', () => {
  describe('defaultTheme', () => {
    it('should have all required properties', () => {
      expect(defaultTheme.cursorColor).toBe('#00E0A4');
      expect(defaultTheme.cursorSize).toBe(20);
      expect(defaultTheme.trailColor).toBe('rgba(0, 224, 164, 0.3)');
      expect(defaultTheme.trailCount).toBe(5);
      expect(defaultTheme.rippleColor).toBe('rgba(0, 224, 164, 0.4)');
      expect(defaultTheme.rippleSize).toBe(60);
      expect(defaultTheme.focusRingColor).toBe('rgba(0, 224, 164, 0.6)');
      expect(defaultTheme.focusRingWidth).toBe(3);
    });
  });

  describe('generateOverlayCSS', () => {
    it('should generate valid CSS', () => {
      const css = generateOverlayCSS();
      expect(css).toBeTruthy();
      expect(typeof css).toBe('string');
    });

    it('should include cursor: none rule', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('.cp-overlay-active');
      expect(css).toContain('cursor: none !important');
    });

    it('should include cursor styles', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('.cp-cursor');
      expect(css).toContain('position: fixed');
      expect(css).toContain('border-radius: 50%');
      expect(css).toContain('pointer-events: none');
      expect(css).toContain('z-index: 999999');
    });

    it('should include cursor size from theme', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('width: 20px');
      expect(css).toContain('height: 20px');
    });

    it('should include cursor color from theme', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('#00E0A4');
    });

    it('should include cursor states', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('.cp-cursor.cp-clicking');
      expect(css).toContain('.cp-cursor.cp-hovering');
      expect(css).toContain('scale(0.8)');
    });

    it('should include trail styles', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('.cp-trail');
      expect(css).toContain('rgba(0, 224, 164, 0.3)');
    });

    it('should generate trail delay classes', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('.cp-trail-0');
      expect(css).toContain('.cp-trail-1');
      expect(css).toContain('.cp-trail-2');
      expect(css).toContain('.cp-trail-3');
      expect(css).toContain('.cp-trail-4');
      expect(css).toContain('transition-delay:');
    });

    it('should include ripple styles', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('.cp-ripple');
      expect(css).toContain('rgba(0, 224, 164, 0.4)');
      expect(css).toContain('animation: cp-ripple-expand');
    });

    it('should include ripple animation keyframes', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('@keyframes cp-ripple-expand');
      expect(css).toContain('scale(0)');
      expect(css).toContain('scale(2)');
    });

    it('should include focus ring styles', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('.cp-focus-ring');
      expect(css).toContain('rgba(0, 224, 164, 0.6)');
      expect(css).toContain('border-radius: 4px');
    });

    it('should include beat marker styles', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('.cp-beat');
      expect(css).toContain('animation: cp-beat-pulse');
    });

    it('should include beat animation keyframes', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('@keyframes cp-beat-pulse');
      expect(css).toContain('scale(1.5)');
    });

    it('should use custom theme when provided', () => {
      const customTheme: OverlayTheme = {
        cursorColor: '#FF0000',
        cursorSize: 30,
        trailColor: 'rgba(255, 0, 0, 0.5)',
        trailCount: 3,
        rippleColor: 'rgba(255, 0, 0, 0.6)',
        rippleSize: 80,
        focusRingColor: 'rgba(255, 0, 0, 0.7)',
        focusRingWidth: 5,
      };

      const css = generateOverlayCSS(customTheme);
      expect(css).toContain('#FF0000');
      expect(css).toContain('width: 30px');
      expect(css).toContain('rgba(255, 0, 0, 0.5)');
      expect(css).toContain('width: 80px');
      expect(css).toContain('5px solid rgba(255, 0, 0, 0.7)');
    });

    it('should generate correct number of trail classes for custom count', () => {
      const customTheme: OverlayTheme = {
        ...defaultTheme,
        trailCount: 3,
      };

      const css = generateOverlayCSS(customTheme);
      expect(css).toContain('.cp-trail-0');
      expect(css).toContain('.cp-trail-1');
      expect(css).toContain('.cp-trail-2');
      expect(css).not.toContain('.cp-trail-3');
    });

    it('should include highlight class', () => {
      const css = generateOverlayCSS();
      expect(css).toContain('.cp-highlight');
      expect(css).toContain('background:');
    });
  });
});
